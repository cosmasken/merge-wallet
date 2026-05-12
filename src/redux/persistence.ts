import { Preferences } from "@capacitor/preferences";

const PERSIST_KEY = "merge-wallet-state";

interface PersistedState {
  preferences: {
    network: string;
    localCurrency: string;
    hideBalance: boolean;
    authMode: string;
    authActions: string;
    themeMode: string;
  };
  wallet: {
    address: string;
    name: string;
  };
}

export async function saveState(state: {
  preferences: Record<string, unknown>;
  wallet: Record<string, unknown>;
}): Promise<void> {
  const data: PersistedState = {
    preferences: {
      network: String(state.preferences.network ?? "testnet"),
      localCurrency: String(state.preferences.localCurrency ?? "USD"),
      hideBalance: Boolean(state.preferences.hideBalance),
      authMode: String(state.preferences.authMode ?? "none"),
      authActions: String(state.preferences.authActions ?? ""),
      themeMode: String(state.preferences.themeMode ?? "system"),
    },
    wallet: {
      address: String(state.wallet.address ?? ""),
      name: String(state.wallet.name ?? "My Wallet"),
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
