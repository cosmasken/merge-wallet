import { SimpleEncryption } from "capacitor-simple-encryption";
import { Preferences } from "@capacitor/preferences";

const STORAGE_KEY = "encrypted_mnemonic";

export interface EncryptedWallet {
  encryptedData: string;
  storageMethod: 'keychain' | 'encrypted' | 'memory';
  createdAt: number;
  lastAccessed: number;
  importType: 'mnemonic' | 'privateKey';
  index?: number;
  isRskPath?: boolean;
}



export default function SecureStorageService() {
  /**
   * Encrypts and stores the mnemonic using the current active encryption key.
   * Assumes initialize() has been called and the key is in memory.
   */
  async function storeWallet(
    data: string, 
    importType: 'mnemonic' | 'privateKey',
    index = 0, 
    isRskPath = false
  ): Promise<void> {
    try {
      const { data: encryptedValue } = await SimpleEncryption.encrypt({ 
        data 
      });

      const storageData: EncryptedWallet = {
        encryptedData: encryptedValue,
        storageMethod: 'encrypted',
        importType,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        index,
        isRskPath
      };

      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(storageData)
      });
    } catch (error) {
      console.error("Failed to store wallet securely", error);
      throw new Error("SECURE_STORAGE_ERROR: Failed to encrypt and persist wallet");
    }
  }


  /**
   * Decrypts and retrieves the mnemonic using the current active encryption key.
   * Assumes initialize() has been called and the key is in memory.
   */
  async function getWallet(): Promise<{ data: string; importType: 'mnemonic' | 'privateKey'; index: number; isRskPath: boolean } | null> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return null;

    try {
      const storageData: EncryptedWallet = JSON.parse(value);
      
      const { data: decrypted } = await SimpleEncryption.decrypt({ 
        data: storageData.encryptedData 
      });

      storageData.lastAccessed = Date.now();
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(storageData)
      });

      return {
        data: decrypted,
        importType: storageData.importType ?? 'mnemonic', // Default to mnemonic for backward compatibility
        index: storageData.index ?? 0,
        isRskPath: storageData.isRskPath ?? false
      };
    } catch (error) {
      console.error("Failed to decrypt wallet", error);
      return null;
    }
  }


  async function hasStoredMnemonic(): Promise<boolean> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    return !!value;
  }

  /**
   * In the context of capacitor-simple-encryption, changing the PIN 
   * doesn't necessarily change the underlying encryption key, 
   * just the protection around it. 
   */
  async function rekeyMnemonic(_oldPin: string, _newPin: string): Promise<void> {
    // Re-verify we can still decrypt
    const mnemonic = await getMnemonic();
    if (!mnemonic) {
      throw new Error("DECRYPTION_FAILED: Could not access mnemonic with current key state");
    }
    // The underlying key is persisted by the plugin, so we just re-save to be sure
    await storeMnemonic(mnemonic);
  }

  async function deleteMnemonic(): Promise<void> {
    await Preferences.remove({ key: STORAGE_KEY });
  }

  function clearFromMemory(): void {
    SimpleEncryption.clearKeyFromMemory();
  }

  return {
    storeWallet,
    getWallet,
    hasStoredWallet: hasStoredMnemonic,
    deleteWallet: deleteMnemonic,
    clearFromMemory
  };

}


