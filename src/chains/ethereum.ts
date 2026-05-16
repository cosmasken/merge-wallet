import type { ChainConfig } from "./index";

export const ethereum: ChainConfig = {
  id: 1,
  name: "Ethereum Mainnet",
  rpcUrls: ["https://eth.merkle.io"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Etherscan", url: "https://etherscan.io" },
};

export const sepolia: ChainConfig = {
  id: 11155111,
  name: "Sepolia Testnet",
  rpcUrls: ["https://rpc.sepolia.org"],
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  gasType: "eip1559",
  slip44: 60,
  blockExplorer: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
};
