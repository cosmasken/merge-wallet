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

export function buildTxUrl(chainId: number, txHash: string): string {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`;
}

export function buildAddressUrl(chainId: number, address: string): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}

// Governance constants - mainnet only
export const GOVERNANCE_CONTRACTS = {
  GOVERNOR: '0x71ac6ff904a17f50f2c07b693376ccc1c92627f0' as const,
  MULTICALL: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
  RIF: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5' as const,
  STRIF: '0x5db91e24bd32059584bbdb831a901f1199f3d459' as const,
  USDRIF: '0x3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37' as const,
  GRANTS_BUCKET: '0x48229e5d82a186aa89a99212d2d59f5674aa5b6c' as const,
  GRANTS_ACTIVE_BUCKET: '0xf016fa6b237bb56e3aee7022c6947a6a103e3c47' as const,
  GROWTH_BUCKET: '0x267a6073637408b6a1d34d685ff5720a0cbcbd9d' as const,
  GENERAL_BUCKET: '0xfe3d9b7d68ae13455475f28089968336414fd358' as const,
} as const

export const GOVERNANCE_GRAPH_URL = 'https://gateway.thegraph.com/api/deployments/id/QmXWSRQqRXvVZf5FS2nHBmyQjicdssziZVjqTtpd5uSyLv'

export const isGovernanceAvailable = (chainId: number) => chainId === 30
