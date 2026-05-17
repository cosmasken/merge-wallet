import { getPublicClient } from "@/kernel/evm/ClientService"
import { getBlockscoutApiUrl } from "@/util/networks"

export interface TxHistoryEntry {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  blockNumber: number
  timestamp: number
  status: "success" | "pending" | "failed"
}

interface BlockscoutTx {
  hash: string
  from: { hash: string }
  to: { hash: string } | null
  value: string
  block_number: number
  timestamp: string
  status: "ok" | "error"
}

export default function TransactionHistoryService(chainId?: number) {
  const resolvedChainId = chainId ?? 31

  async function getHistory(address: `0x${string}`): Promise<TxHistoryEntry[]> {
    try {
      const apiUrl = getBlockscoutApiUrl(resolvedChainId)
      if (!apiUrl) return []

      const url = `${apiUrl}/api/v2/addresses/${address.toLowerCase()}/transactions?limit=50`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      const data = await response.json()

      if (!data.items) return []

      return data.items.map((tx: BlockscoutTx): TxHistoryEntry => ({
        hash: tx.hash as `0x${string}`,
        from: tx.from.hash as `0x${string}`,
        to: (tx.to?.hash ?? "") as `0x${string}`,
        value: BigInt(tx.value),
        blockNumber: tx.block_number,
        timestamp: new Date(tx.timestamp).getTime() / 1000,
        status: tx.status === "ok" ? "success" : "failed",
      }))
    } catch {
      return []
    }
  }

  async function getTransactionReceipt(hash: `0x${string}`) {
    const publicClient = getPublicClient(resolvedChainId)
    return publicClient.getTransactionReceipt({ hash })
  }

  return {
    getHistory,
    getTransactionReceipt,
  }
}
