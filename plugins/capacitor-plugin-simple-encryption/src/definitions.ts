/**
 * Simple Encryption plugin for Capacitor.
 *
 * Provides AES-256-GCM encryption using platform secure storage (Keychain/Keystore).
 * On web, returns data unchanged (no encryption available).
 */
export interface SimpleEncryptionPlugin {
  /**
   * Initialize encryption. Must be called once at app startup.
   *
   * On native: Loads or generates encryption key from secure storage.
   * On web: No-op (encryption not available).
   *
   * @param options - Optional initialization options
   * @param options.pin - PIN to decrypt the encryption key (required if PIN was configured)
   * @returns Platform capabilities, PIN status, and whether key is ready
   *
   * @example
   * ```typescript
   * const { isNative, hasPinConfigured, isReady } = await SimpleEncryption.initialize();
   * if (isNative && hasPinConfigured && !isReady) {
   *   // Prompt user for PIN, then call initialize again with PIN
   *   await SimpleEncryption.initialize({ pin: userPin });
   * }
   * ```
   */
  initialize(options?: { pin?: string }): Promise<InitializeResult>;

  /**
   * Check if a PIN is configured without any side effects.
   *
   * Unlike initialize(), this is a pure read — it does not load, generate,
   * or modify any keys.
   *
   * @returns true if PIN is configured
   */
  hasPinConfigured(): Promise<{ value: boolean }>;

  /**
   * Set or change the PIN that protects the encryption key.
   * Key must already be loaded via initialize(pin) or verifyPin().
   *
   * The encryption key itself never changes - only the PIN that protects it.
   *
   * @param options - PIN configuration options
   * @param options.newPin - The new PIN to set
   *
   * @throws Error if key is not loaded (call initialize/verifyPin first)
   */
  setPin(options: SetPinOptions): Promise<void>;

  /**
   * Remove PIN protection from the encryption key.
   * Key must already be loaded via initialize(pin) or verifyPin().
   *
   * After this, initialize() won't require a PIN.
   *
   * @throws Error if key is not loaded (call initialize/verifyPin first)
   */
  removePin(): Promise<void>;

  /**
   * Verify a PIN without side effects (does not load key into memory).
   *
   * On native: Uses brute-force lockout (progressive delays).
   * On web: Verifies against PBKDF2 hash in localStorage (no lockout).
   *
   * @param options - PIN verification options
   * @param options.pin - The PIN to verify
   * @returns Whether the PIN is valid
   *
   * @throws Error if locked out due to too many failed attempts (native only)
   * @throws Error if no PIN is configured
   */
  verifyPin(options: { pin: string }): Promise<{ isValid: boolean }>;

  /**
   * Encrypt a string using AES-256-GCM.
   *
   * On native: Encrypts with key from secure storage.
   * On web: Returns data unchanged.
   *
   * @param options - Encryption options
   * @param options.data - Plain string to encrypt
   * @returns Base64-encoded encrypted data (with IV prepended)
   *
   * @example
   * ```typescript
   * const { data: encrypted } = await SimpleEncryption.encrypt({ data: jsonString });
   * ```
   */
  encrypt(options: EncryptOptions): Promise<EncryptResult>;

  /**
   * Decrypt a string using AES-256-GCM.
   *
   * On native: Decrypts with key from secure storage.
   * On web: Returns data unchanged.
   *
   * @param options - Decryption options
   * @param options.data - Base64-encoded encrypted data
   * @returns Original plain string
   *
   * @example
   * ```typescript
   * const { data: jsonString } = await SimpleEncryption.decrypt({ data: encrypted });
   * ```
   */
  decrypt(options: DecryptOptions): Promise<DecryptResult>;

  /**
   * Set key storage mode (device-only vs cloud-syncable).
   *
   * iOS: Controls Keychain accessibility attribute (ThisDeviceOnly vs syncable)
   * Android: Controls whether key uses Keystore wrapper (device-bound) or
   *          direct storage (backups)
   *
   * @param options - Storage settings
   * @param options.deviceOnly - If true, key won't sync via iCloud/Google backup
   *
   * @throws Error if called on web platform
   */
  setKeyStorageSettings(options: KeyStorageOptions): Promise<void>;

  /**
   * Export encryption key as password-protected backup.
   *
   * Uses PBKDF2 with 600,000 iterations + AES-GCM for strong protection.
   *
   * @param options - Export options
   * @param options.password - Password to protect the backup
   * @returns Base64-encoded encrypted backup data
   *
   * @throws Error if key not loaded
   * @throws Error if called on web platform
   */
  exportKeyBackup(options: ExportBackupOptions): Promise<ExportBackupResult>;

  /**
   * Import encryption key from password-protected backup.
   *
   * WARNING: If wallet data exists, the caller must re-encrypt all databases
   * with the new key. Use exportCurrentKey() to get old key before import.
   *
   * @param options - Import options
   * @param options.data - Base64-encoded encrypted backup data
   * @param options.password - Password to decrypt the backup
   *
   * @throws Error if password is incorrect
   * @throws Error if called on web platform
   */
  importKeyBackup(options: ImportBackupOptions): Promise<void>;

  /**
   * Export current key for re-encryption purposes.
   *
   * Returns raw key bytes as Base64. Use this before importing a new key
   * to enable re-encryption of existing data.
   *
   * @returns Base64-encoded raw key
   *
   * @throws Error if key not loaded
   * @throws Error if called on web platform
   */
  exportCurrentKey(): Promise<RawKeyResult>;

  /**
   * Decrypt data using a specific key (for re-encryption).
   *
   * Unlike decrypt(), which uses the loaded key, this method takes an explicit
   * key parameter. Used when migrating data between encryption keys.
   *
   * @param options - Decryption options
   * @param options.data - Base64-encoded encrypted data
   * @param options.key - Base64-encoded encryption key
   * @returns Original plain string
   */
  decryptWithExplicitKey(
    options: DecryptWithExplicitKeyOptions
  ): Promise<DecryptResult>;

  /**
   * Replace the stored key after re-encryption is complete.
   *
   * @param options - Key replacement options
   * @param options.key - Base64-encoded new key to store
   *
   * @throws Error if called on web platform
   */
  replaceKey(options: ReplaceKeyOptions): Promise<void>;

  /**
   * Load a raw key into plugin memory without persisting to storage.
   *
   * Used for biometric unlock where the key is already stored in
   * biometric-protected storage. Unlike replaceKey(), this does NOT
   * modify the stored key or remove PIN protection.
   *
   * @param options - Key to load
   * @param options.key - Base64-encoded raw encryption key
   *
   * @throws Error if called on web platform
   */
  loadKeyIntoMemory(options: { key: string }): Promise<void>;

  /**
   * Store raw encryption key in biometric-protected secure storage.
   *
   * iOS: Stores in Keychain with biometry access control.
   * Android: Encrypts with biometric-bound Keystore key, stores in
   *          SharedPreferences.
   *
   * Triggers biometric prompt to authenticate the store operation.
   *
   * @param options - Key to store and optional prompt text
   * @param options.key - Base64-encoded raw encryption key
   * @param options.title - Biometric prompt title (default: "Selene Wallet")
   * @param options.reason - Biometric prompt subtitle (default: "Authenticate to enable biometric unlock")
   *
   * @throws Error if biometric not available or user cancels
   * @throws Error if called on web platform
   */
  storeBiometricKey(options: {
    key: string;
    title?: string;
    reason?: string;
  }): Promise<void>;

  /**
   * Load encryption key from biometric-protected storage.
   * Triggers biometric prompt (Face ID / Touch ID / fingerprint).
   *
   * @param options - Optional prompt customization
   * @returns Base64-encoded raw encryption key
   *
   * @throws Error if biometric auth fails or is cancelled
   * @throws Error if no biometric key stored
   * @throws Error if called on web platform
   */
  loadBiometricKey(options?: BiometricPromptOptions): Promise<{ key: string }>;

  /**
   * Check if a biometric-protected key exists.
   *
   * @returns true if biometric key is stored
   */
  hasBiometricKey(): Promise<{ value: boolean }>;

  /**
   * Remove biometric-protected key from platform storage.
   * No-op if no biometric key exists.
   */
  removeBiometricKey(): Promise<void>;

  /**
   * Check if biometric authentication is available on this device.
   *
   * @returns true if biometric hardware is present and enrolled
   */
  isBiometricAvailable(): Promise<{ value: boolean }>;

  /**
   * Verify biometric presence without accessing any key material.
   * Pure authentication check — no keychain/keystore interaction.
   *
   * @param options - Optional prompt customization
   *
   * @throws Error if biometric auth fails or is cancelled
   * @throws Error if biometric not available
   * @throws Error if called on web platform
   */
  verifyBiometric(options?: BiometricPromptOptions): Promise<void>;

  /**
   * Clear the encryption key from plugin memory without affecting persistent
   * storage.
   *
   * After this call, encrypt/decrypt will fail until the key is reloaded
   * (via initialize, loadKeyIntoMemory, or loadBiometricKey).
   *
   * Used for secure lock on app pause — ensures key is not resident in memory
   * while the app is backgrounded.
   */
  clearKeyFromMemory(): Promise<void>;

  /**
   * Delete ALL keys, salts, prefs, and biometric keys. Complete fresh start.
   *
   * Used for "forgot PIN" nuclear wipe recovery path.
   *
   * @throws Error if called on web platform
   */
  resetAll(): Promise<void>;

  /** Open the app's native settings page (for enabling biometric permission, etc.) */
  openAppSettings(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────
// Option Types
// ─────────────────────────────────────────────────────────────────────────

export interface BiometricPromptOptions {
  /** Prompt title (iOS: unused — system controls; Android: BiometricPrompt title) */
  title?: string;
  /** Reason/subtitle shown on the biometric prompt */
  reason?: string;
}

export interface SetPinOptions {
  /** New PIN to set */
  newPin: string;
}

export interface EncryptOptions {
  /** Plain string to encrypt */
  data: string;
}

export interface DecryptOptions {
  /** Base64-encoded encrypted data */
  data: string;
}

export interface KeyStorageOptions {
  /** If true, key won't sync via iCloud/Google backup (default: false) */
  deviceOnly?: boolean;
}

export interface ExportBackupOptions {
  /** Password to protect the backup (min 8 characters recommended) */
  password: string;
}

export interface ImportBackupOptions {
  /** Base64-encoded encrypted backup data */
  data: string;
  /** Password to decrypt the backup */
  password: string;
}

export interface DecryptWithExplicitKeyOptions {
  /** Base64-encoded encrypted data */
  data: string;
  /** Base64-encoded encryption key */
  key: string;
}

export interface ReplaceKeyOptions {
  /** Base64-encoded new key to store */
  key: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Result Types
// ─────────────────────────────────────────────────────────────────────────

export interface InitializeResult {
  /** Whether running on native platform (true = encryption available) */
  isNative: boolean;
  /** Whether PIN is configured (native only) */
  hasPinConfigured: boolean;
  /** Whether the encryption key is loaded and ready to use */
  isReady: boolean;
}

export interface EncryptResult {
  /** Base64-encoded encrypted data */
  data: string;
}

export interface DecryptResult {
  /** Original plain string */
  data: string;
}

export interface ExportBackupResult {
  /** Base64-encoded encrypted backup data */
  data: string;
}

export interface RawKeyResult {
  /** Base64-encoded raw encryption key */
  key: string;
}
