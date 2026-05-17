import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router"
import { formatEther, parseEther } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import WeiDisplay from "@/atoms/WeiDisplay"
import { selectWalletAddress, selectWalletBalance, selectActiveAddress, selectUseSmartWallet, selectSmartWalletAddress } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import SovrynService from "@/rsk/SovrynService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { XUSD, IXUSD, IRBTC } from "@/rsk/addresses"

type PoolType = "xusd" | "rbtc"

export default function SovrynEarnView() {
  const navigate = useNavigate()
  const address = useSelector(selectActiveAddress)
  const useSmartWallet = useSelector(selectUseSmartWallet)
  const smartWalletAddress = useSelector(selectSmartWalletAddress)
  const chainId = useSelector(selectChainId)
  const rbtcBalance = useSelector(selectWalletBalance)

  const [pool, setPool] = useState<PoolType>("xusd")
  const [xusdBalance, setXusdBalance] = useState<bigint>(0n)
  
  // XUSD Pool Metrics
  const [xusdiTokenBal, setXusdiTokenBal] = useState<bigint>(0n)
  const [xusdAssetBal, setXusdAssetBal] = useState<bigint>(0n)
  const [xusdTokenPrice, setXusdTokenPrice] = useState<bigint>(0n)

  // RBTC Pool Metrics
  const [rbtciTokenBal, setRbtciTokenBal] = useState<bigint>(0n)
  const [rbtcAssetBal, setRbtcAssetBal] = useState<bigint>(0n)
  const [rbtcTokenPrice, setRbtcTokenPrice] = useState<bigint>(0n)

  const [supplyAmt, setSupplyAmt] = useState("")
  const [withdrawAmt, setWithdrawAmt] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")

  const sovryn = SovrynService(chainId, useSmartWallet, smartWalletAddress)
  const xusd = XUSD[chainId] as `0x${string}` | undefined
  const ixusd = IXUSD[chainId] as `0x${string}` | undefined
  const irbtc = IRBTC[chainId] as `0x${string}` | undefined

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
        setXusdiTokenBal(iBal)
        setXusdAssetBal(aBal)
        setXusdTokenPrice(p)
      }
      if (irbtc) {
        const [iBal, aBal, p] = await Promise.all([
          sovryn.getITokenBalance(irbtc, address as `0x${string}`),
          sovryn.getAssetBalance(irbtc, address as `0x${string}`),
          sovryn.getTokenPrice(irbtc),
        ])
        setRbtciTokenBal(iBal)
        setRbtcAssetBal(aBal)
        setRbtcTokenPrice(p)
      }
    } catch {}
  }, [address, chainId])

  useEffect(() => { refresh() }, [refresh])

  const sourceBal = isRbtcPool ? BigInt(rbtcBalance) : xusdBalance
  const iTokenBal = isRbtcPool ? rbtciTokenBal : xusdiTokenBal
  const assetBal = isRbtcPool ? rbtcAssetBal : xusdAssetBal
  const tokenPrice = isRbtcPool ? rbtcTokenPrice : xusdTokenPrice
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

        {/* Pool Selector Cards */}
        <div className="grid grid-cols-2 gap-3.5 mb-2 animate-in fade-in duration-300">
          {/* XUSD Pool Card */}
          <div
            onClick={() => {
              setSupplyAmt("");
              setWithdrawAmt("");
              setPool("xusd");
              setError("");
            }}
            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-36 ${
              pool === "xusd"
                ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(235,16,112,0.06)] ring-1 ring-primary/30"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm"
            }`}
          >
            {/* Top Row: Symbol & APY */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xl font-bold font-display text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  XUSD
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                </span>
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold block mt-0.5">
                  Stablecoin Pool
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  ~4.5% APY
                </span>
              </div>
            </div>

            {/* Bottom Row: Earning Position */}
            <div className="pt-2 border-t border-neutral-100/50 dark:border-neutral-800/50">
              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block">
                Supplied Position
              </span>
              <span className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-200 mt-0.5 block truncate">
                <WeiDisplay wei={xusdAssetBal} symbol="XUSD" />
              </span>
            </div>

            {/* Active Glow Accent */}
            {pool === "xusd" && (
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mb-8 pointer-events-none" />
            )}
          </div>

          {/* RBTC Pool Card */}
          <div
            onClick={() => {
              setSupplyAmt("");
              setWithdrawAmt("");
              setPool("rbtc");
              setError("");
            }}
            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-36 ${
              pool === "rbtc"
                ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(235,16,112,0.06)] ring-1 ring-primary/30"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm"
            }`}
          >
            {/* Top Row: Symbol & APY */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xl font-bold font-display text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  RBTC
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                </span>
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-semibold block mt-0.5">
                  Rootstock BTC Pool
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  ~2.8% APY
                </span>
              </div>
            </div>

            {/* Bottom Row: Earning Position */}
            <div className="pt-2 border-t border-neutral-100/50 dark:border-neutral-800/50">
              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block">
                Supplied Position
              </span>
              <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5 block truncate">
                <WeiDisplay wei={rbtcAssetBal} symbol="RBTC" />
              </span>
            </div>

            {/* Active Glow Accent */}
            {pool === "rbtc" && (
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mb-8 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Position */}
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Your Position</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neutral-500 text-xs">Wallet Balance</span>
              <WeiDisplay wei={sourceBal} symbol={underlyingLabel} />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">Lent ({isRbtcPool ? "iRBTC" : "iXUSD"})</span>
              <WeiDisplay wei={iTokenBal} symbol={isRbtcPool ? "iRBTC" : "iXUSD"} />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">Redeemable Value</span>
              <WeiDisplay wei={assetBal} symbol={underlyingLabel} />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">{isRbtcPool ? "iRBTC" : "iXUSD"} Price</span>
              <WeiDisplay wei={tokenPrice} symbol={underlyingLabel} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400 leading-relaxed">
            💡 <strong>i{underlyingLabel}</strong> is your interest-bearing token representing your share of the pool. 
            The <strong>Redeemable Value</strong> shows the total underlying <strong>{underlyingLabel}</strong> you can withdraw right now. 
            As borrowers pay interest, the <strong>i{underlyingLabel} Price</strong> rises, meaning your earnings continuously compound!
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
