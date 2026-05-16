import { type Hash, type TransactionReceipt } from "viem"
import { getPublicClient, getPublicClientByChainId } from "@/kernel/evm/ClientService"
import KeyManagerService from "@/kernel/evm/KeyManagerService"
import NonceManager from "@/kernel/evm/NonceManager"
import { classifyError, NonceTooLowError } from "@/kernel/evm/errors"

export interface SendResult {
  hash: Hash
  receipt: TransactionReceipt | null
}

export default function TransactionManagerService(chainId?: number) {
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
      const publicClient = getPublicClient(chainId)
      const from = KeyManagerService().getAddress()
      const chainIdResolved = await publicClient.getChainId()

      const gasEstimate = gas ?? await publicClient.estimateGas({ to, value, data, account: from })

      const nonce = await NonceManager.getNonce(from, chainId)

      const publicByChainId = getPublicClientByChainId(chainIdResolved)
      const prepared = await publicByChainId.prepareTransactionRequest({
        account: from,
        to,
        value,
        data,
        nonce,
        gas: gasEstimate,
        chain: publicByChainId.chain,
      })

      console.log(`[Transaction] Sending with nonce ${nonce} to ${to} on chain ${chainIdResolved}`)

      const signedTx = await KeyManagerService().signTransaction({
        ...prepared,
        chainId: chainIdResolved,
      } as any)

      const hash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      })

      return { hash, receipt: null }
    } catch (e) {
      console.error('[Transaction] Failed:', e)
      const err = classifyError(e)
      if (err instanceof NonceTooLowError) {
        const from = KeyManagerService().getAddress()
        await NonceManager.resetNonce(from, chainId)
      }
      throw err
    }
  }

  async function waitForReceipt(
    hash: Hash,
    confirmations = 1,
  ): Promise<TransactionReceipt> {
    const publicClient = getPublicClient(chainId)
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
