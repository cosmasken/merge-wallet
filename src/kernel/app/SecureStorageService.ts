import { SimpleEncryption } from "capacitor-simple-encryption";
import { Preferences } from "@capacitor/preferences";

const WALLETS_INDEX_KEY = "wallet_index";
const WALLET_KEY_PREFIX = "wallet_";

export interface WalletIndexEntry {
  id: string;
  name: string;
  address: string;
  createdAt: number;
  importType: 'mnemonic' | 'privateKey';
}

interface EncryptedWallet {
  encryptedData: string;
  storageMethod: 'keychain' | 'encrypted' | 'memory';
  createdAt: number;
  lastAccessed: number;
  importType: 'mnemonic' | 'privateKey';
  index?: number;
  isRskPath?: boolean;
}

function walletKey(id: string): string {
  return `${WALLET_KEY_PREFIX}${id}`;
}

export default function SecureStorageService() {
  async function listWallets(): Promise<WalletIndexEntry[]> {
    const { value } = await Preferences.get({ key: WALLETS_INDEX_KEY });
    if (!value) return [];
    try {
      return JSON.parse(value) as WalletIndexEntry[];
    } catch {
      return [];
    }
  }

  async function saveWalletIndex(entries: WalletIndexEntry[]): Promise<void> {
    await Preferences.set({ key: WALLETS_INDEX_KEY, value: JSON.stringify(entries) });
  }

  async function storeWallet(
    id: string,
    data: string,
    importType: 'mnemonic' | 'privateKey',
    index = 0,
    isRskPath = false,
  ): Promise<void> {
    const { data: encryptedValue } = await SimpleEncryption.encrypt({ data });

    const storageData: EncryptedWallet = {
      encryptedData: encryptedValue,
      storageMethod: 'encrypted',
      importType,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      index,
      isRskPath,
    };

    await Preferences.set({
      key: walletKey(id),
      value: JSON.stringify(storageData),
    });
  }

  async function getWallet(id: string): Promise<{
    data: string;
    importType: 'mnemonic' | 'privateKey';
    index: number;
    isRskPath: boolean;
  } | null> {
    const { value } = await Preferences.get({ key: walletKey(id) });
    if (!value) return null;

    try {
      const storageData: EncryptedWallet = JSON.parse(value);
      const { data: decrypted } = await SimpleEncryption.decrypt({
        data: storageData.encryptedData,
      });

      storageData.lastAccessed = Date.now();
      await Preferences.set({
        key: walletKey(id),
        value: JSON.stringify(storageData),
      });

      return {
        data: decrypted,
        importType: storageData.importType ?? 'mnemonic',
        index: storageData.index ?? 0,
        isRskPath: storageData.isRskPath ?? false,
      };
    } catch {
      return null;
    }
  }

  async function deleteWallet(id: string): Promise<void> {
    await Preferences.remove({ key: walletKey(id) });
    const entries = await listWallets();
    await saveWalletIndex(entries.filter(e => e.id !== id));
  }

  async function hasStoredWallet(): Promise<boolean> {
    const entries = await listWallets();
    return entries.length > 0;
  }

  async function rekeyMnemonic(id: string): Promise<void> {
    const wallet = await getWallet(id);
    if (!wallet) {
      throw new Error("DECRYPTION_FAILED: Could not access wallet");
    }
    await storeWallet(id, wallet.data, wallet.importType, wallet.index, wallet.isRskPath);
  }

  function clearFromMemory(): void {
    SimpleEncryption.clearKeyFromMemory();
  }

  return {
    listWallets,
    saveWalletIndex,
    storeWallet,
    getWallet,
    deleteWallet,
    hasStoredWallet,
    rekeyMnemonic,
    clearFromMemory,
  };
}


