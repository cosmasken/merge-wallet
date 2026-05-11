import { combineReducers, configureStore, isPlain } from "@reduxjs/toolkit";

import { preferencesReducer } from "./preferences";
import { deviceReducer } from "./device";
import { walletReducer } from "./wallet";

const rootReducer = combineReducers({
  device: deviceReducer,
  preferences: preferencesReducer,
  wallet: walletReducer,
});

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

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
