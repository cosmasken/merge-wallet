import { useEffect, useState, useCallback, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams, useNavigate } from "react-router"
import { formatEther, parseEther, encodeFunctionData, erc20Abi } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import WeiDisplay from "@/atoms/WeiDisplay"
import ProtocolConfirmation from "@/composite/ProtocolConfirmation"
import { selectWalletAddress, selectWalletBalance, selectPendingTransactions, addPendingTransaction } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import MoCService from "@/rsk/MoCService"
import { getProtocolTokens, MOC_CORE } from "@/rsk/addresses"
import { mocCoreAbi } from "@/rsk/abis/moc"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { useTranslation } from "@/translations"


type Action = "mintDoc" | "redeemDoc" | "mintBPro" | "redeemBPro"

const VALID_ACTIONS: Record<string, Action> = {
  "create-doc": "mintDoc",
  "redeem-doc": "redeemDoc",
  "buy-bpro": "mintBPro",
  "sell-bpro": "redeemBPro",
}

export default function MoCView() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { t } = useTranslation()
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
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [fee, setFee] = useState<bigint | null>(null)
  const [isLoadingFee, setIsLoadingFee] = useState(false)
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null)
  const [isLoadingOutput, setIsLoadingOutput] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")
  const redirecting = useRef(false)

  const moc = MoCService(chainId)
  const mocTokens = getProtocolTokens(chainId).filter(t => t.protocol === "moc")

  const PILL_ORDER: { slug: string; label: string; action: Action }[] = [
    { slug: "create-doc", label: t("protocols.moc.mintDoc_btn"), action: "mintDoc" },
    { slug: "redeem-doc", label: t("protocols.moc.redeemDoc_btn"), action: "redeemDoc" },
    { slug: "buy-bpro", label: t("protocols.moc.mintBPro_btn"), action: "mintBPro" },
    { slug: "sell-bpro", label: t("protocols.moc.redeemBPro_btn"), action: "redeemBPro" },
  ]

  const a = isOverview ? null : {
    title: t(`protocols.moc.${action}_title`),
    subtitle: t(`protocols.moc.${action}_subtitle`),
    btn: t(`protocols.moc.${action}_btn`),
    desc: t(`protocols.moc.${action}_desc`),
  }

  const isRbtcIn = action === "mintDoc" || action === "mintBPro"
  const isOk = amount && !isNaN(Number(amount)) && Number(amount) > 0
  
  const getActiveBalance = () => {
    if (isRbtcIn) return BigInt(balance)
    const symbol = action === "redeemDoc" ? "DOC" : "BPro"
    return mocBalances[symbol] ?? 0n
  }
  const activeBalance = getActiveBalance()
  const isLow = isOk && parseEther(amount) > activeBalance
  const isEmptyOverview = isOverview && mocTokens.every(t => !mocBalances[t.symbol] || mocBalances[t.symbol] === 0n)

  useEffect(() => {
    moc.getBtcPrice().then(p => setBtcPrice(p.toString())).catch(() => {})
  }, [chainId])

  useEffect(() => {
    if (!address) return
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
  }, [address, chainId])

  const handleSubmit = useCallback(async () => {
    if (!isOk || isLow) return
    setShowConfirmation(true)
  }, [isOk, isLow])

  const executeTransaction = useCallback(async () => {
    setShowConfirmation(false)
    setIsBusy(true)
    setError("")
    try {
      const authorized = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!authorized) { NotificationService().error("Authorization required"); setIsBusy(false); return }

      const amountWei = parseEther(amount)

      // Handle token approvals for redemptions
      if (action === "redeemDoc" && moc.doc) {
        setError("Checking DOC allowance...")
        const allowance = await moc.getAllowance(moc.doc, moc.mocCore)
        if (allowance < amountWei) {
          setError("Approving DOC spending...")
          await moc.approveToken(moc.doc, moc.mocCore, amountWei)
        }
      } else if (action === "redeemBPro" && moc.bpro) {
        setError("Checking BPro allowance...")
        const allowance = await moc.getAllowance(moc.bpro, moc.mocCore)
        if (allowance < amountWei) {
          setError("Approving BPro spending...")
          await moc.approveToken(moc.bpro, moc.mocCore, amountWei)
        }
      }
      setError("")

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
  }, [action, amount, chainId, moc])

  const abiActionName: Record<string, string> = {
    mintDoc: "mintDoc",
    redeemDoc: "redeemFreeDoc",
    mintBPro: "mintBPro",
    redeemBPro: "redeemBPro",
  }

  useEffect(() => {
    if (!showConfirmation || !amount || !address) { setFee(null); return }
    setIsLoadingFee(true)
    const client = getPublicClientByChainId(chainId)
    const mocCore = MOC_CORE[chainId] as `0x${string}`
    const wei = isRbtcIn ? parseEther(amount) : 0n
    const valueWithBuffer = isRbtcIn ? wei * 1005n / 1000n : 0n
    const fnName = abiActionName[action]
    const data = fnName ? encodeFunctionData({ abi: mocCoreAbi, functionName: fnName as any, args: [parseEther(amount)] }) : undefined

    Promise.all([
      client.estimateGas({ to: mocCore, value: isRbtcIn ? valueWithBuffer : wei, data, account: address as `0x${string}` }).catch(() => undefined),
      client.getGasPrice().catch(() => undefined),
    ]).then(([gas, gasPrice]) => {
      if (gas && gasPrice) {
        setFee(gas * gasPrice)
      } else if (gasPrice) {
        setFee(gasPrice * 200000n)
      }
      setIsLoadingFee(false)
    })
  }, [showConfirmation, action, amount, chainId, address, isRbtcIn])

  useEffect(() => {
    if (!showConfirmation || !amount) { setEstimatedOutput(null); return }
    setIsLoadingOutput(true)
    const estimate = async () => {
      try {
        let result: bigint
        if (action === "mintDoc") {
          result = await moc.estimateDocForBtc(amount)
        } else if (action === "redeemDoc") {
          result = await moc.estimateBtcForDoc(amount)
        } else if (action === "mintBPro") {
          const btcPrice = await moc.getBtcPrice().catch(() => null)
          const bproPrice = await moc.getBProPrice().catch(() => null)
          if (btcPrice && bproPrice) {
            result = parseEther(amount) * btcPrice / bproPrice
          } else { setIsLoadingOutput(false); return }
        } else {
          result = await moc.estimateBtcForBPro(amount)
        }
        setEstimatedOutput(formatEther(result))
      } catch { setEstimatedOutput(null) }
      setIsLoadingOutput(false)
    }
    estimate()
  }, [showConfirmation, action, amount, chainId])

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
              <p className="text-xs text-neutral-400">You can leave and check status in Settings → Transaction History</p>
              <Button label="Leave" variant="ghost" size="sm" onClick={() => navigate("/protocols/moc")} />
            </>
          )}
          <p className="text-xs text-neutral-400 font-mono break-all">{txHash}</p>
          <button onClick={() => navigate(`/tx/${txHash}`)} className="text-primary text-sm font-semibold hover:underline">View on Explorer</button>
        </div>
      </div>
    )
  }

  if (showConfirmation && a) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <ViewHeader title="Money On Chain" showBack onBack={() => setShowConfirmation(false)} />
        <ProtocolConfirmation
          title={a.title}
          description={a.desc}
          amount={amount}
          inputSymbol={isRbtcIn ? "RBTC" : a.title.includes("DOC") ? "DOC" : "BPro"}
          outputSymbol={isRbtcIn ? a.title.includes("DOC") ? "DOC" : "BPro" : "RBTC"}
          estimatedOutput={estimatedOutput}
          isLoadingOutput={isLoadingOutput}
          isLoadingFee={isLoadingFee}
          fee={fee ? formatEther(fee) : undefined}
          onConfirm={executeTransaction}
          onCancel={() => setShowConfirmation(false)}
        />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <ViewHeader title="Money On Chain" subtitle={isOverview ? "Mint and redeem RBTC-backed assets" : a!.subtitle} showBack />
      <div className="flex flex-col gap-4 px-4">

        {/* Pill nav */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {isOverview ? (
            PILL_ORDER.map(p => (
              <button key={p.slug} onClick={() => navigate(`/protocols/moc/${p.slug}`)}
                className="shrink-0 px-3.5 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-semibold hover:border-primary transition-colors">
                {p.label}
              </button>
            ))
          ) : (
            PILL_ORDER.filter(p => p.action === action).map(p => (
              <button key={p.slug} onClick={() => navigate("/protocols/moc")}
                className="px-3.5 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/20 transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {p.label}
              </button>
            ))
          )}
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
                <span className="text-xs text-neutral-400 font-mono">
                  {isRbtcIn ? "RBTC" : action === "redeemDoc" ? "DOC" : "BPro"} Bal: {formatEther(activeBalance)}
                </span>
              </div>
              <input type="text" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono" />
              <button onClick={() => setAmount(formatEther(activeBalance))} className="text-xs text-primary font-semibold mt-1">Max</button>
            </Card>

            {isLow && (
              <p className="text-error text-sm bg-error/10 p-3 rounded-lg">
                Insufficient {isRbtcIn ? "RBTC" : action === "redeemDoc" ? "DOC" : "BPro"} balance
              </p>
            )}
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
