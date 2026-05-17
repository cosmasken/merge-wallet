import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { useParams, useNavigate } from "react-router"
import { formatEther, formatUnits } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import { selectWalletAddress, selectWalletBalance } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import TropykusService from "@/rsk/TropykusService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { buildTxUrl } from "@/util/networks"

type Tab = "lend" | "borrow"
type Asset = "kRBTC" | "kDOC" | "kBPRO" | "kUSDRIF"

const ASSET_META: Record<Asset, { label: string; decimals: number; isRbtc: boolean }> = {
  kRBTC: { label: "RBTC", decimals: 8, isRbtc: true },
  kDOC: { label: "DOC", decimals: 8, isRbtc: false },
  kBPRO: { label: "BPro", decimals: 8, isRbtc: false },
  kUSDRIF: { label: "USDRIF", decimals: 8, isRbtc: false },
}

const VALID_ACTIONS: Record<string, Tab> = {
  lend: "lend",
  borrow: "borrow",
}

const PILL_ORDER: { slug: string; label: string; action: Tab }[] = [
  { slug: "lend", label: "Lend", action: "lend" },
  { slug: "borrow", label: "Borrow", action: "borrow" },
]

export default function TropykusView() {
  const navigate = useNavigate()
  const { action } = useParams<{ action: string }>()
  const tab = VALID_ACTIONS[action ?? ""] ?? "lend"
  const isLend = tab === "lend"

  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)
  const balance = useSelector(selectWalletBalance)

  const [asset, setAsset] = useState<Asset>("kRBTC")
  const [amount, setAmount] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")
  const [cBalances, setCBalances] = useState<Record<string, bigint>>({})
  const [rates, setRates] = useState<Record<string, bigint>>({})

  const tropykus = TropykusService(chainId)
  const meta = ASSET_META[asset]
  const isOk = amount && !isNaN(Number(amount)) && Number(amount) > 0

  const refresh = useCallback(async () => {
    if (!address) return
    const results: Record<string, bigint> = {}
    const rateResults: Record<string, bigint> = {}
    for (const [key, m] of Object.entries(ASSET_META)) {
      try {
        const [bal, rate] = await Promise.all([
          tropykus.getSupplyBalance(key, address as `0x${string}`),
          tropykus.getExchangeRate(key),
        ])
        results[key] = bal
        rateResults[key] = rate
      } catch {}
    }
    setCBalances(results)
    setRates(rateResults)
  }, [address, chainId])

  useEffect(() => { refresh() }, [refresh])

  const handleSubmit = useCallback(async () => {
    if (!isOk) return
    setIsBusy(true)
    setError("")
    try {
      const auth = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!auth) { NotificationService().error("Authorization required"); setIsBusy(false); return }

      const hash = isLend
        ? await tropykus.supply(asset, amount)
        : await tropykus.borrow(asset, amount)

      setTxHash(hash)
      NotificationService().success(`${isLend ? "Lend" : "Borrow"} submitted!`)
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsBusy(false)
  }, [tab, asset, amount, isOk, chainId])

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title="Tropykus" showBack />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Transaction Submitted</h2>
          <p className="text-sm text-neutral-500 font-mono break-all">{txHash}</p>
          <a href={buildTxUrl(chainId, txHash)} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">View on Explorer</a>
          <Button label="Back" variant="secondary" onClick={() => window.history.back()} />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <ViewHeader title="Tropykus" subtitle={isLend ? "Lend your assets and earn interest" : "Borrow against your supplied assets"} showBack />
      <div className="flex flex-col gap-4 px-4">

        {/* Pill nav */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PILL_ORDER.map(p => (
            <button key={p.slug} onClick={() => navigate(`/protocols/tropykus/${p.slug}`)}
              className={`shrink-0 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-colors ${
                tab === p.action
                  ? "border-primary bg-primary text-white"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Market cards */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ASSET_META) as [Asset, typeof meta][]).map(([key, m]) => (
            <button key={key} onClick={() => setAsset(key)}
              className={`flex-1 min-w-[80px] p-2 rounded-lg border-2 text-center transition-colors ${
                asset === key ? "border-primary bg-primary/5" : "border-neutral-200 dark:border-neutral-700"
              }`}>
              <div className="text-xs font-bold">{m.label}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                {cBalances[key] !== undefined ? formatUnits(cBalances[key], m.decimals) : "…"}
              </div>
              {rates[key] !== undefined && (
                <div className="text-[9px] text-neutral-400">rate: {(Number(rates[key]) / 1e18).toFixed(4)}</div>
              )}
            </button>
          ))}
        </div>

        {/* Balances summary */}
        <Card className="p-3">
          <div className="text-xs text-neutral-500">
            {isLend
              ? `Supplied: ${formatUnits(cBalances[asset] ?? 0n, meta.decimals)} ${meta.label}`
              : `Collateral: ${formatUnits(cBalances[asset] ?? 0n, meta.decimals)} ${meta.label}`}
            {meta.isRbtc && (
              <span className="ml-2">· RBTC wallet: {formatEther(BigInt(balance))}</span>
            )}
          </div>
        </Card>

        {/* Action */}
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-1">{isLend ? `Lend ${meta.label}` : `Borrow ${meta.label}`}</h2>
          <p className="text-xs text-neutral-500 mb-3">
            {isLend
              ? `Earn interest by supplying ${meta.label} to the Tropykus lending pool. ${meta.isRbtc ? "RBTC is sent directly." : "You must approve the token first."}`
              : `Take out a loan in ${meta.label} using your supplied assets as collateral. Requires an existing supply position.`}
          </p>

          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-neutral-500">{isLend ? `${meta.label} amount` : `${meta.label} to borrow`}</label>
          </div>
          <input type="text" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono" />
          {meta.isRbtc && isLend && (
            <button onClick={() => setAmount(formatEther(BigInt(balance)))} className="text-xs text-primary font-semibold mt-1">Max</button>
          )}
          {!meta.isRbtc && isLend && (
            <p className="text-xs text-neutral-400 mt-1">⚠️ You must approve {meta.label} before lending. The wallet will prompt you.</p>
          )}
        </Card>

        {error && <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>}

        <Button
          label={isBusy ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Processing...</span></div> : isLend ? `Lend ${meta.label}` : `Borrow ${meta.label}`}
          onClick={handleSubmit}
          disabled={!isOk || isBusy}
          fullWidth
        />
      </div>
    </div>
  )
}
