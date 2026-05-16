import type { Chain as ViemChain } from "viem";

import { rootstock, rootstockTestnet } from "./rootstock";
import { ethereum, sepolia } from "./ethereum";
import { polygon, polygonAmoy } from "./polygon";
import { bsc, bscTestnet } from "./bsc";
import { arbitrum, arbitrumSepolia } from "./arbitrum";
import { optimism, optimismSepolia } from "./optimism";
import { avalanche, avalancheFuji } from "./avalanche";
import { base, baseSepolia } from "./base";
import { gnosis, gnosisChiado } from "./gnosis";

export type GasStrategy = "legacy" | "eip1559";

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  gasType: GasStrategy;
  slip44: number;
  blockExplorer?: { name: string; url: string };
}

const REGISTRY: ChainConfig[] = [
  rootstock,
  rootstockTestnet,
  ethereum,
  sepolia,
  polygon,
  polygonAmoy,
  bsc,
  bscTestnet,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  avalanche,
  avalancheFuji,
  base,
  baseSepolia,
  gnosis,
  gnosisChiado,
];

const BY_ID = new Map<number, ChainConfig>(REGISTRY.map((c) => [c.id, c]));

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return BY_ID.get(chainId);
}

export function getAllChainConfigs(): ChainConfig[] {
  return REGISTRY;
}

/** Convert our ChainConfig to a viem Chain object for client creation. */
export function getNativeCurrency(chainId: number): { symbol: string; decimals: number; name: string } {
  const config = BY_ID.get(chainId);
  if (!config) return { symbol: "ETH", decimals: 18, name: "Ether" };
  return config.nativeCurrency;
}

export type NetworkFamily =
  | "rootstock"
  | "ethereum"
  | "polygon"
  | "bsc"
  | "arbitrum"
  | "optimism"
  | "avalanche"
  | "base"
  | "gnosis";

export interface FamilyInfo {
  name: string;
  mainnet: number;
  testnet: number;
}

export const NETWORK_FAMILIES: Record<NetworkFamily, FamilyInfo> = {
  rootstock: { name: "Rootstock", mainnet: 30, testnet: 31 },
  ethereum: { name: "Ethereum", mainnet: 1, testnet: 11155111 },
  polygon: { name: "Polygon", mainnet: 137, testnet: 80002 },
  bsc: { name: "BNB Chain", mainnet: 56, testnet: 97 },
  arbitrum: { name: "Arbitrum", mainnet: 42161, testnet: 421614 },
  optimism: { name: "Optimism", mainnet: 10, testnet: 11155420 },
  avalanche: { name: "Avalanche", mainnet: 43114, testnet: 43113 },
  base: { name: "Base", mainnet: 8453, testnet: 84532 },
  gnosis: { name: "Gnosis", mainnet: 100, testnet: 10200 },
};

export function getFamilyForChain(chainId: number): NetworkFamily | undefined {
  for (const [family, info] of Object.entries(NETWORK_FAMILIES)) {
    if (info.mainnet === chainId || info.testnet === chainId) {
      return family as NetworkFamily;
    }
  }
  return undefined;
}

export function getFamilyChainIds(family: NetworkFamily): [number, number] {
  const info = NETWORK_FAMILIES[family];
  return [info.mainnet, info.testnet];
}

export function toViemChain(config: ChainConfig): ViemChain {
  return {
    id: config.id,
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: {
      default: { http: config.rpcUrls },
      public: { http: config.rpcUrls },
    },
    blockExplorers: config.blockExplorer
      ? { default: config.blockExplorer }
      : undefined,
  } as const satisfies ViemChain;
}
