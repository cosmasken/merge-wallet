import type { ValidNetwork } from "@/redux/preferences"
import { getPublicClient } from "@/kernel/evm/ClientService"

interface TxHistoryEntry {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  blockNumber: bigint | null
  status: "success" | "pending" | "failed"
  timestamp?: number
}

export default function TransactionHistoryService(network?: ValidNetwork) {
  const publicClient = getPublicClient(network)

  async function getHistory(address: `0x${string}`): Promise<TxHistoryEntry[]> {
    // Stub: will use Alchemy or block explorer API for history
    // For now, return empty array
    return []
  }

  async function getTransactionReceipt(
    hash: `0x${string}`,
  ) {
    const receipt = await publicClient.getTransactionReceipt({ hash })
    return receipt
  }

  return {
    getHistory,
    getTransactionReceipt,
  }
}
