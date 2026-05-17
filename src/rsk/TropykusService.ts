import { parseUnits, getAddress, encodeFunctionData, erc20Abi } from "viem"
import { getPublicClientByChainId } from "@/kernel/evm/ClientService"
import TransactionManagerService from "@/kernel/evm/TransactionManagerService"
import { TRO_COMPTROLLER, kRBTC, kDOC, kBPRO, kUSDRIF } from "./addresses"
import { cTokenAbi, comptrollerAbi } from "./abis/tropykus"

interface MarketInfo {
  address: `0x${string}`
  symbol: string
  decimals: number
}

function getMarkets(chainId: number): Record<string, MarketInfo> {
  const krbtc = kRBTC[chainId] as `0x${string}` | undefined
  if (!krbtc) return {}
  return {
    kRBTC: { address: krbtc, symbol: 'kRBTC', decimals: 8 },
    kDOC: { address: kDOC[chainId] as `0x${string}`, symbol: 'kDOC', decimals: 8 },
    kBPRO: { address: kBPRO[chainId] as `0x${string}`, symbol: 'kBPRO', decimals: 8 },
    kUSDRIF: { address: kUSDRIF[chainId] as `0x${string}`, symbol: 'kUSDRIF', decimals: 8 },
  }
}

export default function TropykusService(chainId: number) {
  const publicClient = getPublicClientByChainId(chainId)
  const txManager = TransactionManagerService(chainId)
  const comptroller = TRO_COMPTROLLER[chainId] as `0x${string}` | undefined
  const markets = getMarkets(chainId)

  function requireAvailable() {
    if (!comptroller) throw new Error(`Tropykus not available on chain ${chainId}`)
  }

  async function getSupplyBalance(marketSymbol: string, address: `0x${string}`): Promise<bigint> {
    requireAvailable()
    const market = markets[marketSymbol]
    if (!market) throw new Error(`Unknown market: ${marketSymbol}`)
    return publicClient.readContract({
      address: market.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(address)],
    }) as Promise<bigint>
  }

  async function getExchangeRate(marketSymbol: string): Promise<bigint> {
    requireAvailable()
    const market = markets[marketSymbol]
    if (!market) throw new Error(`Unknown market: ${marketSymbol}`)
    return publicClient.readContract({
      address: market.address,
      abi: cTokenAbi,
      functionName: "exchangeRateStored",
    }) as Promise<bigint>
  }

  async function getUnderlyingBalance(marketSymbol: string, address: `0x${string}`): Promise<bigint> {
    const [cBal, rate] = await Promise.all([
      getSupplyBalance(marketSymbol, address),
      getExchangeRate(marketSymbol),
    ])
    return cBal * rate / 10n ** 18n
  }

  async function enterMarkets(marketSymbols: string[]): Promise<void> {
    requireAvailable()
    const marketAddrs = marketSymbols.map(s => {
      const m = markets[s]
      if (!m) throw new Error(`Unknown market: ${s}`)
      return m.address
    })
    const data = encodeFunctionData({
      abi: comptrollerAbi,
      functionName: "enterMarkets",
      args: [marketAddrs],
    })
    await txManager.sendContractTransaction(comptroller!, 0n, data)
  }

  async function supply(marketSymbol: string, amount: string): Promise<`0x${string}`> {
    requireAvailable()
    const market = markets[marketSymbol]
    if (!market) throw new Error(`Unknown market: ${marketSymbol}`)
    const wei = parseUnits(amount, market.decimals)
    const data = encodeFunctionData({
      abi: cTokenAbi,
      functionName: "mint",
      args: [wei],
    })
    const isRbtc = marketSymbol === 'kRBTC'
    const { hash } = await txManager.sendContractTransaction(market.address, isRbtc ? wei : 0n, data)
    return hash
  }

  async function withdraw(marketSymbol: string, amount: string): Promise<`0x${string}`> {
    requireAvailable()
    const market = markets[marketSymbol]
    if (!market) throw new Error(`Unknown market: ${marketSymbol}`)
    const wei = parseUnits(amount, market.decimals)
    const data = encodeFunctionData({
      abi: cTokenAbi,
      functionName: "redeem",
      args: [wei],
    })
    const { hash } = await txManager.sendContractTransaction(market.address, 0n, data)
    return hash
  }

  async function borrow(marketSymbol: string, amount: string): Promise<`0x${string}`> {
    requireAvailable()
    const market = markets[marketSymbol]
    if (!market) throw new Error(`Unknown market: ${marketSymbol}`)
    const wei = parseUnits(amount, 18)
    const data = encodeFunctionData({
      abi: cTokenAbi,
      functionName: "borrow",
      args: [wei],
    })
    const { hash } = await txManager.sendContractTransaction(market.address, 0n, data)
    return hash
  }

  async function repay(marketSymbol: string, amount: string): Promise<`0x${string}`> {
    requireAvailable()
    const market = markets[marketSymbol]
    if (!market) throw new Error(`Unknown market: ${marketSymbol}`)
    const wei = parseUnits(amount, 18)
    const data = encodeFunctionData({
      abi: cTokenAbi,
      functionName: "repayBorrow",
      args: [wei],
    })
    const { hash } = await txManager.sendContractTransaction(market.address, 0n, data)
    return hash
  }

  return {
    getSupplyBalance,
    getExchangeRate,
    getUnderlyingBalance,
    enterMarkets,
    supply,
    withdraw,
    borrow,
    repay,
  }
}
