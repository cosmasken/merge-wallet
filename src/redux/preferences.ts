import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

export enum ThemeMode {
  System = "system",
  Light = "light",
  Dark = "dark",
}

export type ValidNetwork = "mainnet" | "testnet";

interface PreferencesState {
  themeMode: ThemeMode;
  network: ValidNetwork;
  languageCode: string;
  localCurrency: string;
  hideBalance: boolean;
}

const initialState: PreferencesState = {
  themeMode: ThemeMode.System,
  network: "testnet",
  languageCode: "en",
  localCurrency: "USD",
  hideBalance: false,
};

export const setTheme = createAction<ThemeMode>("preferences/setTheme");
export const setNetwork = createAction<ValidNetwork>("preferences/setNetwork");
export const setCurrency = createAction<string>("preferences/setCurrency");
export const toggleHideBalance = createAction("preferences/toggleHideBalance");

export const preferencesReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setTheme, (state, action) => {
      state.themeMode = action.payload;
    })
    .addCase(setNetwork, (state, action) => {
      state.network = action.payload;
    })
    .addCase(setCurrency, (state, action) => {
      state.localCurrency = action.payload;
    })
    .addCase(toggleHideBalance, (state) => {
      state.hideBalance = !state.hideBalance;
    });
});

export const selectPreferences = (state: RootState) => state.preferences;

export const selectThemeMode = createSelector(
  selectPreferences,
  (prefs) => prefs.themeMode,
);

export const selectNetwork = createSelector(
  selectPreferences,
  (prefs): ValidNetwork => prefs.network,
);

export const selectLocalCurrency = createSelector(
  selectPreferences,
  (prefs) => prefs.localCurrency,
);

export const selectShouldHideBalance = createSelector(
  selectPreferences,
  (prefs) => prefs.hideBalance,
);

export const selectIsDarkMode = createSelector(
  selectPreferences,
  (prefs) =>
    prefs.themeMode === "dark" ||
    (prefs.themeMode === ThemeMode.System &&
      window.matchMedia("(prefers-color-scheme: dark)").matches),
);
