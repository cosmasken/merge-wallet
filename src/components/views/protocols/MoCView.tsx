import { useEffect, useState, useCallback, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams, useNavigate } from "react-router"
import { formatEther, parseEther, erc20Abi } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import WeiDisplay from "@/atoms/WeiDisplay"
import { selectWalletAddress, selectWalletBalance, selectPendingTransactions, addPendingTransaction } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import MoCService from "@/rsk/MoCService"
import { getProtocolTokens } from "@/rsk/addresses"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { buildTxUrl } from "@/util/networks"

type Action = "mintDoc" | "redeemDoc" | "mintBPro" | "redeemBPro"

const VALID_ACTIONS: Record<string, Action> = {
  "create-doc": "mintDoc",
  "redeem-doc": "redeemDoc",
  "buy-bpro": "mintBPro",
  "sell-bpro": "redeemBPro",
}

const ACTION_LABELS: Record<Action, { title: string; subtitle: string; btn: string; desc: string }> = {
  mintDoc: {
    title: "Create DOC",
    subtitle: "Deposit RBTC → receive DOC stablecoin",
    btn: "Create DOC",
    desc: "Locks RBTC as collateral and mints DOC, a USD-pegged stablecoin. You can redeem DOC anytime to get your RBTC back.",
  },
  redeemDoc: {
    title: "Redeem DOC",
    subtitle: "Return DOC → receive RBTC back",
    btn: "Redeem DOC",
    desc: "Burn your DOC to release the underlying RBTC collateral. The price of DOC is always redeemable at $1.",
  },
  mintBPro: {
    title: "Buy BPro",
    subtitle: "Deposit RBTC → receive BPro",
    btn: "Buy BPro",
    desc: "BPro gives you leveraged exposure to Bitcoin price movements plus a share of protocol fees. It's a tokenized Bitcoin hashrate position.",
  },
  redeemBPro: {
    title: "Sell BPro",
    subtitle: "Return BPro → receive RBTC back",
    btn: "Sell BPro",
    desc: "Burn your BPro to release the underlying RBTC. The amount of RBTC you get depends on BPro's current redemption price.",
  },
}

const PILL_ORDER: { slug: string; label: string; action: Action }[] = [
  { slug: "create-doc", label: "Create DOC", action: "mintDoc" },
  { slug: "redeem-doc", label: "Redeem DOC", action: "redeemDoc" },
  { slug: "buy-bpro", label: "Buy BPro", action: "mintBPro" },
  { slug: "sell-bpro", label: "Sell BPro", action: "redeemBPro" },
]

export default function MoCView() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { action: urlAction } = useParams<{ action: string }>()
  const isOverview = !urlAction || !VALID_ACTIONS[urlAction]
  const action = isOverview ? "mintDoc" : VALID_ACTIONS[urlAction]

  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)
  const balance = useSelector(selectWalletBalance)
  const pendingTxs = useSelector(selectPendingTransactions)
  const [amount, setAmount] = useState("")
  const [btcPrice, setBtcPrice] = useState<string | null>(null)
  const [mocBalances, setMocBalances] = useState<Record<string, bigint>>({})
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")
  const redirecting = useRef(false)

  const moc = MoCService(chainId)
  const mocTokens = getProtocolTokens(chainId).filter(t => t.protocol === "moc")

  const a = isOverview ? null : ACTION_LABELS[action]
  const isRbtcIn = action === "mintDoc" || action === "mintBPro"
  const isOk = amount && !isNaN(Number(amount)) && Number(amount) > 0
  const isLow = isOk && parseEther(amount) > BigInt(balance)
  const isEmptyOverview = isOverview && mocTokens.every(t => !mocBalances[t.symbol] || mocBalances[t.symbol] === 0n)

  useEffect(() => {
    moc.getBtcPrice().then(p => setBtcPrice(p.toString())).catch(() => {})
  }, [chainId])

  useEffect(() => {
    if (!address || !isOverview) return
    const client = getPublicClientByChainId(chainId)
    Promise.all(mocTokens.map(async t => {
      try {
        const bal = await client.readContract({ address: t.address, abi: erc20Abi, functionName: "balanceOf", args: [address as `0x${string}`] }) as bigint
        return { symbol: t.symbol, balance: bal }
      } catch { return { symbol: t.symbol, balance: 0n } }
    })).then(results => {
      const map: Record<string, bigint> = {}
      results.forEach(r => { map[r.symbol] = r.balance })
      setMocBalances(map)
    })
  }, [address, chainId, isOverview])

  const handleSubmit = useCallback(async () => {
    if (!isOk || isLow) return
    setIsBusy(true)
    setError("")
    try {
      const auth = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!auth) { NotificationService().error("Authorization required"); setIsBusy(false); return }

      const hash = await ({
        mintDoc: () => moc.mintDoc(amount),
        redeemDoc: () => moc.redeemDoc(amount),
        mintBPro: () => moc.mintBPro(amount),
        redeemBPro: () => moc.redeemBPro(amount),
      })[action]()

      setTxHash(hash)
      dispatch(addPendingTransaction({
        hash,
        type: "contract",
        amount,
        symbol: action === "mintDoc" || action === "redeemDoc" ? "DOC" : "BPro",
        chainId,
      }))
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsBusy(false)
  }, [action, amount, isOk, isLow, chainId])

  const liveTx = txHash ? pendingTxs.find(t => t.hash === txHash) : undefined
  const txStatus = liveTx?.status

  useEffect(() => {
    if (txStatus === "success" && !redirecting.current) {
      redirecting.current = true
      const timer = setTimeout(() => {
        navigate(`/protocols/moc`, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [txStatus])

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title="Money On Chain" showBack />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          {txStatus === "success" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Transaction Confirmed</h2>
              <p className="text-sm text-neutral-500">Returning to overview...</p>
            </>
          ) : txStatus === "failed" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-error flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Transaction Failed</h2>
              <p className="text-sm text-neutral-500">The transaction was not confirmed</p>
              <Button label="Back" variant="secondary" onClick={() => { setTxHash(""); setError("") }} />
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-warn flex items-center justify-center animate-pulse">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Confirming Transaction</h2>
              <p className="text-sm text-neutral-500">Waiting for block confirmation...</p>
            </>
          )}
          <p className="text-xs text-neutral-400 font-mono break-all">{txHash}</p>
          <a href={buildTxUrl(chainId, txHash)} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">View on Explorer</a>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <ViewHeader title="Money On Chain" subtitle={isOverview ? "Mint and redeem RBTC-backed assets" : a!.subtitle} showBack />
      <div className="flex flex-col gap-4 px-4">

        {/* Pill nav */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PILL_ORDER.map(p => (
            <button key={p.slug} onClick={() => navigate(`/protocols/moc/${p.slug}`)}
              className={`shrink-0 px-3.5 py-2 rounded-full border-2 text-xs font-semibold transition-colors ${
                !isOverview && action === p.action
                  ? "border-primary bg-primary text-white"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {isOverview ? (
          <>
            {/* Portfolio overview */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  MoC
                </div>
                <div>
                  <h2 className="text-sm font-bold">Your Portfolio</h2>
                  {btcPrice && <span className="text-xs text-neutral-400">BTC ${(BigInt(btcPrice) / 10n ** 18n).toString()}</span>}
                </div>
              </div>

              {isEmptyOverview ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2v20M2 12h20" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-500">No assets yet</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Create DOC or Buy BPro to get started</p>
                  </div>
                  <Button label="Create DOC" size="sm" onClick={() => navigate("/protocols/moc/create-doc")} />
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-sm">
                  {mocTokens.map(t => (
                    <div key={t.symbol} className="flex justify-between items-center">
                      <span className="text-neutral-500">{t.symbol}</span>
                      <WeiDisplay wei={mocBalances[t.symbol] ?? 0n} symbol={t.symbol} decimals={t.decimals} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Button label="Create DOC" size="sm" variant="secondary" onClick={() => navigate("/protocols/moc/create-doc")} />
              <Button label="Redeem DOC" size="sm" variant="secondary" onClick={() => navigate("/protocols/moc/redeem-doc")} />
              <Button label="Buy BPro" size="sm" variant="secondary" onClick={() => navigate("/protocols/moc/buy-bpro")} />
              <Button label="Sell BPro" size="sm" variant="secondary" onClick={() => navigate("/protocols/moc/sell-bpro")} />
            </div>
          </>
        ) : (
          <>
            <Card className="p-4">
              <h2 className="text-sm font-bold mb-1">{a!.title}</h2>
              <p className="text-xs text-neutral-500 mb-3">{a!.desc}</p>
              {btcPrice && (
                <div className="text-xs text-neutral-400 mb-2">
                  BTC Price: ${(BigInt(btcPrice) / 10n ** 18n).toString()}
                </div>
              )}

              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-neutral-500">{isRbtcIn ? "RBTC amount" : `${action === "redeemDoc" ? "DOC" : "BPro"} amount`}</label>
                <span className="text-xs text-neutral-400 font-mono">RBTC bal: {formatEther(BigInt(balance))}</span>
              </div>
              <input type="text" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono" />
              {isRbtcIn && (
                <button onClick={() => setAmount(formatEther(BigInt(balance)))} className="text-xs text-primary font-semibold mt-1">Max</button>
              )}
            </Card>

            {isLow && <p className="text-error text-sm bg-error/10 p-3 rounded-lg">Insufficient RBTC balance</p>}
            {error && <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>}

            <Button
              label={isBusy ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Processing...</span></div> : a!.btn}
              onClick={handleSubmit}
              disabled={!isOk || isLow || isBusy}
              fullWidth
            />
          </>
        )}
      </div>
    </div>
  )
}
