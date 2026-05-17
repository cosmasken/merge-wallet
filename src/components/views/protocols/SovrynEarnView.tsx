import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { formatEther, parseEther } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import WeiDisplay from "@/atoms/WeiDisplay"
import { selectWalletAddress } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import SovrynService from "@/rsk/SovrynService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { buildTxUrl } from "@/util/networks"
import { XUSD, IXUSD } from "@/rsk/addresses"

export default function SovrynEarnView() {
  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)

  const [xusdBalance, setXusdBalance] = useState<bigint>(0n)
  const [iTokenBalance, setITokenBalance] = useState<bigint>(0n)
  const [assetBalance, setAssetBalance] = useState<bigint>(0n)
  const [tokenPrice, setTokenPrice] = useState<bigint>(0n)
  const [supplyAmount, setSupplyAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")

  const sovryn = SovrynService(chainId)
  const xusd = XUSD[chainId] as `0x${string}` | undefined
  const ixusd = IXUSD[chainId] as `0x${string}` | undefined

  const refreshBalances = useCallback(async () => {
    if (!address || !xusd || !ixusd) return
    try {
      const [xBal, iBal, aBal, price] = await Promise.all([
        sovryn.getXusdBalance(address as `0x${string}`),
        sovryn.getITokenBalance(ixusd as `0x${string}`, address as `0x${string}`),
        sovryn.getAssetBalance(ixusd as `0x${string}`, address as `0x${string}`),
        sovryn.getTokenPrice(ixusd as `0x${string}`),
      ])
      setXusdBalance(xBal)
      setITokenBalance(iBal)
      setAssetBalance(aBal)
      setTokenPrice(price)
    } catch {}
  }, [address, chainId])

  useEffect(() => {
    refreshBalances()
  }, [refreshBalances])

  const isValidSupply = supplyAmount && !isNaN(Number(supplyAmount)) && Number(supplyAmount) > 0
  const isInsufficientSupply = isValidSupply && parseEther(supplyAmount) > xusdBalance
  const isValidWithdraw = withdrawAmount && !isNaN(Number(withdrawAmount)) && Number(withdrawAmount) > 0
  const isInsufficientWithdraw = isValidWithdraw && parseEther(withdrawAmount) > assetBalance

  const handleSupply = useCallback(async () => {
    if (!isValidSupply || isInsufficientSupply || !xusd || !ixusd) return
    setIsExecuting(true)
    setError("")

    try {
      const authorized = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!authorized) {
        NotificationService().error("Authorization required")
        setIsExecuting(false)
        return
      }

      const amountWei = parseEther(supplyAmount)

      // Check allowance
      const allowance = await sovryn.getAllowance(xusd, ixusd)
      if (allowance < amountWei) {
        await sovryn.approveToken(xusd, ixusd, amountWei)
      }

      const hash = await sovryn.lend(ixusd, amountWei)
      setTxHash(hash)
      NotificationService().success("Supply submitted!")
      await refreshBalances()
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsExecuting(false)
  }, [supplyAmount, isValidSupply, isInsufficientSupply, xusd, ixusd, chainId])

  const handleWithdraw = useCallback(async () => {
    if (!isValidWithdraw || isInsufficientWithdraw || !ixusd) return
    setIsExecuting(true)
    setError("")

    try {
      const authorized = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!authorized) {
        NotificationService().error("Authorization required")
        setIsExecuting(false)
        return
      }

      const amountWei = parseEther(withdrawAmount)
      const hash = await sovryn.withdraw(ixusd, amountWei)
      setTxHash(hash)
      NotificationService().success("Withdraw submitted!")
      await refreshBalances()
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsExecuting(false)
  }, [withdrawAmount, isValidWithdraw, isInsufficientWithdraw, ixusd, chainId])

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title="Earn XUSD" showBack />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Transaction Submitted</h2>
          <p className="text-sm text-neutral-500 font-mono break-all">{txHash}</p>
          <a
            href={buildTxUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm"
          >
            View on Explorer
          </a>
          <Button label="Back" variant="secondary" onClick={() => window.history.back()} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <ViewHeader title="Earn with Sovryn" subtitle="Supply XUSD to earn interest" showBack />
      <div className="flex flex-col gap-4 px-4">
        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Your Position</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neutral-500 text-xs">XUSD Balance</span>
              <WeiDisplay wei={xusdBalance} symbol="XUSD" />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">iXUSD Balance</span>
              <WeiDisplay wei={iTokenBalance} symbol="iXUSD" />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">XUSD Earning</span>
              <WeiDisplay wei={assetBalance} symbol="XUSD" />
            </div>
            <div>
              <span className="text-neutral-500 text-xs">iXUSD Price</span>
              <WeiDisplay wei={tokenPrice} symbol="XUSD" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Supply XUSD</h2>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-neutral-500">Amount</label>
            <span className="text-xs text-neutral-400 font-mono">Bal: {formatEther(xusdBalance)} XUSD</span>
          </div>
          <input
            type="text"
            placeholder="0.00"
            value={supplyAmount}
            onChange={(e) => setSupplyAmount(e.target.value)}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono"
          />
          <button
            onClick={() => setSupplyAmount(formatEther(xusdBalance))}
            className="text-xs text-primary font-semibold mt-1 mb-2"
          >
            Max
          </button>
          <Button
            label={isExecuting ? (
              <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Supplying...</span></div>
            ) : "Supply XUSD"}
            onClick={handleSupply}
            disabled={!isValidSupply || isInsufficientSupply || isExecuting}
            fullWidth
          />
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-bold mb-2">Withdraw XUSD</h2>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-neutral-500">iXUSD Amount</label>
            <span className="text-xs text-neutral-400 font-mono">Earning: {formatEther(assetBalance)} XUSD</span>
          </div>
          <input
            type="text"
            placeholder="0.00"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono"
          />
          <button
            onClick={() => setWithdrawAmount(formatEther(assetBalance))}
            className="text-xs text-primary font-semibold mt-1 mb-2"
          >
            Max
          </button>
          <Button
            label={isExecuting ? (
              <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Withdrawing...</span></div>
            ) : "Withdraw"}
            onClick={handleWithdraw}
            disabled={!isValidWithdraw || isInsufficientWithdraw || isExecuting}
            fullWidth
          />
        </Card>

        {error && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>
        )}
      </div>
    </div>
  )
}
