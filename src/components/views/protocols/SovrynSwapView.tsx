import { useEffect, useState, useCallback, useMemo } from "react"
import { useSelector } from "react-redux"
import { useNavigate, useSearchParams } from "react-router"
import { formatEther, parseEther, erc20Abi } from "viem"

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
import { WRBTC, XUSD, SWAPS_EXTERNAL, getProtocolTokens } from "@/rsk/addresses"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1, 3, 5]
const RBTC_SENTINEL = "RBTC"

/** Token option shown in the dropdowns */
interface TokenOption {
  symbol: string
  address: `0x${string}` | null // null = native RBTC
  decimals: number
}

export default function SovrynSwapView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const address = useSelector(selectWalletAddress)
  const chainId = useSelector(selectChainId)
  const nativeBal = useSelector(selectWalletBalance)

  // ── Token lists ──────────────────────────────────────────────
  const tokenOptions = useMemo<TokenOption[]>(() => {
    const registry = getProtocolTokens(chainId)
    const erc20s: TokenOption[] = registry.map(t => ({
      symbol: t.symbol,
      address: t.address,
      decimals: t.decimals,
    }))
    return [{ symbol: RBTC_SENTINEL, address: null, decimals: 18 }, ...erc20s]
  }, [chainId])

  const defaultFrom = searchParams.get("from") || RBTC_SENTINEL
  const defaultTo = searchParams.get("to") || "XUSD"

  const [fromSymbol, setFromSymbol] = useState(defaultFrom)
  const [toSymbol, setToSymbol] = useState(defaultTo)
  const [amount, setAmount] = useState("")
  const [expectedReturn, setExpectedReturn] = useState<bigint | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [showSlippage, setShowSlippage] = useState(false)
  const [bypassSlippage, setBypassSlippage] = useState(false)
  const [tokenBalances, setTokenBalances] = useState<Record<string, bigint>>({})

  const sovryn = SovrynService(chainId)
  const wrbtc = WRBTC[chainId] as `0x${string}` | undefined

  const fromToken = tokenOptions.find(t => t.symbol === fromSymbol) ?? tokenOptions[0]
  const toToken = tokenOptions.find(t => t.symbol === toSymbol) ?? tokenOptions.find(t => t.symbol !== fromSymbol)!
  const toOptions = tokenOptions.filter(t => t.symbol !== fromSymbol)

  // ── Load ERC20 balances ──────────────────────────────────────
  useEffect(() => {
    if (!address) return
    const client = getPublicClientByChainId(chainId)
    const registry = getProtocolTokens(chainId)
    Promise.all(
      registry.map(t =>
        client.readContract({
          address: t.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }).then(b => ({ symbol: t.symbol, bal: b as bigint })).catch(() => ({ symbol: t.symbol, bal: 0n }))
      )
    ).then(results => {
      const map: Record<string, bigint> = {}
      results.forEach(r => { map[r.symbol] = r.bal })
      setTokenBalances(map)
    })
  }, [address, chainId])

  const sourceBalance: bigint = fromToken.address === null
    ? BigInt(nativeBal)
    : (tokenBalances[fromToken.symbol] ?? 0n)

  // ── Quote ────────────────────────────────────────────────────
  useEffect(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setExpectedReturn(null); return
    }
    if (!wrbtc) return

    setIsLoadingQuote(true)
    const timer = setTimeout(async () => {
      try {
        const srcAddr = fromToken.address ?? wrbtc  // RBTC uses WRBTC as path anchor
        const dstAddr = toToken.address!
        const path = await sovryn.resolveSwapPath(srcAddr, dstAddr)
        const rate = await sovryn.getRateByPath(path, parseEther(amount))
        setExpectedReturn(rate)
      } catch { setExpectedReturn(null) }
      setIsLoadingQuote(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [amount, fromSymbol, toSymbol, chainId])

  const isValidAmount = amount && !isNaN(Number(amount)) && Number(amount) > 0
  const isInsufficient = isValidAmount && parseEther(amount) > sourceBalance
  const minReturn = expectedReturn !== null
    ? (bypassSlippage ? 1n : expectedReturn - (expectedReturn * BigInt(Math.round(slippage * 100)) / 10000n))
    : 0n

  // ── Swap ─────────────────────────────────────────────────────
  const handleSwap = useCallback(async () => {
    if (!isValidAmount || isInsufficient || !wrbtc) return
    setIsSwapping(true)
    setError("")
    try {
      const authorized = await SecurityService().authorize(AuthActions.SendTransaction)
      if (!authorized) {
        NotificationService().error("Authorization required")
        setIsSwapping(false)
        return
      }

      const amountWei = parseEther(amount)
      const srcAddr = fromToken.address ?? wrbtc
      const dstAddr = toToken.address!
      const path = await sovryn.resolveSwapPath(srcAddr, dstAddr)

      let hash: `0x${string}`

      if (fromToken.address === null) {
        // Native RBTC → send value, path starts with WRBTC
        hash = await sovryn.convertByPath(path, amountWei, minReturn, amountWei)
      } else {
        // ERC20 source → approve spender (SwapsExternal) then convertByPath
        const swapsExternal = SWAPS_EXTERNAL[chainId] as `0x${string}` | undefined
        if (swapsExternal) {
          const allowance = await sovryn.getAllowance(fromToken.address, swapsExternal)
          if (allowance < amountWei) {
            NotificationService().info(`Approving ${fromToken.symbol}...`)
            const approveHash = await sovryn.approveToken(fromToken.address, swapsExternal, amountWei)
            await sovryn.waitForTransaction(approveHash)
            NotificationService().success(`${fromToken.symbol} Approved!`)
          }
        }
        hash = await sovryn.convertByPath(path, amountWei, minReturn, 0n)
      }

      setTxHash(hash)
      NotificationService().success("Swap submitted!")
    } catch (e) {
      const err = classifyError(e)
      setError(err.message)
      NotificationService().error(err.message)
    }
    setIsSwapping(false)
  }, [amount, fromToken, toToken, isValidAmount, isInsufficient, minReturn, chainId, wrbtc])

  const handleFromChange = (sym: string) => {
    setFromSymbol(sym)
    setExpectedReturn(null)
    setError("")
    // Avoid same-token pairs
    if (toSymbol === sym) {
      const alt = tokenOptions.find(t => t.symbol !== sym)
      if (alt) setToSymbol(alt.symbol)
    }
  }

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
          <button onClick={() => navigate(`/tx/${txHash}`)} className="text-primary text-sm font-semibold hover:underline">View on Explorer</button>
          <Button label="Back" variant="secondary" onClick={() => window.history.back()} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <ViewHeader title="Sovryn Swap" subtitle="Swap any token on Rootstock" showBack />
      <a href="https://sovryn.app" target="_blank" rel="noopener noreferrer"
        className="mx-4 mb-1 block text-center text-xs text-primary font-semibold py-1.5 rounded-lg bg-primary/5 border border-primary/20">
        Margin trading, loans &amp; staking on Sovryn dapp ↗
      </a>
      <div className="flex flex-col gap-4 px-4">
        {chainId === 31 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex flex-col gap-1.5 animate-in fade-in duration-300">
            <span className="font-bold flex items-center gap-1">⚠️ Rootstock Testnet Pool Warning</span>
            <span>
              Testnet liquidity pools on Sovryn are thin or dry. Swaps can easily fail with <strong>ERR_INVALID_AMOUNT</strong> or revert due to slippage.
            </span>
            <span className="mt-1">
              👉 <strong>Tip:</strong> Enable <strong>"Bypass slippage limit"</strong> below to allow swaps to go through even with high price impact.
            </span>
          </div>
        )}

        <Card className="p-4">

          {/* You pay */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-neutral-500">You pay</label>
              <span className="text-xs text-neutral-400 font-mono">
                Bal: {formatEther(sourceBalance)} {fromToken.symbol}
              </span>
            </div>
            <div className="flex gap-2">
              <select
                value={fromSymbol}
                onChange={e => handleFromChange(e.target.value)}
                className="flex-shrink-0 p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-semibold"
              >
                {tokenOptions.map(t => (
                  <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-lg font-mono"
              />
            </div>
            <button onClick={() => setAmount(formatEther(sourceBalance))} className="text-xs text-primary font-semibold mt-1">Max</button>
          </div>

          <div className="flex justify-center my-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>

          {/* You receive */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-neutral-500">You receive</label>
            </div>
            <div className="flex gap-2">
              <select
                value={toSymbol}
                onChange={e => { setToSymbol(e.target.value); setExpectedReturn(null) }}
                className="flex-shrink-0 p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-semibold"
              >
                {toOptions.map(t => (
                  <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                ))}
              </select>
              <div className="flex-1 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-lg font-mono text-neutral-400">
                {isLoadingQuote ? (
                  <div className="flex items-center gap-2"><LoadingSpinner size="sm" /><span className="text-sm">Fetching quote...</span></div>
                ) : expectedReturn !== null ? formatEther(expectedReturn) : "0.00"}
              </div>
            </div>
          </div>

          {expectedReturn !== null && isValidAmount && (
            <div className="mt-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-500">
              Rate: 1 {fromToken.symbol} ≈ {(Number(formatEther(expectedReturn)) / Number(amount)).toFixed(6)} {toToken.symbol}
              · Min received: {bypassSlippage ? "1 satoshi" : `${formatEther(minReturn)} ${toToken.symbol}`}
            </div>
          )}
        </Card>

        {/* Slippage */}
        <Card className="p-4">
          <button onClick={() => setShowSlippage(!showSlippage)}
            className="flex items-center justify-between w-full text-sm">
            <span className="font-bold">Slippage tolerance: {slippage}%</span>
            <svg viewBox="0 0 24 24" className={`w-4 h-4 text-neutral-400 transition-transform ${showSlippage ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showSlippage && (
            <div className="flex gap-2 mt-3">
              {SLIPPAGE_OPTIONS.map(s => (
                <button key={s} onClick={() => setSlippage(s)}
                  className={`flex-1 p-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                    slippage === s ? "border-primary bg-primary/10 text-primary" : "border-neutral-300 dark:border-neutral-600 text-neutral-500"
                  }`}>
                  {s}%
                </button>
              ))}
            </div>
          )}

          {chainId === 31 && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer p-2.5 rounded bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
              <input
                type="checkbox"
                checked={bypassSlippage}
                onChange={e => setBypassSlippage(e.target.checked)}
                className="rounded border-amber-500 text-amber-500 focus:ring-amber-500"
              />
              <span className="font-semibold">Bypass slippage limit (Set min return to 1 satoshi)</span>
            </label>
          )}
        </Card>

        {isInsufficient && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">Insufficient {fromToken.symbol} balance</p>
        )}

        {error && <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>}

        <Button
          label={isSwapping ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" color="white" /><span>Swapping...</span></div> : "Swap"}
          onClick={handleSwap}
          disabled={!isValidAmount || isInsufficient || isSwapping || !wrbtc}
          fullWidth
        />

        {!wrbtc && (
          <p className="text-xs text-neutral-400 text-center">Sovryn swaps not available on this network</p>
        )}
      </div>
    </div>
  )
}
