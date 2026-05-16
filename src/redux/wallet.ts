import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

interface WalletState {
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
}

const initialState: WalletState = {
  address: "",
  balance: "0",
  name: "My Wallet",
  seedBackedUp: false,
  trackedNfts: [],
  trackedTokens: [],
  contacts: [],
  pendingTransactions: [],
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

export const walletReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setWalletAddress, (state, action) => {
      state.address = action.payload;
    })
    .addCase(setWalletBalance, (state, action) => {
      state.balance = action.payload;
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
    }));
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
