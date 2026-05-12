import type { Chain } from "viem";

export const rskMainnet = {
  id: 30,
  name: "RSK Mainnet",
  nativeCurrency: { name: "RBTC", symbol: "RBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.rsk.co"] },
    public: { http: ["https://public-node.rsk.co"] },
  },
  blockExplorers: {
    default: { name: "RSK Explorer", url: "https://explorer.rsk.co" },
  },
} as const satisfies Chain;

export const rskTestnet = {
  id: 31,
  name: "RSK Testnet",
  nativeCurrency: { name: "RBTC", symbol: "RBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://public-node.testnet.rsk.co"] },
    public: { http: ["https://public-node.testnet.rsk.co"] },
  },
  blockExplorers: {
    default: { name: "RSK Testnet Explorer", url: "https://explorer.testnet.rootstock.io" },
  },
} as const satisfies Chain;

export const CHAIN_CONFIG = {
  mainnet: rskMainnet,
  testnet: rskTestnet,
} as const;

export function getChain(network: "mainnet" | "testnet"): Chain {
  return CHAIN_CONFIG[network];
}

export function getExplorerUrl(network: "mainnet" | "testnet"): string {
  return CHAIN_CONFIG[network].blockExplorers.default.url;
}

export function buildTxUrl(network: "mainnet" | "testnet", txHash: string): string {
  return `${getExplorerUrl(network)}/tx/${txHash}`;
}

export function buildAddressUrl(network: "mainnet" | "testnet", address: string): string {
  return `${getExplorerUrl(network)}/address/${address}`;
}
