import { erc20Abi } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import type { ValidNetwork } from "@/redux/preferences"

interface TokenBalance {
  address: `0x${string}`
  symbol: string
  decimals: number
  balance: bigint
}

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x2acc95758f8b5f583470bA265E685CF8e3f4283b": { symbol: "RIF", decimals: 18 },
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

      const metadata = KNOWN_TOKENS[tokenAddress.toLowerCase()] ?? {
        symbol: "ERC-20",
        decimals: 18,
      }

      return {
        address: tokenAddress,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        balance,
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

  return {
    getTokenBalance,
    getTokenBalances,
  }
}
