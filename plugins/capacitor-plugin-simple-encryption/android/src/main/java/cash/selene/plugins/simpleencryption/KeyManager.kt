package cash.selene.plugins.simpleencryption

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Manages encryption key storage in Android Keystore with optional PIN protection.
 */
class KeyManager(private val context: Context) {
    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "cash.selene.encryption.dbkey"
        private const val BIO_KEY_ALIAS = "cash.selene.encryption.biokey"
        private const val PREFS_NAME = "SimpleEncryptionPrefs"
        private const val PREF_ENCRYPTED_KEY = "encryptedDbKey"
        private const val PREF_PIN_SALT = "pinSalt"
        private const val PREF_DEVICE_ONLY = "deviceOnly"
        private const val PREF_RAW_KEY = "rawDbKey" // For cloud-sync mode
        private const val PREF_BIO_ENCRYPTED_KEY = "bioEncryptedDbKey"
        private const val PREF_BIO_IV = "bioEncryptedDbKeyIv"
        private const val KEY_SIZE = 256
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_IV_LENGTH = 12
        private const val MIN_PIN_LENGTH = 4
        private const val PBKDF2_ITERATIONS = 100_000
        private const val BACKUP_PBKDF2_ITERATIONS = 600_000 // Higher for export security
        private const val LOCKOUT_PREFS_NAME = "SimpleEncryptionLockout"
        private const val PREF_PIN_LOCKOUT_ATTEMPTS = "pinLockoutAttempts"
        private const val PREF_BACKUP_LOCKOUT_ATTEMPTS = "backupLockoutAttempts"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val lockoutPrefs = context.getSharedPreferences(LOCKOUT_PREFS_NAME, Context.MODE_PRIVATE)
    private val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    private val secureRandom = SecureRandom()

    /**
     * The loaded encryption key (null until initialize() called).
     * Thread safety: relies on Capacitor's serial HandlerThread ("CapacitorPlugins") —
     * all plugin calls are dispatched serially so no explicit synchronization is needed.
     */
    private var dbKey: ByteArray? = null

    /** Check if encryption key is loaded and ready */
    val isReady: Boolean
        get() = dbKey != null

    /** Whether keys are stored in device-only mode (Keystore-wrapped, won't backup) */
    val isDeviceOnly: Boolean
        get() = prefs.getBoolean(PREF_DEVICE_ONLY, false) // Default: cloud-sync enabled

    /** Whether the platform supports cloud sync (Android supports via Auto Backup) */
    val canSyncToCloud: Boolean
        get() = true

    // ----Encrypt/Decrypt with Loaded Key

    /**
     * Encrypt data using the loaded dbKey (AES-GCM).
     * @param data Plaintext data to encrypt
     * @return Encrypted data (IV + ciphertext + tag)
     * @throws EncryptionException.KeyNotLoaded if key is not loaded
     */
    @Throws(EncryptionException::class)
    fun encrypt(data: ByteArray): ByteArray {
        val key = dbKey ?: throw EncryptionException.KeyNotLoaded
        return encryptWithKey(data, key)
    }

    /**
     * Decrypt data using the loaded dbKey (AES-GCM).
     * @param data Encrypted data (IV + ciphertext + tag)
     * @return Decrypted plaintext data
     * @throws EncryptionException.KeyNotLoaded if key is not loaded
     */
    @Throws(EncryptionException::class)
    fun decrypt(data: ByteArray): ByteArray {
        val key = dbKey ?: throw EncryptionException.KeyNotLoaded
        return decryptWithKey(data, key)
    }

    // ----Initialization

    /**
     * Initialize key management. Loads or generates key.
     * @param pin PIN to decrypt key (required if PIN or biometric is configured)
     * @return Whether the key is ready (false means PIN or biometric unlock is required)
     */
    @Throws(EncryptionException::class)
    fun initialize(pin: String?): Boolean {
        if (!hasPinConfigured() && !hasBiometricKey()) {
            loadOrGenerateKey()
            return true  // ready, no auth configured
        }
        if (pin == null) {
            return false  // auth required, key not loaded
        }
        loadKeyWithPin(pin)
        return true  // ready
    }

    // ----PIN Management

    /** Check if PIN protection is configured */
    fun hasPinConfigured(): Boolean {
        return prefs.contains(PREF_PIN_SALT)
    }

    /**
     * Set or change PIN protection.
     * Key must already be loaded via initialize(pin) or verifyPin().
     * @param newPin New PIN to set (minimum 4 characters)
     */
    @Throws(EncryptionException::class)
    fun setPin(newPin: String) {
        if (newPin.length < MIN_PIN_LENGTH) {
            throw EncryptionException.PinTooShort
        }

        val key = dbKey ?: throw EncryptionException.KeyNotLoaded

        // Generate new salt and derive key from PIN
        val salt = generateRandomBytes(16)
        val pinKey = deriveKeyPbkdf2(newPin, salt, PBKDF2_ITERATIONS)

        // Encrypt dbKey with PIN-derived key
        val encryptedKey = encryptWithKey(key, pinKey)

        // Zero intermediate key material
        pinKey.fill(0)

        // Store encrypted key and salt, remove plaintext key (single atomic write)
        prefs.edit()
            .putString(PREF_ENCRYPTED_KEY, Base64.encodeToString(encryptedKey, Base64.NO_WRAP))
            .putString(PREF_PIN_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
            .remove(PREF_RAW_KEY)
            .commit()
    }

    /**
     * Remove PIN protection.
     * Key must already be loaded via initialize(pin) or verifyPin().
     */
    @Throws(EncryptionException::class)
    fun removePin() {
        val key = dbKey ?: throw EncryptionException.KeyNotLoaded
        storeKeyWithoutPin(key)
    }

    // ----Key Storage Settings

    /**
     * Set device-only mode. Migrates key between storage modes.
     * @param deviceOnly If true, key uses Keystore wrapper (device-bound, no backup)
     */
    @Throws(EncryptionException::class)
    fun setDeviceOnly(deviceOnly: Boolean) {
        val key = dbKey ?: throw EncryptionException.KeyNotLoaded

        // If PIN is configured, just update the flag — key storage migrates on next PIN change
        if (hasPinConfigured()) {
            prefs.edit()
                .putBoolean(PREF_DEVICE_ONLY, deviceOnly)
                .commit()
            return
        }

        // Migrate key storage + update flag in a single atomic write
        if (deviceOnly) {
            val wrapperKey = getOrCreateWrapperKey()
            val encrypted = encryptWithSecretKey(key, wrapperKey)
            prefs.edit()
                .putString(PREF_ENCRYPTED_KEY, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .remove(PREF_RAW_KEY)
                .putBoolean(PREF_DEVICE_ONLY, true)
                .commit()
        } else {
            prefs.edit()
                .putString(PREF_RAW_KEY, Base64.encodeToString(key, Base64.NO_WRAP))
                .remove(PREF_ENCRYPTED_KEY)
                .putBoolean(PREF_DEVICE_ONLY, false)
                .commit()
        }
    }

    // ----Key Backup/Restore

    /**
     * Export encryption key as password-protected backup.
     * @param password Password to protect the backup
     * @return Encrypted backup data (salt + encrypted key)
     */
    @Throws(EncryptionException::class)
    fun exportKeyBackup(password: String): ByteArray {
        val key = dbKey ?: throw EncryptionException.KeyNotLoaded

        // Generate salt for PBKDF2
        val salt = generateRandomBytes(32)

        // Derive key from password with high iteration count
        val backupKey = deriveKeyPbkdf2(password, salt, BACKUP_PBKDF2_ITERATIONS)

        // Encrypt dbKey with backup key using AES-GCM
        val encrypted = encryptWithKey(key, backupKey)

        // Zero intermediate key material
        backupKey.fill(0)

        // Return: [32-byte salt][encrypted key]
        return salt + encrypted
    }

    /**
     * Import encryption key from password-protected backup.
     * Rate-limited to prevent brute-force password guessing.
     * @param data Encrypted backup data
     * @param password Password to decrypt the backup
     */
    @Throws(EncryptionException::class)
    fun importKeyBackup(data: ByteArray, password: String) {
        // Check backup import rate limit
        checkLockout(backupLockout)

        if (data.size <= 32) {
            throw EncryptionException.CryptoError("Invalid backup data")
        }

        // Extract salt and encrypted key
        val salt = data.sliceArray(0 until 32)
        val encryptedKey = data.sliceArray(32 until data.size)

        // Derive key from password
        val backupKey = deriveKeyPbkdf2(password, salt, BACKUP_PBKDF2_ITERATIONS)

        // Decrypt the key
        val decryptedKey: ByteArray
        try {
            decryptedKey = decryptWithKey(encryptedKey, backupKey)
        } catch (e: Exception) {
            backupKey.fill(0)
            recordFailedAttempt(backupLockout)
            throw EncryptionException.InvalidPassword
        }

        // Zero intermediate key material
        backupKey.fill(0)

        // Validate key size
        if (decryptedKey.size != KEY_SIZE / 8) {
            decryptedKey.fill(0)
            throw EncryptionException.CryptoError("Invalid key size in backup")
        }

        storeKeyWithoutPin(decryptedKey)
        decryptedKey.fill(0)

        // Reset backup attempt counter on success
        resetFailedAttempts(backupLockout)
    }

    /**
     * Export current key for re-encryption purposes.
     * @return Raw key bytes
     */
    @Throws(EncryptionException::class)
    fun exportCurrentKey(): ByteArray {
        return dbKey?.copyOf() ?: throw EncryptionException.KeyNotLoaded
    }

    /**
     * Load a raw key into memory without persisting.
     * Used for biometric unlock where the key is stored in biometric-protected storage.
     */
    @Throws(EncryptionException::class)
    fun loadKeyIntoMemory(key: ByteArray) {
        if (key.size != KEY_SIZE / 8) {
            throw EncryptionException.CryptoError("Invalid key size")
        }
        zeroDbKey()
        dbKey = key.copyOf()
    }

    /**
     * Replace stored key after re-encryption.
     * @param key New key to store
     */
    @Throws(EncryptionException::class)
    fun replaceKey(key: ByteArray) {
        if (key.size != KEY_SIZE / 8) {
            throw EncryptionException.CryptoError("Invalid key size")
        }

        storeKeyWithoutPin(key)
    }

    // ----Biometric Key Storage

    /**
     * Get or create biometric-bound Keystore key for encrypting the db key.
     * This key requires biometric authentication to use.
     */
    private fun getOrCreateBioWrapperKey(): SecretKey {
        val existingKey = keyStore.getKey(BIO_KEY_ALIAS, null) as? SecretKey
        if (existingKey != null) {
            return existingKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )
        val spec = KeyGenParameterSpec.Builder(
            BIO_KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_SIZE)
            .setUserAuthenticationRequired(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    setInvalidatedByBiometricEnrollment(true)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setUserAuthenticationParameters(
                        0, KeyProperties.AUTH_BIOMETRIC_STRONG
                    )
                }
            }
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    /**
     * Get a Cipher initialized for encryption with the biometric wrapper key.
     * The caller must use this with BiometricPrompt.CryptoObject.
     * @return Initialized Cipher for encryption
     */
    @Throws(EncryptionException::class)
    fun getBiometricEncryptCipher(): Cipher {
        val wrapperKey = getOrCreateBioWrapperKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, wrapperKey)
        return cipher
    }

    /**
     * Store raw key using an already-authenticated encrypt cipher.
     * @param key Raw encryption key bytes
     * @param cipher Cipher that was authenticated via BiometricPrompt
     */
    @Throws(EncryptionException::class)
    fun storeBiometricKey(key: ByteArray, cipher: Cipher) {
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(key)

        prefs.edit()
            .putString(PREF_BIO_ENCRYPTED_KEY, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            .putString(PREF_BIO_IV, Base64.encodeToString(iv, Base64.NO_WRAP))
            .commit()
    }

    /**
     * Get a Cipher initialized for decryption with the biometric key.
     * The caller must use this with BiometricPrompt.CryptoObject.
     * @return Initialized Cipher for decryption
     */
    @Throws(EncryptionException::class)
    fun getBiometricDecryptCipher(): Cipher {
        val wrapperKey = keyStore.getKey(BIO_KEY_ALIAS, null) as? SecretKey
            ?: throw EncryptionException.KeyNotFound

        val ivStr = prefs.getString(PREF_BIO_IV, null)
            ?: throw EncryptionException.KeyNotFound

        val iv = Base64.decode(ivStr, Base64.NO_WRAP)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, wrapperKey, spec)
        return cipher
    }

    /**
     * Decrypt biometric key using an already-authenticated cipher.
     * @param cipher Cipher that was authenticated via BiometricPrompt
     * @return Decrypted raw key bytes
     */
    @Throws(EncryptionException::class)
    fun decryptBiometricKey(cipher: Cipher): ByteArray {
        val encryptedStr = prefs.getString(PREF_BIO_ENCRYPTED_KEY, null)
            ?: throw EncryptionException.KeyNotFound

        val encrypted = Base64.decode(encryptedStr, Base64.NO_WRAP)
        return cipher.doFinal(encrypted)
    }

    /** Check if biometric key exists */
    fun hasBiometricKey(): Boolean {
        return prefs.contains(PREF_BIO_ENCRYPTED_KEY) &&
            prefs.contains(PREF_BIO_IV) &&
            keyStore.containsAlias(BIO_KEY_ALIAS)
    }

    /** Delete biometric key */
    fun deleteBiometricKey() {
        prefs.edit()
            .remove(PREF_BIO_ENCRYPTED_KEY)
            .remove(PREF_BIO_IV)
            .commit()
        try {
            keyStore.deleteEntry(BIO_KEY_ALIAS)
        } catch (_: Exception) {
            // Ignore - entry may not exist
        }
    }

    // ----Key Clearing

    /** Clear the in-memory encryption key without affecting persistent storage. */
    fun clearKey() {
        zeroDbKey()
    }

    // ----Nuclear Reset

    /** Delete ALL keys, salts, prefs, and biometric keys. Complete fresh start. */
    fun resetAll() {
        // Delete Keystore entries
        try { keyStore.deleteEntry(KEY_ALIAS) } catch (_: Exception) {}
        try { keyStore.deleteEntry(BIO_KEY_ALIAS) } catch (_: Exception) {}

        // Clear all SharedPreferences
        prefs.edit().clear().commit()
        lockoutPrefs.edit().clear().commit()

        // Reset in-memory lockout state
        resetFailedAttempts(pinLockout)
        resetFailedAttempts(backupLockout)

        // Zero and clear in-memory key
        zeroDbKey()
    }

    // ----Private Helpers

    /** Load existing key or generate new one (no PIN) */
    @Throws(EncryptionException::class)
    private fun loadOrGenerateKey() {
        if (isDeviceOnly) {
            // Device-only mode: use Keystore wrapper
            loadOrGenerateKeyWithKeystore()
        } else {
            // Cloud-sync mode: direct storage
            loadOrGenerateKeyDirect()
        }
    }

    /** Load or generate key using Keystore wrapper (device-only mode) */
    @Throws(EncryptionException::class)
    private fun loadOrGenerateKeyWithKeystore() {
        // Try to load from Keystore first
        val existingKey = loadKeyFromKeystore()
        if (existingKey != null) {
            zeroDbKey()
            dbKey = existingKey
            return
        }

        // Only generate new key if there's no existing encrypted key.
        // If PREF_ENCRYPTED_KEY exists but Keystore decryption failed,
        // the Keystore may have been reset — don't silently overwrite.
        if (prefs.contains(PREF_ENCRYPTED_KEY)) {
            throw EncryptionException.CryptoError(
                "Cannot decrypt existing key - Keystore may have been reset"
            )
        }

        // Generate new key
        val newKey = generateRandomBytes(KEY_SIZE / 8)
        storeKeyInKeystore(newKey)
        zeroDbKey()
        dbKey = newKey
    }

    /** Load or generate key with direct storage (cloud-sync mode) */
    @Throws(EncryptionException::class)
    private fun loadOrGenerateKeyDirect() {
        // Try to load from direct storage first
        val existingKeyStr = prefs.getString(PREF_RAW_KEY, null)
        if (existingKeyStr != null) {
            zeroDbKey()
            dbKey = Base64.decode(existingKeyStr, Base64.NO_WRAP)
            return
        }

        // Try to migrate from Keystore if exists (for existing users)
        val keystoreKey = loadKeyFromKeystore()
        if (keystoreKey != null) {
            // Migrate to direct storage
            prefs.edit()
                .putString(PREF_RAW_KEY, Base64.encodeToString(keystoreKey, Base64.NO_WRAP))
                .commit()
            zeroDbKey()
            dbKey = keystoreKey
            return
        }

        // Only generate new key if there's no existing encrypted key.
        // If PREF_ENCRYPTED_KEY exists but we couldn't load it, don't overwrite.
        if (prefs.contains(PREF_ENCRYPTED_KEY)) {
            throw EncryptionException.CryptoError(
                "Cannot decrypt existing key - Keystore may have been reset"
            )
        }

        // Generate new key and store directly
        val newKey = generateRandomBytes(KEY_SIZE / 8)
        prefs.edit()
            .putString(PREF_RAW_KEY, Base64.encodeToString(newKey, Base64.NO_WRAP))
            .commit()
        zeroDbKey()
        dbKey = newKey
    }

    /**
     * Decrypt the PIN-protected key. Handles lockout check, key derivation,
     * decryption, and lockout accounting.
     * @param pin The PIN to decrypt with
     * @return Decrypted raw key bytes (caller must zero when done)
     * @throws EncryptionException.InvalidPin if PIN is wrong
     * @throws EncryptionException.LockedOut if too many failed attempts
     */
    @Throws(EncryptionException::class)
    private fun decryptPinKey(pin: String): ByteArray {
        checkLockout()

        val (salt, encryptedKey) = extractPinComponents()
        val pinKey = deriveKeyPbkdf2(pin, salt, PBKDF2_ITERATIONS)

        return try {
            val decrypted = decryptWithKey(encryptedKey, pinKey)
            resetFailedAttempts()
            decrypted
        } catch (e: AEADBadTagException) {
            // GCM authentication failure = wrong key = wrong PIN
            recordFailedAttempt()
            throw EncryptionException.InvalidPin
        } catch (e: Exception) {
            // Other errors (corrupt data, etc.) are not PIN errors
            throw EncryptionException.CryptoError("Decryption failed: ${e.message}")
        } finally {
            pinKey.fill(0)
        }
    }

    /**
     * Verify a PIN without loading the key into memory.
     * Uses brute-force lockout but has no side effects on dbKey.
     * @param pin The PIN to verify
     * @return true if PIN is valid
     */
    @Throws(EncryptionException::class)
    fun verifyPin(pin: String): Boolean {
        return try {
            val decrypted = decryptPinKey(pin)
            decrypted.fill(0)
            true
        } catch (e: EncryptionException.InvalidPin) {
            false
        }
    }

    /** Load key encrypted with PIN */
    @Throws(EncryptionException::class)
    private fun loadKeyWithPin(pin: String) {
        val decrypted = decryptPinKey(pin)
        zeroDbKey()
        dbKey = decrypted
    }

    /** Extract salt and encrypted key from storage */
    private fun extractPinComponents(): Pair<ByteArray, ByteArray> {
        val saltStr = prefs.getString(PREF_PIN_SALT, null)
            ?: throw EncryptionException.PinNotConfigured
        val encryptedKeyStr = prefs.getString(PREF_ENCRYPTED_KEY, null)
            ?: throw EncryptionException.KeyNotFound

        val salt = Base64.decode(saltStr, Base64.NO_WRAP)
        val encryptedKey = Base64.decode(encryptedKeyStr, Base64.NO_WRAP)
        return Pair(salt, encryptedKey)
    }

    /** Derive encryption key from password/PIN using PBKDF2-SHA256 */
    private fun deriveKeyPbkdf2(password: String, salt: ByteArray, iterations: Int): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, iterations, KEY_SIZE)
        try {
            val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            return factory.generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }

    /** Generate cryptographically secure random bytes */
    private fun generateRandomBytes(count: Int): ByteArray {
        val bytes = ByteArray(count)
        secureRandom.nextBytes(bytes)
        return bytes
    }

    // ----Keystore Operations

    /** Get or create the Keystore wrapper key (used to encrypt dbKey when no PIN) */
    private fun getOrCreateWrapperKey(): SecretKey {
        val existingKey = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
        if (existingKey != null) {
            return existingKey
        }

        // Generate new wrapper key in Keystore
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_SIZE)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    /** Store key in Keystore (encrypted with wrapper key) */
    private fun storeKeyInKeystore(key: ByteArray) {
        val wrapperKey = getOrCreateWrapperKey()
        val encrypted = encryptWithSecretKey(key, wrapperKey)
        prefs.edit()
            .putString(PREF_ENCRYPTED_KEY, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .commit()
    }

    /** Load key from Keystore */
    private fun loadKeyFromKeystore(): ByteArray? {
        // If PIN is configured, key isn't in Keystore
        if (hasPinConfigured()) {
            return null
        }

        val encryptedKeyStr = prefs.getString(PREF_ENCRYPTED_KEY, null) ?: return null
        val wrapperKey = keyStore.getKey(KEY_ALIAS, null) as? SecretKey ?: return null
        val encryptedKey = Base64.decode(encryptedKeyStr, Base64.NO_WRAP)

        return try {
            decryptWithSecretKey(encryptedKey, wrapperKey)
        } catch (e: Exception) {
            null
        }
    }

    // ----Brute-Force Protection (persisted count + monotonic clock)
    // Attempt count is persisted so lockout survives app restart.
    // Timing uses monotonic clock (SystemClock.elapsedRealtime) to prevent clock manipulation.
    // On cold start, if persisted attempts exceed the threshold, lockout is re-applied.

    private data class LockoutState(
        var attempts: Int = 0,
        var lockoutUntil: Long = 0,
        val prefsKey: String
    )

    private val pinLockout = LockoutState(
        attempts = lockoutPrefs.getInt(PREF_PIN_LOCKOUT_ATTEMPTS, 0),
        prefsKey = PREF_PIN_LOCKOUT_ATTEMPTS
    )
    private val backupLockout = LockoutState(
        attempts = lockoutPrefs.getInt(PREF_BACKUP_LOCKOUT_ATTEMPTS, 0),
        prefsKey = PREF_BACKUP_LOCKOUT_ATTEMPTS
    )

    /** Check if entry is currently locked out */
    @Throws(EncryptionException::class)
    private fun checkLockout(state: LockoutState = pinLockout) {
        if (state.lockoutUntil > 0) {
            val now = SystemClock.elapsedRealtime()
            if (now < state.lockoutUntil) {
                val remaining = ((state.lockoutUntil - now) / 1000).toInt() + 1
                throw EncryptionException.LockedOut(remaining)
            }
            state.lockoutUntil = 0 // Lockout expired, allow one attempt
        } else {
            // No active timer — check if persisted attempts warrant lockout (cold start)
            val delay = lockoutDelay(state.attempts)
            if (delay > 0) {
                state.lockoutUntil = SystemClock.elapsedRealtime() + delay * 1000L
                throw EncryptionException.LockedOut(delay)
            }
        }
    }

    /** Record a failed attempt, persist count, and apply lockout if threshold exceeded */
    private fun recordFailedAttempt(state: LockoutState = pinLockout) {
        state.attempts += 1
        lockoutPrefs.edit().putInt(state.prefsKey, state.attempts).commit()
        val delay = lockoutDelay(state.attempts)
        if (delay > 0) {
            state.lockoutUntil = SystemClock.elapsedRealtime() + delay * 1000L
        }
    }

    /** Reset failed attempt counter (in-memory + persisted) after successful entry */
    private fun resetFailedAttempts(state: LockoutState = pinLockout) {
        state.attempts = 0
        state.lockoutUntil = 0
        lockoutPrefs.edit().putInt(state.prefsKey, 0).commit()
    }

    /** Get lockout delay in seconds for a given attempt number */
    private fun lockoutDelay(attempt: Int): Int = when {
        attempt <= 3 -> 0
        attempt == 4 -> 30
        attempt == 5 -> 60
        attempt == 6 -> 300
        attempt == 7 -> 900
        else -> 3600
    }

    // ----Key Persistence Helpers

    /**
     * Persist a raw key without PIN protection and update in-memory key.
     * Chooses between Keystore-wrapped (device-only) or plaintext prefs (cloud-sync).
     * Clears any existing PIN salt in a single atomic write.
     */
    private fun storeKeyWithoutPin(key: ByteArray) {
        if (isDeviceOnly) {
            val wrapperKey = getOrCreateWrapperKey()
            val encrypted = encryptWithSecretKey(key, wrapperKey)
            prefs.edit()
                .putString(PREF_ENCRYPTED_KEY, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .remove(PREF_PIN_SALT)
                .remove(PREF_RAW_KEY)
                .commit()
        } else {
            prefs.edit()
                .putString(PREF_RAW_KEY, Base64.encodeToString(key, Base64.NO_WRAP))
                .remove(PREF_ENCRYPTED_KEY)
                .remove(PREF_PIN_SALT)
                .commit()
        }

        zeroDbKey()
        dbKey = key.copyOf()
    }

    // ----Memory Zeroing

    /** Zero the in-memory dbKey before releasing it */
    private fun zeroDbKey() {
        dbKey?.fill(0)
        dbKey = null
    }

    // ----AES-GCM Encryption (for wrapping dbKey)

    /** Encrypt with byte array key (for PIN-derived key or direct AES-GCM) */
    internal fun encryptWithKey(data: ByteArray, key: ByteArray): ByteArray {
        if (key.size != KEY_SIZE / 8) {
            throw EncryptionException.CryptoError("Invalid key size: ${key.size}")
        }
        val secretKey = SecretKeySpec(key, "AES")
        return encryptWithSecretKey(data, secretKey)
    }

    /** Decrypt with byte array key (for PIN-derived key or direct AES-GCM) */
    internal fun decryptWithKey(data: ByteArray, key: ByteArray): ByteArray {
        if (key.size != KEY_SIZE / 8) {
            throw EncryptionException.CryptoError("Invalid key size: ${key.size}")
        }
        val secretKey = SecretKeySpec(key, "AES")
        return decryptWithSecretKey(data, secretKey)
    }

    /** Encrypt with SecretKey (for Keystore key) */
    private fun encryptWithSecretKey(data: ByteArray, key: SecretKey): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(data)
        // Format: [IV][ciphertext]
        return iv + ciphertext
    }

    /** Decrypt with SecretKey (for Keystore key) */
    private fun decryptWithSecretKey(data: ByteArray, key: SecretKey): ByteArray {
        if (data.size < GCM_IV_LENGTH) {
            throw EncryptionException.CryptoError("Data too short")
        }
        val iv = data.sliceArray(0 until GCM_IV_LENGTH)
        val ciphertext = data.sliceArray(GCM_IV_LENGTH until data.size)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        return cipher.doFinal(ciphertext)
    }
}

/** Encryption-related exceptions */
sealed class EncryptionException(message: String) : Exception(message) {
    object KeyNotFound : EncryptionException("Encryption key not found")
    object KeyNotLoaded : EncryptionException("Encryption key not loaded. Call initialize() first")
    object PinRequired : EncryptionException("PIN is required to decrypt the encryption key")
    object PinNotConfigured : EncryptionException("PIN is not configured")
    object PinTooShort : EncryptionException("PIN must be at least 4 characters")
    object InvalidPin : EncryptionException("Invalid PIN")
    object InvalidPassword : EncryptionException("Invalid backup password")
    class LockedOut(val remainingSeconds: Int) : EncryptionException(
        "Too many failed attempts. Please wait $remainingSeconds seconds before trying again."
    )
    class CryptoError(msg: String) : EncryptionException("Crypto error: $msg")
}
