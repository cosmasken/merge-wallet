import { Preferences } from "@capacitor/preferences";

const PERSIST_KEY = "merge-wallet-state";

interface PersistedState {
  preferences: {
    chainId: number;
    localCurrency: string;
    languageCode: string;
    hideBalance: boolean;
    authMode: string;
    authActions: string;
    themeMode: string;
    security: {
      lockOnAppStart: boolean;
      requireAuthForSend: boolean;
      useBiometrics: boolean;
    };
  };
  rpc: {
    overrides: Record<number, {
      customUrls: string[];
      disabledUrls: string[];
    }>;
  };
  wallet: {
    address: string;
    name: string;
    balance?: string;
    seedBackedUp?: boolean;
    wallets?: {
      id: string;
      name: string;
      address: string;
      createdAt: number;
    }[];
    activeWalletId?: string | null;
    trackedNfts?: string[];
    trackedTokens?: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
    }[];
    contacts?: {
      name: string;
      address: string;
    }[];
    pendingTransactions?: {
      hash: string;
      type: string;
      amount: string;
      symbol: string;
      status: string;
      timestamp: number;
      chainId: number;
    }[];
  };
}

export async function saveState(state: {
  preferences: Record<string, unknown>;
  wallet: Record<string, unknown>;
  rpc: Record<string, unknown>;
}): Promise<void> {
  const security = (state.preferences.security as Record<string, boolean>) ?? {};
  const data: PersistedState = {
    preferences: {
      chainId: Number(state.preferences.chainId ?? 31),
      localCurrency: String(state.preferences.localCurrency ?? "USD"),
      languageCode: String(state.preferences.languageCode ?? "en"),
      hideBalance: Boolean(state.preferences.hideBalance),
      authMode: String(state.preferences.authMode ?? "none"),
      authActions: String(state.preferences.authActions ?? ""),
      themeMode: String(state.preferences.themeMode ?? "system"),
      security: {
        lockOnAppStart: security.lockOnAppStart ?? true,
        requireAuthForSend: security.requireAuthForSend ?? true,
        useBiometrics: security.useBiometrics ?? true,
      },
    },
    rpc: {
      overrides: (state.rpc.overrides as Record<number, { customUrls: string[]; disabledUrls: string[] }>) ?? {},
    },
    wallet: {
      address: String(state.wallet.address ?? ""),
      name: String(state.wallet.name ?? "My Wallet"),
      balance: String(state.wallet.balance ?? "0"),
      seedBackedUp: Boolean(state.wallet.seedBackedUp),
      wallets: Array.isArray(state.wallet.wallets) ? state.wallet.wallets : [],
      activeWalletId: state.wallet.activeWalletId != null ? String(state.wallet.activeWalletId) : null,
      trackedNfts: Array.isArray(state.wallet.trackedNfts)
        ? state.wallet.trackedNfts
        : [],
      trackedTokens: Array.isArray(state.wallet.trackedTokens)
        ? state.wallet.trackedTokens
        : [],
      contacts: Array.isArray(state.wallet.contacts)
        ? state.wallet.contacts
        : [],
      pendingTransactions: Array.isArray(state.wallet.pendingTransactions)
        ? state.wallet.pendingTransactions
        : [],
    },
  };

  try {
    await Preferences.set({ key: PERSIST_KEY, value: JSON.stringify(data) });
  } catch {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(data));
  }
}

export async function loadState(): Promise<Partial<{
  preferences: Record<string, unknown>;
  wallet: Record<string, unknown>;
  rpc: Record<string, unknown>;
}> | null> {
  try {
    const { value } = await Preferences.get({ key: PERSIST_KEY });
    if (value) return JSON.parse(value);
  } catch {
    // fall through to localStorage
  }

  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // no persisted state
  }

  return null;
}

export async function clearState(): Promise<void> {
  try {
    await Preferences.remove({ key: PERSIST_KEY });
  } catch {
    localStorage.removeItem(PERSIST_KEY);
  }
}
