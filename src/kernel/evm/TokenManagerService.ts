import { erc20Abi, getAddress } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"
import { getProtocolTokens } from "@/rsk/addresses"

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
    { symbol: "RIF", address: "0x2acc95758f8b5f583470bA265E685CF8e3f4283b", decimals: 18 },
    { symbol: "USDRIF", address: "0x3A15461d8ae0f0fb5fa2629e9da7D66a794a6e37", decimals: 18 },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
  ],
  31: [
    { symbol: "RIF", address: "0x19F64674D8A5B4E652319F5e239eFd3bc969a1fE", decimals: 18 },
    { symbol: "USDRIF", address: "0xd1b0d1bc03491f49b9aea967ddd07b37f7327e63", decimals: 18 },
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
        } catch (e) {
          console.error(`Failed to fetch balance for token ${token.symbol} (${token.address}):`, e);
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
