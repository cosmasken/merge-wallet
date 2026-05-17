import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useParams, useNavigate } from "react-router"
import { formatEther, type Transaction, type TransactionReceipt } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import Button from "@/atoms/Button"
import { selectChainId } from "@/redux/preferences"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"
import { getBlockscoutApiUrl } from "@/util/networks"

interface BlockscoutTx {
  hash: string
  status: "ok" | "error"
  block: number
  timestamp: string
  from: { hash: string }
  to: { hash: string } | null
  value: string
  fee: { value: string }
  gas_limit: string
  gas_used: string
  gas_price: string
  nonce: number
  confirmations: number
}

export default function TransactionDetailView() {
  const { hash } = useParams<{ hash: string }>()
  const navigate = useNavigate()
  const chainId = useSelector(selectChainId)
  const [tx, setTx] = useState<Transaction | null>(null)
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null)
  const [bsTx, setBsTx] = useState<BlockscoutTx | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!hash) return
    setIsLoading(true)
    setError("")

    const client = getPublicClientByChainId(chainId)

    Promise.all([
      client.getTransaction({ hash: hash as `0x${string}` }).catch(() => null),
      client.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null),
      fetchBlockscout(hash as `0x${string}`),
    ]).then(([txData, receiptData, bsData]) => {
      if (txData) setTx(txData as Transaction)
      if (receiptData) setReceipt(receiptData as TransactionReceipt)
      if (bsData) setBsTx(bsData)
      if (!txData && !bsData) setError("Transaction not found")
    }).catch(() => setError("Failed to load transaction"))
      .finally(() => setIsLoading(false))
  }, [hash, chainId])

  async function fetchBlockscout(txHash: `0x${string}`): Promise<BlockscoutTx | null> {
    try {
      const apiUrl = getBlockscoutApiUrl(chainId)
      if (!apiUrl) return null
      const res = await fetch(`${apiUrl}/api/v2/transactions/${txHash}`)
      const data = await res.json()
      if (data.message === "Not found" || data.message?.includes("Too many")) return null
      return data as BlockscoutTx
    } catch { return null }
  }

  const status = receipt?.status === "success" ? "success" : receipt?.status === "reverted" ? "failed" : bsTx?.status === "ok" ? "success" : bsTx?.status === "error" ? "failed" : tx ? "pending" : null
  const blockNumber = tx?.blockNumber ?? bsTx?.block ?? null
  const from = tx?.from ?? (bsTx?.from.hash as `0x${string}`) ?? ""
  const to = tx?.to ?? (bsTx?.to?.hash as `0x${string}`) ?? ""
  const value = tx?.value ?? BigInt(bsTx?.value ?? "0")
  const gasLimit = tx?.gas ?? BigInt(bsTx?.gas_limit ?? "0")
  const gasUsed = receipt?.gasUsed ?? BigInt(bsTx?.gas_used ?? "0")
  const gasPrice = tx?.gasPrice ?? BigInt(bsTx?.gas_price ?? "0")
  const nonce = tx?.nonce ?? bsTx?.nonce ?? 0
  const fee = gasUsed * gasPrice
  const timestamp = bsTx?.timestamp ? new Date(bsTx.timestamp).toLocaleString() : receipt?.blockNumber ? "Confirmed" : tx ? "Pending" : ""

  if (isLoading) {
    return (
      <div>
        <ViewHeader title="Transaction Details" showBack />
        <div className="flex items-center justify-center pt-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || (!tx && !bsTx)) {
    return (
      <div>
        <ViewHeader title="Transaction Details" showBack />
        <div className="flex flex-col items-center gap-4 px-4 pt-20 text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-error" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Transaction not found</h2>
          <p className="text-sm text-neutral-500 break-all font-mono">{hash}</p>
          <Button label="Go Back" variant="secondary" onClick={() => navigate(-1)} />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300">
      <ViewHeader title="Transaction Details" showBack />

      <div className="flex flex-col gap-3 px-4 pt-2">

        {/* Status badge */}
        <div className={`p-4 rounded-xl text-center ${
          status === "success" ? "bg-success/10" :
          status === "failed" ? "bg-error/10" : "bg-warn/10"
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
            status === "success" ? "bg-success/20" :
            status === "failed" ? "bg-error/20" : "bg-warn/20"
          }`}>
            {status === "success" ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-success" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : status === "failed" ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-error" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-warn" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </div>
          <div className={`text-lg font-bold capitalize ${
            status === "success" ? "text-success" :
            status === "failed" ? "text-error" : "text-warn"
          }`}>
            {status === "pending" ? "Pending" : status}
          </div>
          {timestamp && <p className="text-xs text-neutral-500 mt-1">{timestamp}</p>}
        </div>

        {/* Value */}
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatEther(value)} RBTC</p>
            <p className="text-xs text-neutral-500 mt-1">Value</p>
          </div>
        </Card>

        {/* Details */}
        <Card className="p-4">
          <div className="space-y-3 text-sm">
            <Row label="Transaction Hash" value={hash ?? ""} mono />
            <Row label="Status" value={status === "pending" ? "Pending" : status === "success" ? "Success" : "Failed"} />
            {blockNumber && <Row label="Block" value={`#${blockNumber.toString()}`} />}
            <Row label="From" value={from} mono />
            {to && <Row label="To" value={to} mono />}
            {nonce > 0 && <Row label="Nonce" value={nonce.toString()} />}
            <Row label="Gas Limit" value={gasLimit.toString()} mono />
            <Row label="Gas Used" value={gasUsed.toString()} mono />
            <Row label="Gas Price" value={`${formatEther(gasPrice)} RBTC`} mono />
            <Row label="Network Fee" value={`${formatEther(fee)} RBTC`} mono />
          </div>
        </Card>

        {/* Timestamp from RPC block */}
        {blockNumber && !bsTx?.timestamp && (
          <p className="text-xs text-neutral-400 text-center pb-4">
            Block #{blockNumber.toString()}
          </p>
        )}

      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-neutral-500 shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  )
}
