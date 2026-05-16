import type { ChainConfig } from "./index";

export const gnosis: ChainConfig = {
  id: 100,
  name: "Gnosis Chain",
  rpcUrls: ["https://rpc.gnosischain.com"],
  nativeCurrency: { name: "xDAI", symbol: "xDAI", decimals: 18 },
  gasType: "legacy",
  slip44: 700,
  blockExplorer: { name: "Gnosis Scan", url: "https://gnosisscan.io" },
};

export const gnosisChiado: ChainConfig = {
  id: 10200,
  name: "Gnosis Chiado Testnet",
  rpcUrls: ["https://rpc.chiadochain.net"],
  nativeCurrency: { name: "xDAI", symbol: "xDAI", decimals: 18 },
  gasType: "legacy",
  slip44: 700,
  blockExplorer: { name: "Gnosis Scan", url: "https://chiado.gnosisscan.io" },
};
