import { generateMnemonic, mnemonicToAccount, english } from "viem/accounts"
import type { HDAccount } from "viem/accounts"

const BIP44_PATH = "m/44'/60'/0'/0/0"

let currentAccount: HDAccount | null = null
let currentMnemonic: string | null = null

export default function KeyManagerService() {
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

  function getAccount(): HDAccount {
    if (!currentAccount) {
      generateWallet()
    }
    return currentAccount!
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

  return {
    generateWallet,
    importFromMnemonic,
    getAccount,
    getAddress,
    getMnemonic,
    isInitialized,
  }
}
