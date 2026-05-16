import { SimpleEncryption } from "capacitor-simple-encryption";
import { Preferences } from "@capacitor/preferences";

import { store } from "@/redux/store";
import { selectSecuritySettings } from "@/redux/preferences";
import ModalService from "./ModalService";

let _hasPinConfigured = false;
let _initialized = false;

const LOCKOUT_KEY = "pin_failed_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

async function getFailedAttempts(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: LOCKOUT_KEY });
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}

async function setFailedAttempts(count: number): Promise<void> {
  await Preferences.set({ key: LOCKOUT_KEY, value: String(count) });
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
    promptForNewPin,
    isBiometricAvailable,
    hasBiometricKey,
    unlockWithBiometric,
    storeBiometricKeyFromCurrent,
    removeBiometricKey,
    resetEncryption,
    clearKeyFromMemory,
  };

  async function ensureSynced(): Promise<void> {
    if (!_initialized) {
      try {
        const { value } = await SimpleEncryption.hasPinConfigured();
        _hasPinConfigured = value;
      } catch {
        // Plugin not available
      }
      _initialized = true;
    }
  }

  async function authorize(action: AuthActions = AuthActions.Any): Promise<boolean> {
    await ensureSynced();

    const { authMode, authActions, isNumericPin } = selectSecuritySettings(store.getState());
    const isAuthRequired = action === AuthActions.Any || authActions.includes(action);
    if (!isAuthRequired) return true;

    switch (authMode) {
      case "bio":
        return unlockWithBiometric();

      case "pin":
      case "password":
        if (!_hasPinConfigured) return true;
        const isPasswordMode = !isNumericPin;
        const pin = await ModalService().showPrompt({
          title: isPasswordMode ? "Enter Password" : "Enter PIN",
          inputType: "password",
          inputMode: isPasswordMode ? "text" : "numeric",
          submitLabel: "Authorize",
        });
        if (!pin) return false;
        try {
          return await verifyPin(pin);
        } catch (e) {
          return false;
        }

      case "none":
        return true;

      default:
        return false;
    }
  }

  async function initEncryption(pin?: string) {
    const result = await SimpleEncryption.initialize({ pin });
    _hasPinConfigured = result.hasPinConfigured;
    _initialized = true;
    return result;
  }

  async function verifyPin(pin: string): Promise<boolean> {
    if (!isCryptoAvailable()) {
      throw new Error("Crypto not available — run over HTTPS or localhost");
    }

    const failedAttempts = await getFailedAttempts();
    if (failedAttempts >= MAX_ATTEMPTS) {
      throw new Error("Too many incorrect attempts. Wallet locked for 5 minutes.");
    }

    const { isValid } = await SimpleEncryption.verifyPin({ pin });

    if (!isValid) {
      const newCount = failedAttempts + 1;
      await setFailedAttempts(newCount);
      if (newCount >= MAX_ATTEMPTS) {
        throw new Error("Too many incorrect attempts. Wallet locked for 5 minutes.");
      }
    } else {
      await setFailedAttempts(0);
    }

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

  async function promptForNewPin(): Promise<string | null> {
    const pin = await ModalService().showPrompt({
      title: "Set a PIN",
      message: "Choose a 4-6 digit PIN to secure your wallet",
      inputType: "password",
      inputMode: "numeric",
      submitLabel: "Next",
    });
    if (!pin || pin.length < 4) return null;

    const confirm = await ModalService().showPrompt({
      title: "Confirm PIN",
      inputType: "password",
      inputMode: "numeric",
      submitLabel: "Confirm",
    });
    if (!confirm) return null;

    if (pin !== confirm) return null;

    return pin;
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
      const { key } = await SimpleEncryption.loadBiometricKey({
        title: "Merge Wallet",
        reason: "Authorize this action",
      });
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
    _initialized = true;
    await setFailedAttempts(0);
  }

  async function clearKeyFromMemory(): Promise<void> {
    await SimpleEncryption.clearKeyFromMemory();
  }
}
