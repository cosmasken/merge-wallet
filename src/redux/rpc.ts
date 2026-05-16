import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

interface RpcState {
  overrides: Record<number, {
    customUrls: string[];
    disabledUrls: string[];
  }>;
}

const initialState: RpcState = {
  overrides: {},
};

export const addRpcUrl = createAction<{ chainId: number; url: string }>("rpc/addUrl");
export const removeRpcUrl = createAction<{ chainId: number; url: string }>("rpc/removeUrl");
export const toggleRpcUrl = createAction<{ chainId: number; url: string }>("rpc/toggleUrl");
export const resetRpcUrls = createAction<number>("rpc/resetUrls");
export const hydrateRpc = createAction<Partial<RpcState>>("rpc/hydrate");

export const rpcReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(addRpcUrl, (state, action) => {
      const { chainId, url } = action.payload;
      if (!state.overrides[chainId]) {
        state.overrides[chainId] = { customUrls: [], disabledUrls: [] };
      }
      const entry = state.overrides[chainId];
      if (!entry.customUrls.includes(url) && !entry.disabledUrls.includes(url)) {
        entry.customUrls.push(url);
      }
    })
    .addCase(removeRpcUrl, (state, action) => {
      const { chainId, url } = action.payload;
      const entry = state.overrides[chainId];
      if (!entry) return;
      entry.customUrls = entry.customUrls.filter(u => u !== url);
      entry.disabledUrls = entry.disabledUrls.filter(u => u !== url);
    })
    .addCase(toggleRpcUrl, (state, action) => {
      const { chainId, url } = action.payload;
      if (!state.overrides[chainId]) {
        state.overrides[chainId] = { customUrls: [], disabledUrls: [] };
      }
      const entry = state.overrides[chainId];
      const idx = entry.disabledUrls.indexOf(url);
      if (idx >= 0) {
        entry.disabledUrls.splice(idx, 1);
      } else {
        entry.disabledUrls.push(url);
      }
    })
    .addCase(resetRpcUrls, (state, action) => {
      delete state.overrides[action.payload];
    })
    .addCase(hydrateRpc, (_state, action) => ({
      ...initialState,
      ...action.payload,
    }));
});

export const selectRpcOverrides = (state: RootState) => state.rpc.overrides;

export const selectRpcOverridesForChain = createSelector(
  [selectRpcOverrides, (_state: RootState, chainId: number) => chainId],
  (overrides, chainId) => overrides[chainId] ?? { customUrls: [], disabledUrls: [] },
);
