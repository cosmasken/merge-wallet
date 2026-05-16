import {
  createPublicClient,
  createWalletClient,
  type PublicClient,
  type WalletClient,
} from "viem";

import { getChainConfig, toViemChain } from "@/chains";
import { buildFallbackTransport } from "@/util/rpc";
import { store } from "@/redux/store";

const clients = new Map<number, { public: PublicClient; wallet: WalletClient }>();

function buildClients(chainId: number) {
  const cached = clients.get(chainId);
  if (cached) return cached;

  const config = getChainConfig(chainId);
  if (!config) throw new Error(`Unknown chain ID: ${chainId}`);

  const chain = toViemChain(config);
  const state = store.getState();
  const overrides = state.rpc.overrides as Record<number, { customUrls: string[]; disabledUrls: string[] }>;
  const transport = buildFallbackTransport(chainId, overrides);

  const pub = createPublicClient({ chain, transport });
  const wlt = createWalletClient({ chain, transport });
  clients.set(chainId, { public: pub, wallet: wlt });
  return { public: pub, wallet: wlt };
}

export default function ClientService(chainId: number) {
  const c = buildClients(chainId);
  return {
    getPublicClient: () => c.public,
    getWalletClient: () => c.wallet,
    getChainId: () => chainId,
    getChain: () => buildClients(chainId).public.chain,
  };
}

export function getPublicClient(chainId?: number): PublicClient {
  return buildClients(chainId ?? 31).public;
}

export function getPublicClientByChainId(chainId: number): PublicClient {
  return buildClients(chainId).public;
}

export function getWalletClient(chainId?: number): WalletClient {
  return buildClients(chainId ?? 31).wallet;
}

export function getWalletClientByChainId(chainId: number): WalletClient {
  return buildClients(chainId).wallet;
}
