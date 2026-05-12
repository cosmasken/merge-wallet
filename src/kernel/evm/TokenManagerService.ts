import { erc20Abi } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

export interface TokenBalance {
  address: `0x${string}`
  symbol: string
  decimals: number
  balance: bigint
}

export interface TokenInfo {
  address: `0x${string}`
  symbol: string
  decimals: number
}

const TOKEN_MAP: Record<string, { mainnet: string; testnet: string; symbol: string; decimals: number }> = {
  RIF: {
    mainnet: "0x2acc95758f8b5f583470bA265E685CF8e3f4283b",
    testnet: "0x19F64674D8A5B4E652319F5e239eFd3bc969a1fE",
    symbol: "RIF",
    decimals: 18,
  },
  USDRIF: {
    mainnet: "0x3A15461d8ae0f0fb5fa2629e9da7D66a794a6e37",
    testnet: "0xd1b0d1bc03491f49b9aea967ddd07b37f7327e63",
    symbol: "USDRIF",
    decimals: 18,
  },
}

export function getTokenList(network: ValidNetwork): TokenInfo[] {
  return Object.values(TOKEN_MAP).map((t) => ({
    address: (network === "mainnet" ? t.mainnet : t.testnet) as `0x${string}`,
    symbol: t.symbol,
    decimals: t.decimals,
  }))
}

export default function TokenManagerService(network?: ValidNetwork) {
  const publicClient = getPublicClient(network)

  async function getTokenBalance(
    tokenAddress: `0x${string}`,
    walletAddress: `0x${string}`,
  ): Promise<TokenBalance | null> {
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      })

      return {
        address: tokenAddress,
        symbol: "ERC-20",
        decimals: 18,
        balance: balance as bigint,
      }
    } catch {
      return null
    }
  }

  async function getTokenBalances(
    walletAddress: `0x${string}`,
    tokenAddresses: `0x${string}`[],
  ): Promise<TokenBalance[]> {
    const results = await Promise.all(
      tokenAddresses.map((addr) => getTokenBalance(addr, walletAddress)),
    )
    return results.filter((r): r is TokenBalance => r !== null)
  }

  async function getAllTokenBalances(
    walletAddress: `0x${string}`,
    tokens: TokenInfo[],
  ): Promise<TokenBalance[]> {
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [walletAddress],
          })
          return {
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: balance as bigint,
          }
        } catch {
          return {
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: 0n,
          }
        }
      }),
    )
    return results
  }

  return {
    getTokenBalance,
    getTokenBalances,
    getAllTokenBalances,
  }
}
