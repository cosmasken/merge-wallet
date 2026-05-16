import { erc20Abi, getAddress } from "viem"
import { getPublicClient } from "@/kernel/evm/ClientService"

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

// Chain-specific token addresses keyed by chain ID
const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  RIF: { 30: "0x2acc95758f8b5f583470bA265E685CF8e3f4283b", 31: "0x19F64674D8A5B4E652319F5e239eFd3bc969a1fE" },
  USDRIF: { 30: "0x3A15461d8ae0f0fb5fa2629e9da7D66a794a6e37", 31: "0xd1b0d1bc03491f49b9aea967ddd07b37f7327e63" },

  USDC: { 1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", 56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 10: "0x0b2c639c533813f4Aa9D7837CAf62653d097Ff85", 43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", 8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  USDT: { 1: "0xdAC17F958D2ee523a2206206994597C13D831ec7", 137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", 56: "0x55d398326f99059fF775485246999027B3197955", 42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", 43114: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", 100: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6" },
  DAI: { 1: "0x6B175474E89094C44Da98b954EedeAC495271d0F", 137: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", 56: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", 42161: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", 10: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", 100: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d" },
  WETH: { 1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", 137: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", 42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 10: "0x4200000000000000000000000000000000000006", 43114: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", 8453: "0x4200000000000000000000000000000000000006" },
  WBTC: { 1: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", 137: "0x1bfd67037b42cf73acF2047067bd4F2C47D9BfD6", 56: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", 42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" },
}

const CHAIN_SPECIFIC_TOKENS: Record<number, { symbol: string; decimals: number }[]> = {
  30: [{ symbol: "RIF", decimals: 18 }, { symbol: "USDRIF", decimals: 18 }],
  31: [{ symbol: "RIF", decimals: 18 }, { symbol: "USDRIF", decimals: 18 }],
}

const TOKEN_DECIMALS: Record<string, number> = {
  RIF: 18, USDRIF: 18, USDC: 6, USDT: 6, DAI: 18, WETH: 18, WBTC: 8,
}

export function getTokenList(chainId: number): TokenInfo[] {
  const tokens: TokenInfo[] = []

  // Add common tokens available on this chain
  for (const [symbol, addresses] of Object.entries(TOKEN_ADDRESSES)) {
    const addr = addresses[chainId]
    if (addr) {
      tokens.push({
        address: addr as `0x${string}`,
        symbol,
        decimals: TOKEN_DECIMALS[symbol] ?? 18,
      })
    }
  }

  // Add chain-specific tokens
  const specific = CHAIN_SPECIFIC_TOKENS[chainId] ?? []
  for (const t of specific) {
    const addr = TOKEN_ADDRESSES[t.symbol]?.[chainId]
    if (addr && !tokens.some((x) => x.symbol === t.symbol)) {
      tokens.push({
        address: addr as `0x${string}`,
        symbol: t.symbol,
        decimals: t.decimals,
      })
    }
  }

  return tokens
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
