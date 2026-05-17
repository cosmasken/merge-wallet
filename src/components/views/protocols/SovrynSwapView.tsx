import { useEffect, useState, useCallback } from "react"
import { useSelector } from "react-redux"
import { formatEther, parseEther } from "viem"

import ViewHeader from "@/layout/ViewHeader"
import Card from "@/atoms/Card"
import Button from "@/atoms/Button"
import LoadingSpinner from "@/atoms/LoadingSpinner"
import { selectWalletAddress, selectWalletBalance } from "@/redux/wallet"
import { selectChainId } from "@/redux/preferences"
import SovrynService from "@/rsk/SovrynService"
import { classifyError } from "@/kernel/evm/errors"
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService"
import NotificationService from "@/kernel/app/NotificationService"
import { buildTxUrl } from "@/util/networks"
import { XUSD, SOV, SOVRYN_PROTOCOL } from "@/rsk/addresses"

type SwapDirection = "rbtcToXusd" | "sovToXusd"

export default function SovrynSwapView() {
  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)
  const balance = useSelector(selectWalletBalance)

  const [direction, setDirection] = useState<SwapDirection>("rbtcToXusd")
  const [amount, setAmount] = useState("")
  const [expectedReturn, setExpectedReturn] = useState<bigint | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")
  const [sovBalance, setSovBalance] = useState<bigint>(0n)
  const [xusdBalance, setXusdBalance] = useState<bigint>(0n)

  const sovryn = SovrynService(chainId)

  const sourceSymbol = direction === "rbtcToXusd" ? "RBTC" : "SOV"
  const sourceBalance = direction === "rbtcToXusd" ? BigInt(balance) : sovBalance
  const destSymbol = "XUSD"

  const xusd = XUSD[chainId] as `0x${string}` | undefined
  const sov = SOV[chainId] as `0x${string}` | undefined

  useEffect(() => {
    if (!address || chainId !== 30) return
    sovryn.getXusdBalance(address as `0x${string}`).then(setXusdBalance).catch(() => {})
    sovryn.getSovBalance(address as `0x${string}`).then(setSovBalance).catch(() => {})
  }, [address, chainId])

  useEffect(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setExpectedReturn(null)
      return
    }
    setIsLoadingQuote(true)
    const timer = setTimeout(async () => {
      try {
        if (direction === "rbtcToXusd") {
          const ret = await sovryn.getExpectedXusdReturn(parseEther(amount))
          setExpectedReturn(ret)
        } else {
          // For SOV→XUSD, use getSwapExpectedReturn on protocol
          const { getPublicClientByChainId } = await import("@/kernel/evm/ClientService")
          const client = getPublicClientByChainId(chainId)
          const { sovrynProtocolAbi } = await import("@/rsk/abis/sovryn")
          const ret = await client.readContract({
            address: SOVRYN_PROTOCOL[chainId] as `0x${string}`,
            abi: sovrynProtocolAbi,
            functionName: "getSwapExpectedReturn",
            args: [sov!, xusd!, parseEther(amount)],
          }) as bigint
          setExpectedReturn(ret)
        }
      } catch {
        setExpectedReturn(null)
      }
      setIsLoadingQuote(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [amount, direction, chainId])

  const isValidAmount = amount && !isNaN(Number(amount)) && Number(amount) > 0
  const isInsufficient = isValidAmount && parseEther(amount) > sourceBalance

  const handleSwap = useCallback(async () => {
    if (!isValidAmount || isInsufficient) return
    setIsSwapping(true)
    setError("")

    try {
      const authorized = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!authorized) {
        NotificationService().error("Authorization required")
        setIsSwapping(false)
        return
      }

      const hash = direction === "rbtcToXusd"
        ? await sovryn.swapRbtcToXusd(amount, 0n)
        : await sovryn.swapSovToXusd(amount, 0n)

      setTxHash(hash)
      NotificationService().success("Swap submitted!")
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsSwapping(false)
  }, [amount, direction, isValidAmount, isInsufficient, chainId])

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title="Swap" showBack />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Swap Submitted</h2>
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
      <ViewHeader title="Sovryn Swap" subtitle="RBTC / SOV → XUSD" showBack />
      <div className="flex flex-col gap-4 px-4">
        <Card className="p-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setDirection("rbtcToXusd"); setExpectedReturn(null); }}
              className={`flex-1 p-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                direction === "rbtcToXusd"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-500"
              }`}
            >
              RBTC → XUSD
            </button>
            <button
              onClick={() => { setDirection("sovToXusd"); setExpectedReturn(null); }}
              className={`flex-1 p-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                direction === "sovToXusd"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-500"
              }`}
            >
              SOV → XUSD
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-neutral-500">You pay ({sourceSymbol})</label>
              <span className="text-xs text-neutral-400 font-mono">
                Balance: {formatEther(sourceBalance)} {sourceSymbol}
              </span>
            </div>
            <input
              type="text"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono"
            />
            <button
              onClick={() => setAmount(formatEther(sourceBalance))}
              className="text-xs text-primary font-semibold mt-1"
            >
              Max
            </button>
          </div>

          <div className="flex justify-center my-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-neutral-500">You receive ({destSymbol})</label>
              <span className="text-xs text-neutral-400 font-mono">
                Balance: {formatEther(xusdBalance)} {destSymbol}
              </span>
            </div>
            <div className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-lg font-mono text-neutral-400">
              {isLoadingQuote ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">Fetching quote...</span>
                </div>
              ) : expectedReturn !== null ? (
                formatEther(expectedReturn)
              ) : (
                "0.00"
              )}
            </div>
          </div>

          {expectedReturn !== null && isValidAmount && (
            <div className="mt-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-500">
              Rate: 1 {sourceSymbol} ≈ {Number(formatEther(expectedReturn)) / Number(amount) > 0
                ? (Number(formatEther(expectedReturn)) / Number(amount)).toFixed(6)
                : "..."} {destSymbol}
            </div>
          )}
        </Card>

        {isInsufficient && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">
            Insufficient {sourceSymbol} balance
          </p>
        )}

        {error && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>
        )}

        <Button
          label={isSwapping ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" color="white" />
              <span>Swapping...</span>
            </div>
          ) : "Swap"}
          onClick={handleSwap}
          disabled={!isValidAmount || isInsufficient || isSwapping}
          fullWidth
        />
      </div>
    </div>
  )
}
