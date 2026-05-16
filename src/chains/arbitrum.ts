import type { ChainConfig } from "./index";

export const arbitrum: ChainConfig = {
  id: 42161,
  name: "Arbitrum One",
  rpcUrls: ["https://arb1.arbitrum.io/rpc"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Arbiscan", url: "https://arbiscan.io" },
};

export const arbitrumSepolia: ChainConfig = {
  id: 421614,
  name: "Arbitrum Sepolia Testnet",
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Arbiscan", url: "https://sepolia.arbiscan.io" },
};
