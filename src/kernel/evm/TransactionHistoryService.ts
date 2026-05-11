import { getPublicClient } from "@/kernel/evm/ClientService"
import { getExplorerUrl } from "@/util/networks"
import type { ValidNetwork } from "@/redux/preferences"

export interface TxHistoryEntry {
  hash: `0x${string}`
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  blockNumber: number
  timestamp: number
  status: "success" | "pending" | "failed"
}

interface ExplorerTx {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: string
  timeStamp: string
  isError: string
  txreceipt_status: string
}

export default function TransactionHistoryService(network?: ValidNetwork) {
  async function getHistory(address: `0x${string}`): Promise<TxHistoryEntry[]> {
    try {
      const explorerUrl = getExplorerUrl(network ?? "testnet")
      const apiUrl = `${explorerUrl}/api?module=account&action=txlist&address=${address}&sort=desc&limit=20`

      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.status !== "1" || !data.result) {
        return []
      }

      return data.result.map((tx: ExplorerTx): TxHistoryEntry => ({
        hash: tx.hash as `0x${string}`,
        from: tx.from as `0x${string}`,
        to: tx.to as `0x${string}`,
        value: BigInt(tx.value),
        blockNumber: Number(tx.blockNumber),
        timestamp: Number(tx.timeStamp),
        status: tx.txreceipt_status === "1" ? "success" : tx.isError === "1" ? "failed" : "pending",
      }))
    } catch {
      return []
    }
  }

  async function getTransactionReceipt(hash: `0x${string}`) {
    const publicClient = getPublicClient(network)
    return publicClient.getTransactionReceipt({ hash })
  }

  return {
    getHistory,
    getTransactionReceipt,
  }
}
