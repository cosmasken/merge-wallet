import { combineReducers, configureStore, isPlain } from "@reduxjs/toolkit";

import { preferencesReducer } from "./preferences";
import { deviceReducer } from "./device";
import { walletReducer } from "./wallet";
import { rpcReducer } from "./rpc";
import { saveState } from "./persistence";

const rootReducer = combineReducers({
  device: deviceReducer,
  preferences: preferencesReducer,
  wallet: walletReducer,
  rpc: rpcReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        isSerializable: (value: unknown) =>
          typeof value === "bigint" || isPlain(value),
      },
    }),
});

let persistTimer: ReturnType<typeof setTimeout> | null = null;

store.subscribe(() => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const state = store.getState();
    saveState({
      preferences: state.preferences as unknown as Record<string, unknown>,
      wallet: state.wallet as unknown as Record<string, unknown>,
      rpc: state.rpc as unknown as Record<string, unknown>,
    });
  }, 500);
});

export type AppDispatch = typeof store.dispatch;
