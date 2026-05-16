import type { ChainConfig } from "./index";

export const avalanche: ChainConfig = {
  id: 43114,
  name: "Avalanche C-Chain",
  rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  gasType: "eip1559",
  slip44: 9005,
  blockExplorer: { name: "SnowTrace", url: "https://snowtrace.io" },
};

export const avalancheFuji: ChainConfig = {
  id: 43113,
  name: "Avalanche Fuji Testnet",
  rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
  nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
  gasType: "eip1559",
  slip44: 9005,
  blockExplorer: { name: "SnowTrace", url: "https://testnet.snowtrace.io" },
};
