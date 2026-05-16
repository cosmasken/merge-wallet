import type { ChainConfig } from "./index";

export const polygon: ChainConfig = {
  id: 137,
  name: "Polygon Mainnet",
  rpcUrls: ["https://polygon-rpc.com"],
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Polygonscan", url: "https://polygonscan.com" },
};

export const polygonAmoy: ChainConfig = {
  id: 80002,
  name: "Polygon Amoy Testnet",
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Polygonscan", url: "https://amoy.polygonscan.com" },
};
