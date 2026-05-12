import { type Hash, type TransactionReceipt, parseEther } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import KeyManagerService from "@/kernel/evm/KeyManagerService"
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
    try {
      const publicClient = getPublicClient(network)
      const from = KeyManagerService().getAddress()
      const [chainId, nonce, gasPrice] = await Promise.all([
        publicClient.getChainId(),
        publicClient.getTransactionCount({ address: from }),
        gas ? Promise.resolve(undefined) : publicClient.getGasPrice(),
      ])

      const signedTx = await KeyManagerService().signTransaction({
        to,
        value,
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
    waitForReceipt,
    sendAndWait,
  }
}
