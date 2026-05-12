import { SimpleEncryption } from "capacitor-plugin-simple-encryption";

let _hasPinConfigured = false;

function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

export default function SecurityService() {
  return {
    initEncryption,
    verifyPin,
    setPin,
    removePin,
    isPinConfigured,
    isBiometricAvailable,
    hasBiometricKey,
    unlockWithBiometric,
    storeBiometricKeyFromCurrent,
    removeBiometricKey,
    resetEncryption,
    clearKeyFromMemory,
  };

  async function initEncryption(pin?: string) {
    const result = await SimpleEncryption.initialize({ pin });
    _hasPinConfigured = result.hasPinConfigured;
    return result;
  }

  async function verifyPin(pin: string): Promise<boolean> {
    if (!isCryptoAvailable()) {
      throw new Error("Crypto not available — run over HTTPS or localhost");
    }
    const { isValid } = await SimpleEncryption.verifyPin({ pin });
    return isValid;
  }

  async function setPin(newPin: string): Promise<void> {
    if (!isCryptoAvailable()) {
      throw new Error("Crypto not available — run over HTTPS or localhost");
    }
    await SimpleEncryption.setPin({ newPin });
    _hasPinConfigured = true;
  }

  async function removePin(): Promise<void> {
    await SimpleEncryption.removePin();
    _hasPinConfigured = false;
  }

  function isPinConfigured(): boolean {
    return _hasPinConfigured;
  }

  async function isBiometricAvailable(): Promise<boolean> {
    const { value } = await SimpleEncryption.isBiometricAvailable();
    return value;
  }

  async function hasBiometricKey(): Promise<boolean> {
    const { value } = await SimpleEncryption.hasBiometricKey();
    return value;
  }

  async function unlockWithBiometric(): Promise<boolean> {
    try {
      const { key } = await SimpleEncryption.loadBiometricKey();
      await SimpleEncryption.loadKeyIntoMemory({ key });
      return true;
    } catch {
      return false;
    }
  }

  async function storeBiometricKeyFromCurrent(): Promise<void> {
    const { key } = await SimpleEncryption.exportCurrentKey();
    await SimpleEncryption.storeBiometricKey({ key });
  }

  async function removeBiometricKey(): Promise<void> {
    await SimpleEncryption.removeBiometricKey();
  }

  async function resetEncryption(): Promise<void> {
    await SimpleEncryption.resetAll();
    _hasPinConfigured = false;
  }

  async function clearKeyFromMemory(): Promise<void> {
    await SimpleEncryption.clearKeyFromMemory();
  }
}
