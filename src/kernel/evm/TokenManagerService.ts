import { erc20Abi, getAddress } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import { getProtocolTokens, RIF, USDRIF } from "@/rsk/addresses"

export interface TokenBalance {
  address: `0x${string}`
  symbol: string
  decimals: number
  balance: bigint
  name?: string
}

export interface TokenInfo {
  address: `0x${string}`
  symbol: string
  decimals: number
  chainId?: number
}

const RSK_TOKENS: Record<number, { symbol: string; address: string; decimals: number }[]> = {
  30: [
    { symbol: "RIF", address: RIF[30], decimals: 18 },
    { symbol: "USDRIF", address: USDRIF[30], decimals: 18 },
  ],
  31: [
    { symbol: "RIF", address: RIF[31], decimals: 18 },
    { symbol: "USDRIF", address: USDRIF[31], decimals: 18 },
  ],
}

export function getTokenList(chainId: number): TokenInfo[] {
  const rskTokens = (RSK_TOKENS[chainId] ?? []).map(t => ({
    address: t.address as `0x${string}`,
    symbol: t.symbol,
    decimals: t.decimals,
  }))

  // Add protocol tokens
  for (const pt of getProtocolTokens(chainId)) {
    if (!rskTokens.some(t => t.address.toLowerCase() === pt.address.toLowerCase())) {
      rskTokens.push({ address: pt.address, symbol: pt.symbol, decimals: pt.decimals })
    }
  }

  return rskTokens
}

export default function TokenManagerService(chainId?: number) {
  const publicClient = getPublicClient(chainId)

  async function getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
  ): Promise<TokenBalance | null> {
    try {
      const normalizedToken = getAddress(tokenAddress);
      const normalizedWallet = getAddress(walletAddress);

      const balance = await publicClient.readContract({
        address: normalizedToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [normalizedWallet],
      })

      return {
        address: normalizedToken,
        symbol: "",
        decimals: 0,
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
    const abi = [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }],
    }];

    const normalizedWallet = getAddress(walletAddress);
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const normalizedToken = getAddress(token.address);
          const balance = await publicClient.readContract({
            address: normalizedToken,
            abi: abi,
            functionName: "balanceOf",
            args: [normalizedWallet],
          })
          return {
            address: normalizedToken,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: balance as bigint,
          }
        } catch {
          console.debug(`[TokenManagerService] balanceOf returned no data for ${token.symbol} (${token.address}) on chain — skipping`)
          return {
            address: getAddress(token.address),
            symbol: token.symbol,
            decimals: token.decimals,
            balance: 0n,
          }
        }
      }),
    )

    return results
  }

  async function getTokenMetadata(tokenAddress: string): Promise<{ symbol: string; decimals: number } | null> {
    try {
      const normalized = getAddress(tokenAddress);

      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: normalized,
          abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }],
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: normalized,
          abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }],
          functionName: 'decimals',
        }),
      ]);

      return {
        symbol: symbol as string,
        decimals: Number(decimals),
      };
    } catch (e) {
      console.error("Failed to fetch token metadata:", e);
      return null;
    }
  }

  return {
    getTokenBalance,
    getTokenBalances,
    getAllTokenBalances,
    getTokenMetadata,
  }
}
