import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from "./store";

interface DeviceState {
  platform: string;
  isConnected: boolean;
  locale: string;
}

const initialState: DeviceState = {
  platform: "web",
  isConnected: navigator.onLine,
  locale: navigator.language || "en",
};

export const setPlatform = createAction<string>("device/setPlatform");
export const setConnected = createAction<boolean>("device/setConnected");

export const deviceReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(setPlatform, (state, action) => {
      state.platform = action.payload;
    })
    .addCase(setConnected, (state, action) => {
      state.isConnected = action.payload;
    });
});

export const selectDevice = (state: RootState) => state.device;

export const selectIsConnected = createSelector(
  selectDevice,
  (device) => device.isConnected,
);

export const selectPlatform = createSelector(
  selectDevice,
  (device) => device.platform,
);

export const selectLocale = createSelector(
  selectDevice,
  (device) => device.locale,
);
