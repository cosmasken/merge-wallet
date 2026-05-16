import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

export enum ThemeMode {
  System = "system",
  Light = "light",
  Dark = "dark",
}

interface RbtcPrice {
  price: number;
  currency: string;
  lastUpdated: number;
}

interface PreferencesState {
  themeMode: ThemeMode;
  chainId: number;
  languageCode: string;
  localCurrency: string;
  hideBalance: boolean;
  security: {
    lockOnAppStart: boolean;
    requireAuthForSend: boolean;
    useBiometrics: boolean;
  };
  authMode: string;
  authActions: string;
  pinInputMode: string;
  rbtcPrice: RbtcPrice | null;
}

const initialState: PreferencesState = {
  themeMode: ThemeMode.System,
  chainId: 31, // RSK testnet
  languageCode: "en",
  localCurrency: "USD",
  hideBalance: false,
  security: {
    lockOnAppStart: true,
    requireAuthForSend: true,
    useBiometrics: true,
  },
  authMode: "none",
  authActions: "Any;SendTransaction;RevealBalance",
  pinInputMode: "true",
  rbtcPrice: null,
};

export const setTheme = createAction<ThemeMode>("preferences/setTheme");
export const setChainId = createAction<number>("preferences/setChainId");
export const setCurrency = createAction<string>("preferences/setCurrency");
export const setLanguage = createAction<string>("preferences/setLanguage");
export const toggleHideBalance = createAction("preferences/toggleHideBalance");
export const updateSecuritySettings = createAction<Partial<PreferencesState["security"]>>("preferences/updateSecuritySettings");
export const setAuthMode = createAction<string>("preferences/setAuthMode");
export const setAuthActions = createAction<string>("preferences/setAuthActions");
export const setRbtcPrice = createAction<{ price: number; currency: string }>("preferences/setRbtcPrice");
export const hydratePreferences = createAction<Partial<PreferencesState>>("preferences/hydrate");

export const preferencesReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setTheme, (state, action) => {
      state.themeMode = action.payload;
    })
    .addCase(setChainId, (state, action) => {
      state.chainId = action.payload;
    })
    .addCase(setCurrency, (state, action) => {
      state.localCurrency = action.payload;
    })
    .addCase(setLanguage, (state, action) => {
      state.languageCode = action.payload;
    })
    .addCase(toggleHideBalance, (state) => {
      state.hideBalance = !state.hideBalance;
    })
    .addCase(updateSecuritySettings, (state, action) => {
      state.security = { ...state.security, ...action.payload };
    })
    .addCase(setAuthMode, (state, action) => {
      state.authMode = action.payload;
    })
    .addCase(setAuthActions, (state, action) => {
      state.authActions = action.payload;
    })
    .addCase(setRbtcPrice, (state, action) => {
      state.rbtcPrice = {
        price: action.payload.price,
        currency: action.payload.currency,
        lastUpdated: Date.now(),
      };
    })
    .addCase(hydratePreferences, (_state, action) => ({
      ...initialState,
      ...action.payload,
    }));
});

export const selectPreferences = (state: RootState) => state.preferences;

export const selectThemeMode = createSelector(
  selectPreferences,
  (prefs) => prefs.themeMode,
);

export const selectChainId = createSelector(
  selectPreferences,
  (prefs): number => prefs.chainId,
);

export const selectLocalCurrency = createSelector(
  selectPreferences,
  (prefs) => prefs.localCurrency,
);

export const selectLanguageCode = createSelector(
  selectPreferences,
  (prefs) => prefs.languageCode,
);

export const selectShouldHideBalance = createSelector(
  selectPreferences,
  (prefs) => prefs.hideBalance,
);

export const selectSecurityPreferences = createSelector(
  selectPreferences,
  (prefs) => prefs.security,
);

export const selectIsDarkMode = createSelector(
  selectPreferences,
  (prefs) =>
    prefs.themeMode === "dark" ||
    (prefs.themeMode === ThemeMode.System &&
      window.matchMedia("(prefers-color-scheme: dark)").matches),
);

export const selectSecuritySettings = createSelector(
  selectPreferences,
  (prefs) => ({
    authMode: prefs.authMode,
    authActions: prefs.authActions.split(";"),
    isNumericPin: prefs.pinInputMode === "true",
  }),
);

export const selectAuthMode = createSelector(
  selectPreferences,
  (prefs) => prefs.authMode,
);

export const selectRbtcPrice = createSelector(
  selectPreferences,
  (prefs) => prefs.rbtcPrice,
);
