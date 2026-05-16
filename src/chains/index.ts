import type { Chain as ViemChain } from "viem";

import { rootstock, rootstockTestnet } from "./rootstock";

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
];

const BY_ID = new Map<number, ChainConfig>(REGISTRY.map((c) => [c.id, c]));

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return BY_ID.get(chainId);
}

export function getAllChainConfigs(): ChainConfig[] {
  return REGISTRY;
}

export function getNativeCurrency(chainId: number): { symbol: string; decimals: number; name: string } {
  const config = BY_ID.get(chainId);
  if (!config) return { symbol: "RBTC", decimals: 18, name: "Rootstock Bitcoin" };
  return config.nativeCurrency;
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
