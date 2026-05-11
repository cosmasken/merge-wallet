import { type Hash } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

export default function TransactionManagerService(network?: ValidNetwork) {
  async function waitForReceipt(hash: Hash, confirmations = 1) {
    const publicClient = getPublicClient(network)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations,
    })
    return receipt
  }

  return {
    waitForReceipt,
  }
}
