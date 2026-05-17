import type { Chain } from "viem";

import { getChainConfig, toViemChain } from "@/chains";

export function getChain(chainId: number): Chain {
  const config = getChainConfig(chainId);
  if (!config) throw new Error(`Unknown chain ID: ${chainId}`);
  return toViemChain(config);
}

export function getExplorerUrl(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.blockExplorer?.url ?? "";
}

export function getBlockscoutApiUrl(chainId: number): string {
  if (chainId === 30) return "https://rootstock.blockscout.com";
  if (chainId === 31) return "https://rootstock-testnet.blockscout.com";
  return getExplorerUrl(chainId);
}

export function buildTxUrl(chainId: number, txHash: string): string {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`;
}

export function buildAddressUrl(chainId: number, address: string): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}

import { GOVERNANCE_CONTRACTS } from "@/rsk/addresses";
export { GOVERNANCE_CONTRACTS };

export const GOVERNANCE_GRAPH_URL = 'https://gateway.thegraph.com/api/deployments/id/QmXWSRQqRXvVZf5FS2nHBmyQjicdssziZVjqTtpd5uSyLv'

export const isGovernanceAvailable = (chainId: number) => chainId === 30
