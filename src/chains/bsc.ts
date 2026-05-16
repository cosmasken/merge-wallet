import type { ChainConfig } from "./index";

export const bsc: ChainConfig = {
  id: 56,
  name: "BNB Smart Chain",
  rpcUrls: ["https://bsc-dataseed.binance.org"],
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  gasType: "legacy",
  slip44: 714,
  blockExplorer: { name: "BscScan", url: "https://bscscan.com" },
};

export const bscTestnet: ChainConfig = {
  id: 97,
  name: "BNB Smart Chain Testnet",
  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  gasType: "legacy",
  slip44: 714,
  blockExplorer: { name: "BscScan", url: "https://testnet.bscscan.com" },
};
