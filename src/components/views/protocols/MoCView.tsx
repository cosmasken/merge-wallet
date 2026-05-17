import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { useParams } from "react-router"
import { formatEther, parseEther } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import { selectWalletAddress, selectWalletBalance } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import MoCService from "@/rsk/MoCService"
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

export default function MoCView() {
  const { action: urlAction } = useParams<{ action: string }>()
  const action = VALID_ACTIONS[urlAction ?? ""] ?? "mintDoc"

  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)
  const balance = useSelector(selectWalletBalance)
  const [amount, setAmount] = useState("")
  const [btcPrice, setBtcPrice] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")

  const moc = MoCService(chainId)

  const a = ACTION_LABELS[action]
  const isRbtcIn = action === "mintDoc" || action === "mintBPro"
  const isOk = amount && !isNaN(Number(amount)) && Number(amount) > 0
  const isLow = isOk && parseEther(amount) > BigInt(balance)

  useEffect(() => {
    moc.getBtcPrice().then(p => setBtcPrice(p.toString())).catch(() => {})
  }, [chainId])

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
      NotificationService().success(`${a.btn} submitted!`)
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsBusy(false)
  }, [action, amount, isOk, isLow, chainId])

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title="Money On Chain" showBack />
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
      <ViewHeader title="Money On Chain" subtitle={a.subtitle} showBack />
      <div className="flex flex-col gap-4 px-4">

        <Card className="p-4">
          <h2 className="text-sm font-bold mb-1">{a.title}</h2>
          <p className="text-xs text-neutral-500 mb-3">{a.desc}</p>
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
          label={isBusy ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Processing...</span></div> : a.btn}
          onClick={handleSubmit}
          disabled={!isOk || isLow || isBusy}
          fullWidth
        />
      </div>
    </div>
  )
}
