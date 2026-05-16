import { type Hash, type TransactionReceipt, parseEther } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import KeyManagerService from "@/kernel/evm/KeyManagerService"
import NonceManager from "@/kernel/evm/NonceManager"
import type { ValidNetwork } from "@/redux/preferences"
import { classifyError, NonceTooLowError } from "@/kernel/evm/errors"

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
        publicClient.getGasPrice(),
      ])

      // Estimate gas if not explicitly provided (contracts need more than 21k)
      const gasEstimate = gas ?? await publicClient.estimateGas({ to, value, data, account: from })

      // Use nonce manager to prevent stale nonce issues
      const nonce = await NonceManager.getNonce(from, network)

      console.log(`[Transaction] Sending with nonce ${nonce} to ${to}`)

      const signedTx = await KeyManagerService().signTransaction({
        to,
        value,
        data,
        chainId,
        nonce,
        gas: gasEstimate,
        gasPrice,
        from,
      })

      const hash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      })

      return { hash, receipt: null }
    } catch (e) {
      console.error('[Transaction] Failed:', e)
      const err = classifyError(e)
      // Only reset nonce on nonce-related failures (nonce too low, already known).
      // Network timeouts, insufficient funds, etc. should NOT reset nonce,
      // since the original tx may have been accepted.
      if (err instanceof NonceTooLowError) {
        const from = KeyManagerService().getAddress()
        await NonceManager.resetNonce(from, network)
      }
      throw err
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
