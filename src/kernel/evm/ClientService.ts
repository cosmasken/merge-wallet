import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from "viem";

import { getChain, rskMainnet, rskTestnet } from "@/util/networks";
import type { ValidNetwork } from "@/redux/preferences";

let currentNetwork: ValidNetwork = "testnet";
let publicClient: PublicClient | null = null;
let walletClient: WalletClient | null = null;

function buildClients(network: ValidNetwork) {
  const chain = getChain(network);
  const transport = http();

  publicClient = createPublicClient({ chain, transport });
  walletClient = createWalletClient({ chain, transport });
}

export default function ClientService(network?: ValidNetwork) {
  const targetNetwork = network ?? currentNetwork;

  if (!publicClient || !walletClient || targetNetwork !== currentNetwork) {
    currentNetwork = targetNetwork;
    buildClients(targetNetwork);
  }

  return {
    getPublicClient: () => publicClient!,
    getWalletClient: () => walletClient!,
    getCurrentNetwork: () => currentNetwork,
    getChain: () => getChain(currentNetwork),
  };
}

export function getPublicClient(network?: ValidNetwork): PublicClient {
  return ClientService(network).getPublicClient();
}

export function getWalletClient(network?: ValidNetwork): WalletClient {
  return ClientService(network).getWalletClient();
}
