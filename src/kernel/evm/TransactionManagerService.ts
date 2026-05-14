import { type Hash, type TransactionReceipt, parseEther } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import KeyManagerService from "@/kernel/evm/KeyManagerService"
import NonceManager from "@/kernel/evm/NonceManager"
import type { ValidNetwork } from "@/redux/preferences"
import { classifyError } from "@/kernel/evm/errors"

export interface SendResult {
  hash: Hash
  receipt: TransactionReceipt | null
}

export default function TransactionManagerService(network?: ValidNetwork) {
  async function sendTransaction(
    to: `0x${string}`,
    value: bigint,
    gas?: bigint,
  ): Promise<SendResult> {
    return sendContractTransaction(to, value, undefined, gas)
  }

  async function sendContractTransaction(
    to: `0x${string}`,
    value: bigint,
    data?: `0x${string}`,
    gas?: bigint,
  ): Promise<SendResult> {
    try {
      const publicClient = getPublicClient(network)
      const from = KeyManagerService().getAddress()
      const [chainId, gasPrice] = await Promise.all([
        publicClient.getChainId(),
        publicClient.getGasPrice(), // Always get gasPrice
      ])
      
      // Use nonce manager to prevent stale nonce issues
      const nonce = await NonceManager.getNonce(from, network)
      
      console.log(`[Transaction] Sending with nonce ${nonce} to ${to}`)
      
      const signedTx = await KeyManagerService().signTransaction({
        to,
        value,
        data,
        chainId,
        nonce,
        gas,
        gasPrice,
        from,
      })

      const hash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      })

      return { hash, receipt: null }
    } catch (e) {
      console.error('[Transaction] Failed:', e)
      // Reset nonce on failure to resync with network
      const from = KeyManagerService().getAddress()
      await NonceManager.resetNonce(from, network)
      throw classifyError(e)
    }
  }

  async function waitForReceipt(
    hash: Hash,
    confirmations = 1,
  ): Promise<TransactionReceipt> {
    const publicClient = getPublicClient(network)
    return publicClient.waitForTransactionReceipt({ hash, confirmations })
  }

  async function sendAndWait(
    to: `0x${string}`,
    value: bigint,
    gas?: bigint,
    confirmations = 1,
  ): Promise<SendResult> {
    const { hash } = await sendTransaction(to, value, gas)
    const receipt = await waitForReceipt(hash, confirmations)
    return { hash, receipt }
  }

  return {
    sendTransaction,
    sendContractTransaction,
    waitForReceipt,
    sendAndWait,
  }
}
