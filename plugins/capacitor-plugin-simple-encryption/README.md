# capacitor-plugin-simple-encryption

AES-256-GCM encryption for Capacitor apps using platform secure storage (iOS Keychain / Android Keystore). Designed for encrypting SQLite databases and other sensitive data at rest.

On web, data passes through unencrypted (development only).

## Install

```bash
npm install https://github.com/cosmasken/capacitor-plugin-simple-encryption.git
npx cap sync
```

## Platform Requirements

| Platform | Minimum |
|----------|---------|
| iOS | 15.0 |
| Android | API 26 (Android 8.0) |
| Capacitor | 8.0.0 |

## Quick Start

```typescript
import { SimpleEncryption } from "capacitor-plugin-simple-encryption";

// 1. Initialize - loads or generates encryption key
const { isNative, hasPinConfigured, isReady } =
  await SimpleEncryption.initialize();

// 2. If PIN is configured, user must provide it
if (hasPinConfigured && !isReady) {
  await SimpleEncryption.initialize({ pin: userPin });
}

// 3. Encrypt/decrypt strings
const { data: encrypted } = await SimpleEncryption.encrypt({
  data: jsonString,
});
const { data: decrypted } = await SimpleEncryption.decrypt({
  data: encrypted,
});
```

## Usage Examples

### PIN Protection

```typescript
// Set a PIN (key must already be loaded via initialize)
await SimpleEncryption.setPin({ newPin: "1234" });

// Verify PIN without loading key (uses brute-force lockout)
const { isValid } = await SimpleEncryption.verifyPin({ pin: "1234" });

// Remove PIN protection
await SimpleEncryption.removePin();
```

### Biometric Authentication

```typescript
// Check if biometric hardware is available and enrolled
const { value: hasBiometric } =
  await SimpleEncryption.isBiometricAvailable();

// Store encryption key in biometric-protected storage
const { key } = await SimpleEncryption.exportCurrentKey();
await SimpleEncryption.storeBiometricKey({ key });

// Load key via biometric prompt (Face ID / Touch ID / fingerprint)
const { key: bioKey } = await SimpleEncryption.loadBiometricKey({
  title: "My App",
  reason: "Unlock your wallet",
});
await SimpleEncryption.loadKeyIntoMemory({ key: bioKey });

// Verify biometric presence only (no key material involved)
await SimpleEncryption.verifyBiometric({
  title: "My App",
  reason: "Authorize transaction",
});
```

### Key Backup & Recovery

```typescript
// Export key as password-protected backup (PBKDF2 600k iterations)
const { data: backup } = await SimpleEncryption.exportKeyBackup({
  password: "strong-password",
});

// Import key from backup
await SimpleEncryption.importKeyBackup({
  data: backup,
  password: "strong-password",
});
```

### Re-encryption (Key Migration)

```typescript
// Save old key before importing new one
const { key: oldKey } = await SimpleEncryption.exportCurrentKey();

// Import new key
await SimpleEncryption.importKeyBackup({ data: backup, password });

// Decrypt old data with explicit key, re-encrypt with new key
const { data: plain } = await SimpleEncryption.decryptWithExplicitKey({
  data: encryptedData,
  key: oldKey,
});
const { data: reEncrypted } = await SimpleEncryption.encrypt({
  data: plain,
});
```

### App Lifecycle

```typescript
// Lock: clear key from memory when app is backgrounded
await SimpleEncryption.clearKeyFromMemory();

// Unlock: reload key (via PIN or biometric)
await SimpleEncryption.initialize({ pin: userPin });
// or
const { key } = await SimpleEncryption.loadBiometricKey();
await SimpleEncryption.loadKeyIntoMemory({ key });
```

## API

### Initialization

| Method | Description |
|--------|-------------|
| `initialize(options?)` | Load or generate encryption key. Returns `{ isNative, hasPinConfigured, isReady }`. |
| `hasPinConfigured()` | Pure read - check if PIN is configured without side effects. |

### Encrypt / Decrypt

| Method | Description |
|--------|-------------|
| `encrypt({ data })` | AES-256-GCM encrypt a string. Returns base64. |
| `decrypt({ data })` | AES-256-GCM decrypt a base64 string. |
| `decryptWithExplicitKey({ data, key })` | Decrypt with a specific key (for re-encryption migrations). |

### PIN Management

| Method | Description |
|--------|-------------|
| `setPin({ newPin })` | Set or change PIN. Key must already be loaded. |
| `removePin()` | Remove PIN protection. Key must already be loaded. |
| `verifyPin({ pin })` | Verify PIN without loading key. Uses brute-force lockout. |

### Biometric

| Method | Description |
|--------|-------------|
| `isBiometricAvailable()` | Check if biometric hardware is present and enrolled. Returns `{ value: boolean }`. |
| `verifyBiometric(options?)` | Verify biometric presence without accessing key material. Accepts `{ title?, reason? }`. |
| `storeBiometricKey({ key })` | Store key in biometric-protected storage. |
| `loadBiometricKey(options?)` | Load key via Face ID / Touch ID / fingerprint prompt. Accepts `{ title?, reason? }`. |
| `hasBiometricKey()` | Check if biometric key exists. |

### BiometricPromptOptions

Both `verifyBiometric` and `loadBiometricKey` accept optional prompt customization:

```typescript
interface BiometricPromptOptions {
  /** Prompt title (iOS: unused — system controls; Android: BiometricPrompt title) */
  title?: string;
  /** Reason/subtitle shown on the biometric prompt */
  reason?: string;
}
```

Defaults: `title = "Authorize"`, `reason = ""`. No app-specific strings are hardcoded in the plugin — callers provide branded text.

### Key Management

| Method | Description |
|--------|-------------|
| `exportCurrentKey()` | Export raw key (base64) for re-encryption. |
| `replaceKey({ key })` | Replace the stored key after re-encryption. |
| `loadKeyIntoMemory({ key })` | Load key into plugin memory without persisting. |
| `clearKeyFromMemory()` | Zero and clear key from memory (for app pause). |
| `resetAll()` | Nuclear wipe - delete all keys, salts, prefs, biometric data. |

### Settings

| Method | Description |
|--------|-------------|
| `setKeyStorageSettings({ deviceOnly })` | Toggle device-only mode (no iCloud/backup sync). |

### Key Backup / Restore

| Method | Description |
|--------|-------------|
| `exportKeyBackup({ password })` | Export key as password-protected backup (PBKDF2 600k + AES-GCM). |
| `importKeyBackup({ data, password })` | Import key from backup. Rate-limited. |

## Security

### Encryption
- AES-256-GCM via CryptoKit (iOS) / javax.crypto (Android)
- 12-byte random IV per operation, 128-bit authentication tag

### Key Derivation
- PIN unlock: PBKDF2-SHA256, 100,000 iterations
- Backup export: PBKDF2-SHA256, 600,000 iterations

### Key Storage

| Platform | No PIN | With PIN |
|----------|--------|----------|
| **iOS** | Keychain (raw or iCloud-syncable) | Keychain (salt + AES-GCM encrypted key) |
| **Android** | Keystore-wrapped (device-only) or SharedPrefs (cloud-sync) | SharedPrefs (salt + AES-GCM encrypted key) |

### Brute-Force Protection
- Persisted attempt counter (survives app restart)
- Monotonic clock timing (immune to clock manipulation)
- Progressive lockout: 3 free, then 30s / 60s / 5m / 15m / 1hr

### Memory Safety
- iOS: `memset_s` for key zeroing (cannot be optimized away)
- Android: `ByteArray.fill(0)` before nulling references
- `PBEKeySpec.clearPassword()` after key derivation
- Atomic `commit()` for SharedPreferences writes

### Biometric
- iOS: Keychain with `.biometryCurrentSet` access control; `LAContext.evaluatePolicy` for `verifyBiometric` (no keychain access)
- Android: Keystore key with `setUserAuthenticationRequired(true)`, invalidated on biometric enrollment change; `BiometricPrompt` without `CryptoObject` for `verifyBiometric` (pure presence check)

## Development

```bash
npm install
npm run build    # tsc + rollup
npm run watch    # tsc --watch
npm run lint     # eslint
npm run prettier # prettier --check
```

## License

MIT
