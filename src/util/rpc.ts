import { fallback, http } from "viem";
import type { Transport } from "viem";

import { getChainConfig } from "@/chains";

interface RpcOverrides {
  customUrls: string[];
  disabledUrls: string[];
}

export function getActiveRpcUrls(chainId: number, overrides: Record<number, RpcOverrides>): string[] {
  const config = getChainConfig(chainId);
  if (!config) return [];

  const entry = overrides[chainId];
  const disabledSet = new Set(entry?.disabledUrls ?? []);
  const customSet = new Set(entry?.customUrls ?? []);

  const defaults = config.rpcUrls.filter(u => !disabledSet.has(u) && !customSet.has(u));
  const custom = (entry?.customUrls ?? []).filter(u => !disabledSet.has(u));

  return [...defaults, ...custom];
}

export function buildFallbackTransport(chainId: number, overrides: Record<number, RpcOverrides>): Transport {
  const urls = getActiveRpcUrls(chainId, overrides);
  if (urls.length === 0) {
    const config = getChainConfig(chainId);
    throw new Error(`No active RPC URLs for chain ${chainId} (${config?.name ?? "unknown"})`);
  }

  const transports = urls.map(url => http(url));

  return fallback(transports, { rank: false });
}
