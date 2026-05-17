import type { ChainConfig } from "./index";

export const rootstock: ChainConfig = {
  id: 30,
  name: "Rootstock Mainnet",
  rpcUrls: ["https://public-node.rsk.co"],
  nativeCurrency: { name: "RBTC", symbol: "RBTC", decimals: 18 },
  slip44: 137,
  blockExplorer: { name: "RSK Explorer", url: "https://explorer.rsk.co" },
};

export const rootstockTestnet: ChainConfig = {
  id: 31,
  name: "Rootstock Testnet",
  rpcUrls: [
    "https://public-node.testnet.rsk.co",
    "https://rpc.testnet.rootstock.io",
  ],
  nativeCurrency: { name: "RBTC", symbol: "RBTC", decimals: 18 },
  slip44: 137,
  blockExplorer: { name: "RSK Testnet Explorer", url: "https://explorer.testnet.rootstock.io" },
};
