import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

export interface WalletMeta {
  id: string;
  name: string;
  address: string;
  createdAt: number;
}

interface WalletState {
  wallets: WalletMeta[];
  activeWalletId: string | null;
  address: string;
  balance: string;
  name: string;
  seedBackedUp: boolean;
  trackedNfts: string[];
  trackedTokens: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
  }[];
  contacts: {
    name: string;
    address: string;
  }[];
  pendingTransactions: {
    hash: string;
    type: "send" | "receive" | "contract";
    amount: string;
    symbol: string;
    status: "pending" | "success" | "failed";
    timestamp: number;
    chainId: number;
  }[];
  useSmartWallet: boolean;
  smartWalletAddress: string;
  hasSeenSmartWalletNotice: boolean;
}

const initialState: WalletState = {
  wallets: [],
  activeWalletId: null,
  address: "",
  balance: "0",
  name: "My Wallet",
  seedBackedUp: false,
  trackedNfts: [],
  trackedTokens: [],
  contacts: [],
  pendingTransactions: [],
  useSmartWallet: false,
  smartWalletAddress: "",
  hasSeenSmartWalletNotice: false,
};

export const setWalletAddress = createAction<string>("wallet/setAddress");
export const setWalletBalance = createAction<string>("wallet/setBalance");
export const setWalletName = createAction<string>("wallet/setName");
export const setSeedBackedUp = createAction<boolean>("wallet/setSeedBackedUp");
export const addTrackedNft = createAction<string>("wallet/addTrackedNft");
export const removeTrackedNft = createAction<string>("wallet/removeTrackedNft");
export const addTrackedToken = createAction<{ address: string; symbol: string; decimals: number; chainId: number }>("wallet/addTrackedToken");
export const removeTrackedToken = createAction<{ address: string; chainId: number }>("wallet/removeTrackedToken");
export const addContact = createAction<{ name: string; address: string }>("wallet/addContact");
export const removeContact = createAction<string>("wallet/removeContact");
export const addPendingTransaction = createAction<{ hash: string; type: "send" | "receive" | "contract"; amount: string; symbol: string; chainId: number }>("wallet/addPendingTransaction");
export const updatePendingTransaction = createAction<{ hash: string; status: "success" | "failed" }>("wallet/updatePendingTransaction");
export const hydrateWallet = createAction<Partial<WalletState>>("wallet/hydrate");
export const setUseSmartWallet = createAction<boolean>("wallet/setUseSmartWallet");
export const setSmartWalletAddress = createAction<string>("wallet/setSmartWalletAddress");
export const setHasSeenSmartWalletNotice = createAction<boolean>("wallet/setHasSeenSmartWalletNotice");

// Multi-wallet actions
export const addWallet = createAction<WalletMeta>("wallet/addWallet");
export const removeWalletById = createAction<string>("wallet/removeWallet");
export const renameWallet = createAction<{ id: string; name: string }>("wallet/renameWallet");
export const setActiveWallet = createAction<string | null>("wallet/setActiveWallet");

export const walletReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setWalletAddress, (state, action) => {
      state.address = action.payload;
      state.smartWalletAddress = "";
    })
    .addCase(setWalletBalance, (state, action) => {
      state.balance = action.payload;
    })
    .addCase(setUseSmartWallet, (state, action) => {
      state.useSmartWallet = action.payload;
    })
    .addCase(setSmartWalletAddress, (state, action) => {
      state.smartWalletAddress = action.payload;
    })
    .addCase(setHasSeenSmartWalletNotice, (state, action) => {
      state.hasSeenSmartWalletNotice = action.payload;
    })
    .addCase(setWalletName, (state, action) => {
      state.name = action.payload;
    })
    .addCase(setSeedBackedUp, (state, action) => {
      state.seedBackedUp = action.payload;
    })
    .addCase(addTrackedNft, (state, action) => {
      const addr = action.payload.toLowerCase();
      if (!state.trackedNfts.some((a) => a.toLowerCase() === addr)) {
        state.trackedNfts.push(action.payload);
      }
    })
    .addCase(removeTrackedNft, (state, action) => {
      state.trackedNfts = state.trackedNfts.filter(
        (a) => a.toLowerCase() !== action.payload.toLowerCase(),
      );
    })
    .addCase(addTrackedToken, (state, action) => {
      const addr = action.payload.address.toLowerCase();
      if (!state.trackedTokens.some((t) => t.address.toLowerCase() === addr && t.chainId === action.payload.chainId)) {
        state.trackedTokens.push(action.payload);
      }
    })
    .addCase(removeTrackedToken, (state, action) => {
      state.trackedTokens = state.trackedTokens.filter(
        (t) => !(t.address.toLowerCase() === action.payload.address.toLowerCase() && t.chainId === action.payload.chainId)
      );
    })
    .addCase(addContact, (state, action) => {
      const addr = action.payload.address.toLowerCase();
      if (!state.contacts.some((c) => c.address.toLowerCase() === addr)) {
        state.contacts.push(action.payload);
      }
    })
    .addCase(removeContact, (state, action) => {
      state.contacts = state.contacts.filter(
        (c) => c.address.toLowerCase() !== action.payload.toLowerCase()
      );
    })
    .addCase(addPendingTransaction, (state, action) => {
      state.pendingTransactions.unshift({
        ...action.payload,
        status: "pending",
        timestamp: Date.now(),
      });
    })
    .addCase(updatePendingTransaction, (state, action) => {
      const tx = state.pendingTransactions.find((t) => t.hash === action.payload.hash);
      if (tx) {
        tx.status = action.payload.status;
      }
    })
    .addCase(hydrateWallet, (_state, action) => ({
      ...initialState,
      ...action.payload,
    }))
    // Multi-wallet
    .addCase(addWallet, (state, action) => {
      if (!state.wallets.some(w => w.id === action.payload.id)) {
        state.wallets.push(action.payload);
      }
    })
    .addCase(removeWalletById, (state, action) => {
      state.wallets = state.wallets.filter(w => w.id !== action.payload);
      if (state.activeWalletId === action.payload) {
        state.activeWalletId = state.wallets[0]?.id ?? null;
      }
    })
    .addCase(renameWallet, (state, action) => {
      const w = state.wallets.find(w => w.id === action.payload.id);
      if (w) w.name = action.payload.name;
    })
    .addCase(setActiveWallet, (state, action) => {
      state.activeWalletId = action.payload;
    });
});

export const selectWallet = (state: RootState) => state.wallet;

export const selectWalletAddress = createSelector(
  selectWallet,
  (wallet) => wallet.address,
);

export const selectWalletBalance = createSelector(
  selectWallet,
  (wallet) => wallet.balance,
);

export const selectWalletName = createSelector(
  selectWallet,
  (wallet) => wallet.name,
);

export const selectSeedBackedUp = createSelector(
  selectWallet,
  (wallet) => wallet.seedBackedUp,
);

export const selectTrackedNfts = createSelector(
  selectWallet,
  (wallet) => wallet.trackedNfts,
);

export const selectTrackedTokens = createSelector(
  selectWallet,
  (wallet) => wallet.trackedTokens,
);

export const selectContacts = createSelector(
  selectWallet,
  (wallet) => wallet.contacts,
);

export const selectPendingTransactions = createSelector(
  selectWallet,
  (wallet) => wallet.pendingTransactions,
);

export const selectWallets = createSelector(
  selectWallet,
  (wallet) => wallet.wallets,
);

export const selectActiveWalletId = createSelector(
  selectWallet,
  (wallet) => wallet.activeWalletId,
);

export const selectActiveWallet = createSelector(
  [selectWallets, selectActiveWalletId],
  (wallets, id) => wallets.find(w => w.id === id) ?? null,
);

export const selectUseSmartWallet = createSelector(
  selectWallet,
  (wallet) => wallet.useSmartWallet ?? false,
);

export const selectSmartWalletAddress = createSelector(
  selectWallet,
  (wallet) => wallet.smartWalletAddress ?? "",
);

export const selectActiveAddress = createSelector(
  [selectWalletAddress, selectUseSmartWallet, selectSmartWalletAddress],
  (address, useSmart, smartAddress) => (useSmart && smartAddress ? smartAddress : address),
);

export const selectHasSeenSmartWalletNotice = createSelector(
  selectWallet,
  (wallet) => wallet.hasSeenSmartWalletNotice ?? false,
);
