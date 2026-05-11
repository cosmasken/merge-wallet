import Foundation
import CommonCrypto
import CryptoKit
import Security
import LocalAuthentication

/// Manages encryption key storage in iOS Keychain with optional PIN protection.
class KeyManager {
    private static let keyTag = "cash.selene.encryption.dbkey"
    private static let pinSaltTag = "cash.selene.encryption.pinsalt" // Legacy only (migration)
    private static let bioKeyTag = "cash.selene.encryption.biokey"
    private static let deviceOnlyPrefsKey = "cash.selene.encryption.deviceOnly"
    private static let keySize = 32 // 256 bits
    private static let pinSaltSize = 16
    private static let minPinLength = 4
    private static let pbkdf2Iterations: UInt32 = 100_000
    private static let backupPbkdf2Iterations: UInt32 = 600_000 // Higher for export security

    /// The loaded encryption key (nil until initialize() called).
    /// Thread safety: relies on Capacitor's serial bridge DispatchQueue — all plugin
    /// calls are dispatched serially so no explicit synchronization is needed.
    private var dbKey: Data?

    /// Whether keys are stored in device-only mode (won't sync via iCloud Keychain)
    var isDeviceOnly: Bool {
        return UserDefaults.standard.bool(forKey: Self.deviceOnlyPrefsKey)
    }

    /// Whether the platform supports cloud sync (iOS always supports iCloud Keychain)
    var canSyncToCloud: Bool {
        return true
    }

    // MARK: - Initialization

    /// Initialize key management. Loads or generates key from Keychain.
    /// - Parameter pin: PIN to decrypt key (required if PIN was configured)
    /// - Returns: Whether the key is ready (false means auth is required)
    @discardableResult
    func initialize(pin: String?) throws -> Bool {
        if !hasPinConfigured() && !hasBiometricKey() {
            try loadOrGenerateKey()
            return true  // ready, no auth configured
        }
        guard let pin = pin else {
            return false  // auth required, key not loaded
        }
        try loadKeyWithPin(pin)
        return true  // ready
    }

    /// Check if encryption key is loaded and ready.
    var isReady: Bool {
        return dbKey != nil
    }

    // MARK: - Encrypt/Decrypt with Loaded Key

    /// Encrypt data using the loaded dbKey (AES-256-GCM).
    /// - Parameter data: Plaintext data to encrypt
    /// - Returns: Encrypted data (nonce + ciphertext + tag)
    /// - Throws: EncryptionError.keyNotLoaded if key is not loaded
    func encrypt(data: Data) throws -> Data {
        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }
        return try encryptAESGCM(data: data, key: key)
    }

    /// Decrypt data using the loaded dbKey (AES-256-GCM).
    /// - Parameter data: Encrypted data (nonce + ciphertext + tag)
    /// - Returns: Decrypted plaintext data
    /// - Throws: EncryptionError.keyNotLoaded if key is not loaded
    func decrypt(data: Data) throws -> Data {
        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }
        return try decryptAESGCM(data: data, key: key)
    }

    // MARK: - PIN Management

    /// Check if PIN protection is configured.
    /// New format: combined blob [salt][encryptedKey] is larger than keySize.
    /// Legacy format: separate pinSaltTag entry exists.
    func hasPinConfigured() -> Bool {
        // Legacy check (pre-migration)
        if loadFromKeychain(tag: Self.pinSaltTag) != nil {
            return true
        }
        // New combined format: blob > keySize means [salt][encryptedKey]
        if let blob = loadFromKeychain(tag: Self.keyTag) {
            return blob.count > Self.keySize
        }
        return false
    }

    /// Set or change PIN protection.
    /// Key must already be loaded via initialize(pin:) or verifyPin().
    /// - Parameter newPin: New PIN to set (minimum 4 characters)
    func setPin(newPin: String) throws {
        guard newPin.count >= Self.minPinLength else {
            throw EncryptionError.pinTooShort
        }

        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }

        // Generate new salt and derive key from PIN
        let salt = try generateRandomBytes(count: Self.pinSaltSize)
        var pinKey = try deriveKeyPbkdf2(from: newPin, salt: salt, iterations: Self.pbkdf2Iterations)
        defer { zeroData(&pinKey) }

        // Encrypt dbKey with PIN-derived key (AES-GCM via CryptoKit)
        let encryptedKey = try encryptAESGCM(data: key, key: pinKey)

        // Single atomic Keychain write: [salt][encryptedKey]
        let combined = salt + encryptedKey
        try saveToKeychain(data: combined, tag: Self.keyTag)

        // Clean up legacy separate salt entry if present
        deleteFromKeychain(tag: Self.pinSaltTag)
    }

    /// Remove PIN protection.
    /// Key must already be loaded via initialize(pin:) or verifyPin().
    func removePin() throws {
        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }

        try storeKeyWithoutPin(key)
    }

    // MARK: - Key Storage Settings

    /// Set device-only mode. Re-saves key with new accessibility attribute.
    /// - Parameter deviceOnly: If true, key won't sync via iCloud Keychain
    func setDeviceOnly(_ deviceOnly: Bool) throws {
        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }

        // Update preference first (saveToKeychain reads isDeviceOnly for accessibility)
        let previousDeviceOnly = isDeviceOnly
        UserDefaults.standard.set(deviceOnly, forKey: Self.deviceOnlyPrefsKey)

        do {
            // Re-save key with new accessibility
            if hasPinConfigured() {
                guard let encryptedKey = loadFromKeychain(tag: Self.keyTag) else {
                    throw EncryptionError.keyNotFound
                }
                try saveToKeychain(data: encryptedKey, tag: Self.keyTag)
            } else {
                try saveToKeychain(data: key, tag: Self.keyTag)
            }

            // Also re-save PIN salt if it exists
            if let salt = loadFromKeychain(tag: Self.pinSaltTag) {
                try saveToKeychain(data: salt, tag: Self.pinSaltTag)
            }
        } catch {
            // Roll back UserDefaults on Keychain failure
            UserDefaults.standard.set(previousDeviceOnly, forKey: Self.deviceOnlyPrefsKey)
            throw error
        }
    }

    // MARK: - Key Backup/Restore

    /// Export encryption key as password-protected backup.
    /// - Parameter password: Password to protect the backup
    /// - Returns: Encrypted backup data (salt + encrypted key)
    func exportKeyBackup(password: String) throws -> Data {
        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }

        // Generate salt for PBKDF2
        let salt = try generateRandomBytes(count: 32)

        // Derive key from password with high iteration count
        var backupKey = try deriveKeyPbkdf2(from: password, salt: salt, iterations: Self.backupPbkdf2Iterations)
        defer { zeroData(&backupKey) }

        // Encrypt dbKey with backup key using AES-GCM
        let encrypted = try encryptAESGCM(data: key, key: backupKey)

        // Return: [32-byte salt][encrypted key]
        return salt + encrypted
    }

    /// Import encryption key from password-protected backup.
    /// Rate-limited to prevent brute-force password guessing.
    /// - Parameters:
    ///   - data: Encrypted backup data
    ///   - password: Password to decrypt the backup
    func importKeyBackup(data: Data, password: String) throws {
        // Check backup import rate limit
        try checkLockout(&backupLockoutState)

        guard data.count > 32 else {
            throw EncryptionError.cryptoError("Invalid backup data")
        }

        // Extract salt and encrypted key
        let salt = data.prefix(32)
        let encryptedKey = data.dropFirst(32)

        // Derive key from password
        var backupKey = try deriveKeyPbkdf2(from: password, salt: Data(salt), iterations: Self.backupPbkdf2Iterations)
        defer { zeroData(&backupKey) }

        // Decrypt the key
        var decryptedKey: Data
        do {
            decryptedKey = try decryptAESGCM(data: Data(encryptedKey), key: backupKey)
        } catch {
            recordFailedAttempt(&backupLockoutState)
            throw EncryptionError.invalidPassword
        }

        // Validate key size
        guard decryptedKey.count == Self.keySize else {
            zeroData(&decryptedKey)
            throw EncryptionError.cryptoError("Invalid key size in backup")
        }

        try storeKeyWithoutPin(decryptedKey)

        // Reset backup attempt counter on success
        resetFailedAttempts(&backupLockoutState)
    }

    /// Export current key for re-encryption purposes.
    /// - Returns: Raw key bytes
    func exportCurrentKey() throws -> Data {
        guard let key = dbKey else {
            throw EncryptionError.keyNotLoaded
        }
        return Data(key)
    }

    /// Replace stored key after re-encryption.
    /// - Parameter key: New key to store
    func replaceKey(_ key: Data) throws {
        guard key.count == Self.keySize else {
            throw EncryptionError.cryptoError("Invalid key size")
        }

        try storeKeyWithoutPin(key)
    }

    /// Load a raw key into memory without persisting to Keychain.
    /// Used for biometric unlock where the key is stored in biometric-protected storage.
    func loadKeyIntoMemory(_ key: Data) throws {
        guard key.count == Self.keySize else {
            throw EncryptionError.cryptoError("Invalid key size")
        }
        zeroDbKey()
        dbKey = key
    }

    // MARK: - Biometric Key Storage

    /// Store raw encryption key in biometric-protected Keychain item.
    func storeBiometricKey(_ key: Data) throws {
        // Delete existing biometric key
        deleteBiometricKey()

        guard let accessControl = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryCurrentSet,
            nil
        ) else {
            throw EncryptionError.cryptoError("Failed to create access control for biometric key")
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.bioKeyTag,
            kSecAttrAccessControl as String: accessControl,
            kSecValueData as String: key
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw EncryptionError.keychainError("Failed to store biometric key: \(status)")
        }
    }

    /// Load encryption key from biometric-protected Keychain. Triggers Face ID/Touch ID.
    func loadBiometricKey(reason: String? = nil) throws -> Data {
        let context = LAContext()
        context.localizedReason = reason ?? "Authorize"
        context.localizedFallbackTitle = "" // Hide non-functional device passcode button

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.bioKeyTag,
            kSecReturnData as String: true,
            kSecUseAuthenticationContext as String: context
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let keyData = result as? Data else {
            if status == errSecItemNotFound {
                throw EncryptionError.keyNotFound
            }
            throw EncryptionError.cryptoError("Biometric authentication failed: \(status)")
        }

        return keyData
    }

    /// Check if biometric key exists in Keychain.
    func hasBiometricKey() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.bioKeyTag,
            kSecUseAuthenticationUI as String: kSecUseAuthenticationUIFail
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess || status == errSecInteractionNotAllowed
    }

    /// Delete biometric key from Keychain.
    @discardableResult
    func deleteBiometricKey() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.bioKeyTag
        ]
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - Key Clearing

    /// Clear the in-memory encryption key without affecting persistent storage.
    /// After this, encrypt/decrypt will fail until the key is reloaded.
    func clearKey() {
        zeroDbKey()
    }

    // MARK: - Nuclear Reset

    /// Delete ALL keys, salts, prefs, and biometric keys. Complete fresh start.
    func resetAll() {
        deleteFromKeychain(tag: Self.keyTag)
        deleteFromKeychain(tag: Self.pinSaltTag) // Legacy
        deleteBiometricKey()
        UserDefaults.standard.removeObject(forKey: Self.deviceOnlyPrefsKey)

        // Reset in-memory lockout state and delete Keychain entries
        resetFailedAttempts(&pinLockoutState)
        resetFailedAttempts(&backupLockoutState)
        Self.deleteLockoutCount(tag: Self.pinAttemptsKey)
        Self.deleteLockoutCount(tag: Self.backupAttemptsKey)

        zeroDbKey()
    }

    // MARK: - Private Helpers

    /// Load existing key or generate new one (no PIN).
    private func loadOrGenerateKey() throws {
        if let existingKey = loadFromKeychain(tag: Self.keyTag) {
            zeroDbKey()
            dbKey = existingKey
        } else {
            let newKey = try generateRandomBytes(count: Self.keySize)
            try saveToKeychain(data: newKey, tag: Self.keyTag)
            zeroDbKey()
            dbKey = newKey
        }
    }

    /// Decrypt the PIN-protected key. Handles lockout check, key derivation,
    /// decryption, and lockout accounting.
    /// - Parameter pin: The PIN to decrypt with
    /// - Returns: Tuple of (decrypted key, isLegacyFormat). Caller must zero key when done.
    /// - Throws: EncryptionError.invalidPin if PIN is wrong, EncryptionError.lockedOut if locked
    private func decryptPinKey(_ pin: String) throws -> (key: Data, isLegacy: Bool) {
        try checkLockout()

        let (salt, encryptedKey, isLegacy) = try extractPinComponents()

        var pinKey = try deriveKeyPbkdf2(from: pin, salt: salt, iterations: Self.pbkdf2Iterations)
        defer { zeroData(&pinKey) }

        do {
            let decrypted = try decryptAESGCM(data: encryptedKey, key: pinKey)
            resetFailedAttempts()
            return (decrypted, isLegacy)
        } catch CryptoKitError.authenticationFailure {
            // GCM tag mismatch = wrong key = wrong PIN
            recordFailedAttempt()
            throw EncryptionError.invalidPin
        } catch {
            // Other errors (corrupt data, invalid nonce, etc.) are not PIN errors
            throw EncryptionError.cryptoError("Decryption failed: \(error.localizedDescription)")
        }
    }

    /// Verify a PIN without loading the key into memory.
    /// Uses brute-force lockout but has no side effects on dbKey.
    /// - Parameter pin: The PIN to verify
    /// - Returns: true if PIN is valid
    func verifyPin(_ pin: String) throws -> Bool {
        do {
            var (decrypted, _) = try decryptPinKey(pin)
            zeroData(&decrypted)
            return true
        } catch EncryptionError.invalidPin {
            return false
        }
    }

    /// Load key encrypted with PIN.
    /// Supports both legacy (separate salt) and new (combined blob) formats.
    private func loadKeyWithPin(_ pin: String) throws {
        let (decrypted, isLegacy) = try decryptPinKey(pin)
        zeroDbKey()
        dbKey = decrypted

        // Migrate legacy format to combined format (single Keychain entry)
        if isLegacy {
            guard let blob = loadFromKeychain(tag: Self.keyTag),
                  let salt = loadFromKeychain(tag: Self.pinSaltTag) else {
                return
            }
            let combined = salt + blob
            try saveToKeychain(data: combined, tag: Self.keyTag)
            deleteFromKeychain(tag: Self.pinSaltTag)
        }
    }

    /// Extract salt and encrypted key from Keychain, handling both legacy and new formats.
    private func extractPinComponents() throws -> (salt: Data, encryptedKey: Data, isLegacy: Bool) {
        guard let blob = loadFromKeychain(tag: Self.keyTag) else {
            throw EncryptionError.keyNotFound
        }

        if let legacySalt = loadFromKeychain(tag: Self.pinSaltTag) {
            // Legacy format: separate salt and encrypted key
            return (legacySalt, blob, true)
        } else if blob.count > Self.keySize {
            // New combined format: [salt][encryptedKey]
            let salt = blob.prefix(Self.pinSaltSize)
            let encryptedKey = Data(blob.dropFirst(Self.pinSaltSize))
            return (salt, encryptedKey, false)
        } else {
            throw EncryptionError.pinNotConfigured
        }
    }

    /// Derive encryption key from password/PIN using PBKDF2-SHA256.
    private func deriveKeyPbkdf2(from password: String, salt: Data, iterations: UInt32) throws -> Data {
        guard let passwordData = password.data(using: .utf8) else {
            throw EncryptionError.cryptoError("Failed to encode password")
        }

        var derivedKey = Data(count: Self.keySize)
        let result = derivedKey.withUnsafeMutableBytes { derivedKeyBytes in
            salt.withUnsafeBytes { saltBytes in
                passwordData.withUnsafeBytes { passwordBytes in
                    CCKeyDerivationPBKDF(
                        CCPBKDFAlgorithm(kCCPBKDF2),
                        passwordBytes.baseAddress?.assumingMemoryBound(to: Int8.self),
                        passwordData.count,
                        saltBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        salt.count,
                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                        iterations,
                        derivedKeyBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        Self.keySize
                    )
                }
            }
        }

        guard result == kCCSuccess else {
            throw EncryptionError.cryptoError("PBKDF2 failed with status \(result)")
        }

        return derivedKey
    }

    /// Generate cryptographically secure random bytes.
    private func generateRandomBytes(count: Int) throws -> Data {
        var bytes = Data(count: count)
        let result = bytes.withUnsafeMutableBytes { ptr in
            SecRandomCopyBytes(kSecRandomDefault, count, ptr.baseAddress!)
        }
        guard result == errSecSuccess else {
            throw EncryptionError.cryptoError("Failed to generate random bytes")
        }
        return bytes
    }

    // MARK: - AES-GCM Encryption (CryptoKit)

    /// Encrypt data using AES-256-GCM via CryptoKit.
    /// Format: [12-byte nonce][ciphertext][16-byte tag]
    func encryptAESGCM(data: Data, key: Data) throws -> Data {
        guard key.count == Self.keySize else {
            throw EncryptionError.cryptoError("Invalid key size: \(key.count)")
        }
        let symmetricKey = SymmetricKey(data: key)
        let sealedBox = try AES.GCM.seal(data, using: symmetricKey)

        guard let combined = sealedBox.combined else {
            throw EncryptionError.cryptoError("Failed to get combined sealed box")
        }
        return combined
    }

    /// Decrypt data using AES-256-GCM via CryptoKit.
    func decryptAESGCM(data: Data, key: Data) throws -> Data {
        guard key.count == Self.keySize else {
            throw EncryptionError.cryptoError("Invalid key size: \(key.count)")
        }
        let symmetricKey = SymmetricKey(data: key)
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        return try AES.GCM.open(sealedBox, using: symmetricKey)
    }


    // MARK: - Brute-Force Protection (persisted count + monotonic clock)
    // Attempt count is persisted so lockout survives app restart.
    // Timing uses monotonic clock (ProcessInfo.systemUptime) to prevent clock manipulation.
    // On cold start, if persisted attempts exceed the threshold, lockout is re-applied.

    private static let pinAttemptsKey = "cash.selene.encryption.pinLockoutAttempts"
    private static let backupAttemptsKey = "cash.selene.encryption.backupLockoutAttempts"

    private struct LockoutState {
        var attempts: Int
        var lockoutUntil: TimeInterval = 0
        let keychainTag: String
    }

    private var pinLockoutState = LockoutState(
        attempts: KeyManager.loadLockoutCount(tag: KeyManager.pinAttemptsKey),
        keychainTag: KeyManager.pinAttemptsKey
    )
    private var backupLockoutState = LockoutState(
        attempts: KeyManager.loadLockoutCount(tag: KeyManager.backupAttemptsKey),
        keychainTag: KeyManager.backupAttemptsKey
    )

    /// Save lockout count to Keychain (device-only, survives reinstall).
    private static func saveLockoutCount(tag: String, value: Int) {
        // Delete existing
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let data = withUnsafeBytes(of: value) { Data($0) }
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecValueData as String: data
        ]
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        if status != errSecSuccess {
            NSLog("[SimpleEncryption] Failed to persist lockout count for %@: %d", tag, status)
        }
    }

    /// Load lockout count from Keychain. Returns 0 if not found.
    private static func loadLockoutCount(tag: String) -> Int {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data, data.count == MemoryLayout<Int>.size else {
            return 0
        }
        return data.withUnsafeBytes { $0.load(as: Int.self) }
    }

    /// Delete lockout count from Keychain.
    private static func deleteLockoutCount(tag: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag
        ]
        SecItemDelete(query as CFDictionary)
    }

    /// Check if entry is currently locked out due to too many failed attempts.
    private func checkLockout(_ state: inout LockoutState) throws {
        if state.lockoutUntil > 0 {
            let now = ProcessInfo.processInfo.systemUptime
            if now < state.lockoutUntil {
                let remaining = Int(ceil(state.lockoutUntil - now))
                throw EncryptionError.lockedOut(remainingSeconds: remaining)
            }
            state.lockoutUntil = 0  // Lockout expired, allow one attempt
        } else {
            // No active timer — check if persisted attempts warrant lockout (cold start)
            let delay = lockoutDelay(forAttempt: state.attempts)
            if delay > 0 {
                state.lockoutUntil = ProcessInfo.processInfo.systemUptime + Double(delay)
                throw EncryptionError.lockedOut(remainingSeconds: delay)
            }
        }
    }

    /// Convenience: check PIN lockout (default).
    private func checkLockout() throws {
        try checkLockout(&pinLockoutState)
    }

    /// Record a failed attempt, persist count, and apply lockout if threshold exceeded.
    private func recordFailedAttempt(_ state: inout LockoutState) {
        state.attempts += 1
        Self.saveLockoutCount(tag: state.keychainTag, value: state.attempts)
        let delay = lockoutDelay(forAttempt: state.attempts)
        if delay > 0 {
            state.lockoutUntil = ProcessInfo.processInfo.systemUptime + Double(delay)
        }
    }

    /// Convenience: record PIN failed attempt (default).
    private func recordFailedAttempt() {
        recordFailedAttempt(&pinLockoutState)
    }

    /// Reset failed attempt counter (in-memory + persisted) after successful entry.
    private func resetFailedAttempts(_ state: inout LockoutState) {
        state.attempts = 0
        state.lockoutUntil = 0
        Self.saveLockoutCount(tag: state.keychainTag, value: 0)
    }

    /// Convenience: reset PIN failed attempts (default).
    private func resetFailedAttempts() {
        resetFailedAttempts(&pinLockoutState)
    }

    /// Get lockout delay in seconds for a given attempt number.
    private func lockoutDelay(forAttempt attempt: Int) -> Int {
        switch attempt {
        case 0...3: return 0
        case 4: return 30
        case 5: return 60
        case 6: return 300
        case 7: return 900
        default: return 3600
        }
    }

    // MARK: - Keychain Operations

    private func saveToKeychain(data: Data, tag: String) throws {
        // Delete existing item first
        deleteFromKeychain(tag: tag)

        // Use dynamic accessibility based on deviceOnly setting
        let accessibility = isDeviceOnly
            ? kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            : kSecAttrAccessibleWhenUnlocked

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag,
            kSecAttrAccessible as String: accessibility,
            kSecValueData as String: data
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw EncryptionError.keychainError("Failed to save to Keychain: \(status)")
        }
    }

    private func loadFromKeychain(tag: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            return nil
        }

        return result as? Data
    }

    @discardableResult
    private func deleteFromKeychain(tag: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: tag
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - Key Persistence Helpers

    /// Persist a raw key without PIN protection and update in-memory key.
    /// Saves to Keychain and cleans up any legacy PIN salt entry.
    private func storeKeyWithoutPin(_ key: Data) throws {
        try saveToKeychain(data: key, tag: Self.keyTag)
        deleteFromKeychain(tag: Self.pinSaltTag)
        zeroDbKey()
        dbKey = key
    }

    // MARK: - Memory Zeroing

    /// Zero the in-memory dbKey before releasing it.
    /// Uses memset_s which is guaranteed not to be optimized away (C11 Annex K).
    private func zeroDbKey() {
        guard dbKey != nil else { return }
        dbKey?.withUnsafeMutableBytes { ptr in
            if let base = ptr.baseAddress {
                memset_s(base, ptr.count, 0, ptr.count)
            }
        }
        dbKey = nil
    }

    /// Zero a Data buffer in place.
    /// Uses memset_s which is guaranteed not to be optimized away (C11 Annex K).
    func zeroData(_ data: inout Data) {
        data.withUnsafeMutableBytes { ptr in
            if let base = ptr.baseAddress {
                memset_s(base, ptr.count, 0, ptr.count)
            }
        }
    }
}

// MARK: - Errors

enum EncryptionError: Error, LocalizedError {
    case keyNotFound
    case keyNotLoaded
    case pinRequired
    case pinNotConfigured
    case pinTooShort
    case invalidPin
    case invalidPassword
    case lockedOut(remainingSeconds: Int)
    case keychainError(String)
    case cryptoError(String)

    var errorDescription: String? {
        switch self {
        case .keyNotFound:
            return "Encryption key not found in Keychain"
        case .keyNotLoaded:
            return "Encryption key not loaded. Call initialize() first"
        case .pinRequired:
            return "PIN is required to decrypt the encryption key"
        case .pinNotConfigured:
            return "PIN is not configured"
        case .pinTooShort:
            return "PIN must be at least 4 characters"
        case .invalidPin:
            return "Invalid PIN"
        case .invalidPassword:
            return "Invalid backup password"
        case .lockedOut(let seconds):
            return "Too many failed attempts. Please wait \(seconds) seconds before trying again."
        case .keychainError(let msg):
            return "Keychain error: \(msg)"
        case .cryptoError(let msg):
            return "Crypto error: \(msg)"
        }
    }
}
