import type { ChainConfig } from "./index";

export const optimism: ChainConfig = {
  id: 10,
  name: "OP Mainnet",
  rpcUrls: ["https://mainnet.optimism.io"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Etherscan", url: "https://optimistic.etherscan.io" },
};

export const optimismSepolia: ChainConfig = {
  id: 11155420,
  name: "OP Sepolia Testnet",
  rpcUrls: ["https://sepolia.optimism.io"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Etherscan", url: "https://sepolia-optimism.etherscan.io" },
};
