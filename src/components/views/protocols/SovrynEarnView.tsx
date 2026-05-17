import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router"
import { formatEther, parseEther } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import WeiDisplay from "@/atoms/WeiDisplay"
import { selectWalletAddress, selectWalletBalance } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import SovrynService from "@/rsk/SovrynService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { XUSD, IXUSD, IRBTC } from "@/rsk/addresses"

type PoolType = "xusd" | "rbtc"

export default function SovrynEarnView() {
  const navigate = useNavigate()
  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)
  const rbtcBalance = useSelector(selectWalletBalance)

  const [pool, setPool] = useState<PoolType>("xusd")
  const [xusdBalance, setXusdBalance] = useState<bigint>(0n)
  const [iTokenBal, setITokenBal] = useState<bigint>(0n)
  const [assetBal, setAssetBal] = useState<bigint>(0n)
  const [tokenPrice, setTokenPrice] = useState<bigint>(0n)
  const [supplyAmt, setSupplyAmt] = useState("")
  const [withdrawAmt, setWithdrawAmt] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")

  const sovryn = SovrynService(chainId)
  const xusd = XUSD[chainId] as `0x${string}` | undefined
  const ixusd = IXUSD[chainId] as `0x${string}` | undefined
  const irbtc = IRBTC[chainId] as `0x${string}` | undefined

  // Hoist above refresh so it's in scope for the dep array
  const isRbtcPool = pool === "rbtc"

  const refresh = useCallback(async () => {
    if (!address) return
    try {
      if (ixusd) {
        const [xBal, iBal, aBal, p] = await Promise.all([
          sovryn.getXusdBalance(address as `0x${string}`),
          sovryn.getITokenBalance(ixusd, address as `0x${string}`),
          sovryn.getAssetBalance(ixusd, address as `0x${string}`),
          sovryn.getTokenPrice(ixusd),
        ])
        setXusdBalance(xBal)
        if (!isRbtcPool) {
          setITokenBal(iBal)
          setAssetBal(aBal)
          setTokenPrice(p)
        }
      }
      if (irbtc && isRbtcPool) {
        const [iBal, aBal, p] = await Promise.all([
          sovryn.getITokenBalance(irbtc, address as `0x${string}`),
          sovryn.getAssetBalance(irbtc, address as `0x${string}`),
          sovryn.getTokenPrice(irbtc),
        ])
        setITokenBal(iBal)
        setAssetBal(aBal)
        setTokenPrice(p)
      }
    } catch {}
  }, [address, chainId, isRbtcPool])

  useEffect(() => { refresh() }, [refresh])

  const sourceBal = isRbtcPool ? BigInt(rbtcBalance) : xusdBalance
  const earningBal = assetBal
  const underlyingLabel = isRbtcPool ? "RBTC" : "XUSD"

  const isSupplyOk = supplyAmt && !isNaN(Number(supplyAmt)) && Number(supplyAmt) > 0
  const isLowSupply = isSupplyOk && parseEther(supplyAmt) > sourceBal
  const isWithdrawOk = withdrawAmt && !isNaN(Number(withdrawAmt)) && Number(withdrawAmt) > 0
  const isLowWithdraw = isWithdrawOk && parseEther(withdrawAmt) > earningBal

  const handleSupply = useCallback(async () => {
    if (!isSupplyOk || isLowSupply) return
    setIsBusy(true)
    setError("")
    try {
      const auth = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!auth) { NotificationService().error("Authorization required"); setIsBusy(false); return }

      const wei = parseEther(supplyAmt)
      let hash: `0x${string}`
      if (isRbtcPool) {
        hash = await sovryn.lendRbtc(wei)
      } else {
        const allowance = await sovryn.getAllowance(xusd!, ixusd!)
        if (allowance < wei) {
          NotificationService().info("Approving XUSD...")
          const approveHash = await sovryn.approveToken(xusd!, ixusd!, wei)
          await sovryn.waitForTransaction(approveHash)
          NotificationService().success("XUSD Approved!")
        }
        hash = await sovryn.lend(ixusd!, wei)
      }

      if (hash) { setTxHash(hash); NotificationService().success("Supply submitted!") }
      await refresh()
    } catch (e) { const err = classifyError(e); setError(err.message); NotificationService().error(err.message) }
    setIsBusy(false)
  }, [supplyAmt, isRbtcPool, xusd, ixusd, chainId])

  const handleWithdraw = useCallback(async () => {
    if (!isWithdrawOk || isLowWithdraw) return
    setIsBusy(true)
    setError("")
    try {
      const auth = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!auth) { NotificationService().error("Authorization required"); setIsBusy(false); return }

      const wei = parseEther(withdrawAmt)
      const hash = isRbtcPool
        ? await sovryn.withdrawRbtc(wei)
        : await sovryn.withdraw(ixusd!, wei)

      if (hash) { setTxHash(hash); NotificationService().success("Withdraw submitted!") }
      await refresh()
    } catch (e) { const err = classifyError(e); setError(err.message); NotificationService().error(err.message) }
    setIsBusy(false)
  }, [withdrawAmt, isRbtcPool, ixusd, chainId])

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title="Earn" showBack />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Transaction Submitted</h2>
          <p className="text-sm text-neutral-500 font-mono break-all">{txHash}</p>
          <button onClick={() => navigate(`/tx/${txHash}`)} className="text-primary text-sm font-semibold hover:underline">View on Explorer</button>
          <Button label="Back" variant="secondary" onClick={() => window.history.back()} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <ViewHeader title="Earn with Sovryn" subtitle="Supply to earn interest" showBack />
      <a href="https://sovryn.app/lending" target="_blank" rel="noopener noreferrer"
        className="mx-4 mb-1 block text-center text-xs text-primary font-semibold py-1.5 rounded-lg bg-primary/5 border border-primary/20">
        Margin trading, loans & staking on Sovryn dapp ↗
      </a>
      <div className="flex flex-col gap-4 px-4">

        {/* Pool selector */}
        <div className="flex gap-2">
          {(["xusd", "rbtc"] as PoolType[]).map(p => (
            <button key={p} onClick={() => { setPool(p); setError(""); }}
              className={`flex-1 p-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                pool === p ? "border-primary bg-primary/10 text-primary" : "border-neutral-300 dark:border-neutral-600 text-neutral-500"
              }`}>
              {p === "xusd" ? "XUSD Pool" : "RBTC Pool"}
            </button>
          ))}
        </div>

        {/* Position */}
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Your Position</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neutral-500 text-xs">Balance</span>
              <WeiDisplay wei={sourceBal} symbol={underlyingLabel} />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">{isRbtcPool ? "iRBTC" : "iXUSD"}</span>
              <WeiDisplay wei={iTokenBal} symbol={isRbtcPool ? "iRBTC" : "iXUSD"} />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">Earning</span>
              <WeiDisplay wei={assetBal} symbol={underlyingLabel} />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">{isRbtcPool ? "iRBTC" : "iXUSD"} Price</span>
              <WeiDisplay wei={tokenPrice} symbol={underlyingLabel} />
            </div>
          </div>
        </Card>

        {/* Supply */}
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Supply {underlyingLabel}</h2>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-neutral-500">Amount</label>
            <span className="text-xs text-neutral-400 font-mono">Bal: {formatEther(sourceBal)} {underlyingLabel}</span>
          </div>
          <input type="text" placeholder="0.00" value={supplyAmt} onChange={e => setSupplyAmt(e.target.value)}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono" />
          <button onClick={() => setSupplyAmt(formatEther(sourceBal))} className="text-xs text-primary font-semibold mt-1 mb-2">Max</button>
          {!isRbtcPool && supplyAmt && Number(supplyAmt) > 0 && (
            <p className="text-xs text-neutral-400 mb-2">First call: approve XUSD → iXUSD, then mint</p>
          )}
          {isRbtcPool && supplyAmt && Number(supplyAmt) > 0 && (
            <p className="text-xs text-neutral-400 mb-2">RBTC sent directly as msg.value</p>
          )}
          <Button label={isBusy ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Supplying...</span></div> : "Supply"} onClick={handleSupply}
            disabled={!isSupplyOk || isLowSupply || isBusy} fullWidth />
        </Card>

        {/* Withdraw */}
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Withdraw {underlyingLabel}</h2>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-neutral-500">Amount ({isRbtcPool ? "iRBTC" : "iXUSD"})</label>
            <span className="text-xs text-neutral-400 font-mono">Earning: {formatEther(assetBal)} {underlyingLabel}</span>
          </div>
          <input type="text" placeholder="0.00" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono" />
          <button onClick={() => setWithdrawAmt(formatEther(assetBal))} className="text-xs text-primary font-semibold mt-1 mb-2">Max</button>
          <Button label={isBusy ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Withdrawing...</span></div> : "Withdraw"} onClick={handleWithdraw}
            disabled={!isWithdrawOk || isLowWithdraw || isBusy} fullWidth />
        </Card>

        {error && <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>}
      </div>
    </div>
  )
}
