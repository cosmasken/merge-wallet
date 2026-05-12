import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

interface WalletState {
  address: string;
  balance: string;
  name: string;
}

const initialState: WalletState = {
  address: "",
  balance: "0",
  name: "My Wallet",
};

export const setWalletAddress = createAction<string>("wallet/setAddress");
export const setWalletBalance = createAction<string>("wallet/setBalance");
export const setWalletName = createAction<string>("wallet/setName");
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
