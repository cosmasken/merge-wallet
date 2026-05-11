import { WebPlugin } from "@capacitor/core";

import type {
  SimpleEncryptionPlugin,
  InitializeResult,
  SetPinOptions,
  EncryptOptions,
  EncryptResult,
  DecryptOptions,
  DecryptResult,
  KeyStorageOptions,
  ExportBackupOptions,
  ExportBackupResult,
  ImportBackupOptions,
  RawKeyResult,
  DecryptWithExplicitKeyOptions,
  ReplaceKeyOptions,
  BiometricPromptOptions,
} from "./definitions";

const PIN_HASH_KEY = "SimpleEncryption.pinHash";
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits

/**
 * Web implementation - passthrough (no encryption).
 *
 * Web browsers cannot securely store encryption keys, so we return data unchanged.
 * The app should warn users that web storage is not encrypted.
 *
 * PIN management is supported via PBKDF2 + localStorage for UI consistency.
 */
export class SimpleEncryptionWeb
  extends WebPlugin
  implements SimpleEncryptionPlugin
{
  async initialize(options?: { pin?: string }): Promise<InitializeResult> {
    console.warn(
      "[SimpleEncryption] Running on web - encryption not available. " +
        "Data will be stored unencrypted."
    );
    const hasPinConfigured = localStorage.getItem(PIN_HASH_KEY) !== null;

    // PIN configured but no PIN provided — require unlock (like native)
    if (hasPinConfigured && !options?.pin) {
      return { isNative: false, hasPinConfigured: true, isReady: false };
    }

    // PIN provided — verify before granting access
    if (hasPinConfigured && options?.pin) {
      const stored = localStorage.getItem(PIN_HASH_KEY)!;
      const isValid = await this._verifyAgainstHash(options.pin, stored);
      return { isNative: false, hasPinConfigured: true, isReady: isValid };
    }

    // No PIN configured — always ready
    return { isNative: false, hasPinConfigured: false, isReady: true };
  }

  async hasPinConfigured(): Promise<{ value: boolean }> {
    return { value: localStorage.getItem(PIN_HASH_KEY) !== null };
  }

  async setPin(options: SetPinOptions): Promise<void> {
    // Hash and store new PIN (no currentPin verification needed —
    // caller is responsible for auth before calling setPin)
    const hash = await this._hashPin(options.newPin);
    localStorage.setItem(PIN_HASH_KEY, hash);
  }

  async removePin(): Promise<void> {
    // Caller is responsible for auth before calling removePin
    localStorage.removeItem(PIN_HASH_KEY);
  }

  async verifyPin(options: { pin: string }): Promise<{ isValid: boolean }> {
    const stored = localStorage.getItem(PIN_HASH_KEY);
    if (stored === null) {
      throw new Error("PIN is not configured");
    }
    const isValid = await this._verifyAgainstHash(options.pin, stored);
    return { isValid };
  }

  async encrypt(options: EncryptOptions): Promise<EncryptResult> {
    // Passthrough - return data unchanged
    return { data: options.data };
  }

  async decrypt(options: DecryptOptions): Promise<DecryptResult> {
    // Passthrough - return data unchanged
    return { data: options.data };
  }

  async setKeyStorageSettings(_options: KeyStorageOptions): Promise<void> {
    throw new Error("Key storage settings not available on web platform");
  }

  async exportKeyBackup(
    _options: ExportBackupOptions
  ): Promise<ExportBackupResult> {
    throw new Error("Key backup not available on web platform");
  }

  async importKeyBackup(_options: ImportBackupOptions): Promise<void> {
    throw new Error("Key backup not available on web platform");
  }

  async exportCurrentKey(): Promise<RawKeyResult> {
    throw new Error("Key export not available on web platform");
  }

  async decryptWithExplicitKey(
    options: DecryptWithExplicitKeyOptions
  ): Promise<DecryptResult> {
    console.warn(
      "SimpleEncryption.decryptWithExplicitKey: no-op on web " +
        "(no secure key storage)"
    );
    return { data: options.data };
  }

  async replaceKey(_options: ReplaceKeyOptions): Promise<void> {
    throw new Error("Key replacement not available on web platform");
  }

  async loadKeyIntoMemory(_options: { key: string }): Promise<void> {
    throw new Error("Key management not available on web platform");
  }

  async storeBiometricKey(_options: { key: string; title?: string; reason?: string }): Promise<void> {
    throw new Error("Biometric key storage not available on web platform");
  }

  async loadBiometricKey(
    _options?: BiometricPromptOptions
  ): Promise<{ key: string }> {
    throw new Error("Biometric key storage not available on web platform");
  }

  async hasBiometricKey(): Promise<{ value: boolean }> {
    return { value: false };
  }

  async removeBiometricKey(): Promise<void> {
    // No-op on web (no biometric key storage)
  }

  async isBiometricAvailable(): Promise<{ value: boolean }> {
    return { value: false };
  }

  async verifyBiometric(_options?: BiometricPromptOptions): Promise<void> {
    throw new Error("Biometric verification not available on web platform");
  }

  async clearKeyFromMemory(): Promise<void> {
    // No-op on web (no key in memory to clear)
  }

  async resetAll(): Promise<void> {
    // Web-only: just clears the PIN hash from localStorage.
    // No encryption keys or biometric state to clean up on web.
    localStorage.removeItem(PIN_HASH_KEY);
  }

  async openAppSettings(): Promise<void> {
    // No-op on web
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private PBKDF2 helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async _hashPin(pin: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derived = await this._pbkdf2(pin, salt);
    return `${this._toHex(salt)}$${this._toHex(new Uint8Array(derived))}`;
  }

  private async _verifyAgainstHash(
    pin: string,
    storedHash: string
  ): Promise<boolean> {
    const [saltHex, derivedHex] = storedHash.split("$");
    if (!saltHex || !derivedHex) return false;

    const salt = this._fromHex(saltHex);
    const derived = await this._pbkdf2(pin, salt);
    const computed = this._toHex(new Uint8Array(derived));

    // Constant-time comparison
    if (computed.length !== derivedHex.length) return false;
    let result = 0;
    for (let i = 0; i < computed.length; i++) {
      result |= computed.charCodeAt(i) ^ derivedHex.charCodeAt(i);
    }
    return result === 0;
  }

  private async _pbkdf2(
    pin: string,
    salt: Uint8Array
  ): Promise<ArrayBuffer> {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    return crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      KEY_LENGTH * 8
    );
  }

  private _toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private _fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}
