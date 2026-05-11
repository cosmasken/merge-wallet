import { SimpleEncryption } from "capacitor-plugin-simple-encryption";

let _hasPinConfigured = false;

export default function SecurityService() {
  return {
    initEncryption,
    verifyPin,
    setPin,
    isPinConfigured,
    hasBiometricKey,
    unlockWithBiometric,
    storeBiometricKeyFromCurrent,
    resetEncryption,
    clearKeyFromMemory,
  };

  async function initEncryption(pin?: string) {
    const result = await SimpleEncryption.initialize({ pin });
    _hasPinConfigured = result.hasPinConfigured;
    return result;
  }

  async function verifyPin(pin: string): Promise<boolean> {
    try {
      const { isValid } = await SimpleEncryption.verifyPin({ pin });
      return isValid;
    } catch {
      return false;
    }
  }

  async function setPin(newPin: string): Promise<void> {
    await SimpleEncryption.setPin({ newPin });
    _hasPinConfigured = true;
  }

  function isPinConfigured(): boolean {
    return _hasPinConfigured;
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

  async function resetEncryption(): Promise<void> {
    await SimpleEncryption.resetAll();
    _hasPinConfigured = false;
  }

  async function clearKeyFromMemory(): Promise<void> {
    await SimpleEncryption.clearKeyFromMemory();
  }
}
