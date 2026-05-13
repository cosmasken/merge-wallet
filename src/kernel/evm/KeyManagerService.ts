import { generateMnemonic, mnemonicToAccount, english } from "viem/accounts"
import type { HDAccount } from "viem/accounts"
import SecureStorageService from "../app/SecureStorageService"
import SecurityService, { AuthActions } from "../app/SecurityService"

const BIP44_PATH = "m/44'/60'/0'/0/0"

let currentAccount: HDAccount | null = null
let currentMnemonic: string | null = null

export default function KeyManagerService() {
  const secureStorage = SecureStorageService()
  const security = SecurityService()

  function getAccount(): HDAccount {
    if (!currentAccount) {
      throw new Error("Wallet not initialized. Please load or generate a wallet first.")
    }
    return currentAccount!
  }

  function generateWallet() {
    const mnemonic = generateMnemonic(english, 128)
    const account = mnemonicToAccount(mnemonic, { path: BIP44_PATH })

    currentAccount = account
    currentMnemonic = mnemonic

    return {
      mnemonic,
      address: account.address,
    }
  }

  function importFromMnemonic(mnemonic: string) {
    const account = mnemonicToAccount(mnemonic, { path: BIP44_PATH })
    currentAccount = account
    currentMnemonic = mnemonic

    return {
      address: account.address,
    }
  }

  function getAddress(): `0x${string}` {
    return getAccount().address
  }

  function getMnemonic(): string | null {
    return currentMnemonic
  }

  function isInitialized(): boolean {
    return currentAccount !== null
  }

  function clearMnemonic(): void {
    currentMnemonic = null
  }

  async function storeMnemonicSecurely(): Promise<void> {
    if (!currentMnemonic) throw new Error("No mnemonic to store")
    await secureStorage.storeMnemonic(currentMnemonic)
  }

  async function loadMnemonicSecurely(): Promise<void> {
    const mnemonic = await secureStorage.getMnemonic()
    if (mnemonic) {
      importFromMnemonic(mnemonic)
    } else {
      throw new Error("Failed to load mnemonic from secure storage")
    }
  }

  async function isMnemonicStored(): Promise<boolean> {
    return await secureStorage.hasStoredMnemonic()
  }

  async function signTransaction(
    tx: Record<string, unknown>,
  ): Promise<`0x${string}`> {
    const account = getAccount()
    return account.signTransaction(tx as never)
  }

  async function signTransactionWithAuth(
    tx: Record<string, unknown>
  ): Promise<`0x${string}`> {
    const authorized = await security.authorize(AuthActions.SendTransaction)
    if (!authorized) {
      throw new Error("User not authorized to sign transaction")
    }

    // If we need the mnemonic to recreate the account because it's not in memory
    if (!currentAccount) {
      await loadMnemonicSecurely()
    }

    return signTransaction(tx)
  }

  return {
    generateWallet,
    importFromMnemonic,
    getAddress,
    getMnemonic,
    clearMnemonic,
    signTransaction,
    signTransactionWithAuth,
    isInitialized,
    storeMnemonicSecurely,
    loadMnemonicSecurely,
    isMnemonicStored,
  }
}

