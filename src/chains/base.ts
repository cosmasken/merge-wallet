import type { ChainConfig } from "./index";

export const base: ChainConfig = {
  id: 8453,
  name: "Base",
  rpcUrls: ["https://mainnet.base.org"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Basescan", url: "https://basescan.org" },
};

export const baseSepolia: ChainConfig = {
  id: 84532,
  name: "Base Sepolia Testnet",
  rpcUrls: ["https://sepolia.base.org"],
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Basescan", url: "https://sepolia.basescan.org" },
};
