import { generateMnemonic, mnemonicToAccount, english, privateKeyToAccount } from "viem/accounts"
import type { HDAccount, PrivateKeyAccount } from "viem/accounts"
import SecureStorageService from "../app/SecureStorageService"
import SecurityService, { AuthActions } from "../app/SecurityService"

const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/"
const RSK_DERIVATION_PATH = "m/44'/137'/0'/0/"

let currentAccount: HDAccount | PrivateKeyAccount | null = null
let currentMnemonic: string | null = null
let currentPrivateKey: string | null = null
let currentIndex = 0
let currentIsRskPath = false

export default function KeyManagerService() {
  const secureStorage = SecureStorageService()
  const security = SecurityService()

  function getAccount(): HDAccount {
    if (!currentAccount) {
      throw new Error("Wallet not initialized. Please load or generate a wallet first.")
    }
    return currentAccount!
  }

  function generateWallet(index = 0, isRskPath = false) {
    const mnemonic = generateMnemonic(english, 128)
    const path = (isRskPath ? RSK_DERIVATION_PATH : ETH_DERIVATION_PATH) + index
    const account = mnemonicToAccount(mnemonic, { path })
    
    currentAccount = account
    currentMnemonic = mnemonic
    currentIndex = index
    currentIsRskPath = isRskPath

    return {
      mnemonic,
      address: account.address,
      index,
    }
  }

  function importFromMnemonic(mnemonic: string, index = 0, isRskPath = false) {
    const path = (isRskPath ? RSK_DERIVATION_PATH : ETH_DERIVATION_PATH) + index
    const account = mnemonicToAccount(mnemonic, { path })
    currentAccount = account
    currentMnemonic = mnemonic
    currentPrivateKey = null
    currentIndex = index
    currentIsRskPath = isRskPath

    return {
      address: account.address,
      index,
    }
  }

  function importFromPrivateKey(privateKey: string) {
    const formatted = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`
    const account = privateKeyToAccount(formatted)
    currentAccount = account
    currentMnemonic = null
    currentPrivateKey = formatted
    currentIndex = 0
    currentIsRskPath = false

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

  function getImportType(): "mnemonic" | "privateKey" | null {
    if (currentMnemonic) return "mnemonic"
    if (currentPrivateKey) return "privateKey"
    return null
  }

  function isInitialized(): boolean {
    return currentAccount !== null
  }

  function clearMnemonic(): void {
    currentMnemonic = null
  }

  async function storeWalletSecurely(): Promise<void> {
    const importType = getImportType()
    if (!importType) throw new Error("No wallet to store")
    
    const data = importType === "mnemonic" ? currentMnemonic! : currentPrivateKey!
    await secureStorage.storeWallet(data, importType, currentIndex, currentIsRskPath)
  }

  async function loadWalletSecurely(): Promise<void> {
    const result = await secureStorage.getWallet()
    if (result) {
      if (result.importType === "mnemonic") {
        importFromMnemonic(result.data, result.index, result.isRskPath)
      } else {
        importFromPrivateKey(result.data)
      }
    } else {
      throw new Error("Failed to load wallet from secure storage")
    }
  }

  async function isWalletStored(): Promise<boolean> {
    return await secureStorage.hasStoredWallet()
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

    if (!currentAccount) {
      await loadWalletSecurely()
    }

    return signTransaction(tx)
  }

  return {
    generateWallet,
    importFromMnemonic,
    importFromPrivateKey,
    getAddress,
    getMnemonic,
    getImportType,
    clearMnemonic,
    signTransaction,
    signTransactionWithAuth,
    isInitialized,
    storeWalletSecurely,
    loadWalletSecurely,
    isWalletStored,
  }
}


