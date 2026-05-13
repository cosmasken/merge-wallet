import { SimpleEncryption } from "capacitor-simple-encryption";

import { store } from "@/redux/store";
import { selectSecuritySettings } from "@/redux/preferences";

let _hasPinConfigured = false;

function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

export enum AuthActions {
  Any = "Any",
  AppResume = "AppResume",
  SendTransaction = "SendTransaction",
  RevealBalance = "RevealBalance",
  RevealPrivateKeys = "RevealPrivateKeys",
}

export default function SecurityService() {
  return {
    authorize,
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

  async function authorize(action: AuthActions = AuthActions.Any): Promise<boolean> {
    const { authMode, authActions } = selectSecuritySettings(store.getState());
    const isAuthRequired = action === AuthActions.Any || authActions.includes(action);
    if (!isAuthRequired) return true;

    switch (authMode) {
      case "bio": {
        try {
          await SimpleEncryption.verifyBiometric({ title: "Merge Wallet", reason: "Authorize this action" });
          return true;
        } catch {
          return false;
        }
      }
      case "pin":
      case "password":
        if (!_hasPinConfigured) return true;
        // fall through to PIN verification
        return false;
      case "none":
        return true;
      default:
        return false;
    }
  }

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
