import { ReactNode, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

import AppLockScreen from "@/views/security/AppLockScreen";
import ErrorBoundary from "@/layout/ErrorBoundary";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import SecureStorageService from "@/kernel/app/SecureStorageService";
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService";
import { ModalProvider } from "@/kernel/app/ModalService";
import { setWalletAddress, setSeedBackedUp, hydrateWallet, setActiveWallet } from "@/redux/wallet";
import { hydratePreferences, selectLanguageCode, selectSecuritySettings } from "@/redux/preferences";
import { hydrateRpc } from "@/redux/rpc";
import { setConnected } from "@/redux/device";
import { loadState } from "@/redux/persistence";
import { store } from "@/redux/store";
import TransactionTracker from "./components/composite/TransactionTracker";

type Phase = "PREFLIGHT" | "LOCKED" | "RUNNING" | "PAUSED" | "STARTUP_ERROR";

interface AppProviderProps {
  children: ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const dispatch = useDispatch();
  const languageCode = useSelector(selectLanguageCode);
  const [phase, setPhase] = useState<Phase>("PREFLIGHT");
  const [startupError, setStartupError] = useState<Error | null>(null);
  const phaseRef = useRef<Phase>("PREFLIGHT");
  phaseRef.current = phase;

  // RTL support: set document direction based on language
  useEffect(() => {
    const RTL_LANGUAGES = ["ar"];
    document.documentElement.dir = RTL_LANGUAGES.includes(languageCode) ? "rtl" : "ltr";
    document.documentElement.lang = languageCode;
  }, [languageCode]);

  useEffect(function mount() {
    let mounted = true;

    function go(next: Phase) {
      if (!mounted) return;
      setPhase(next);
      phaseRef.current = next;
    }

    async function coldStart() {
      try {
        await SplashScreen.hide();
      } catch {
        // web
      }

      const persisted = await loadState();
      if (persisted) {
        if (persisted.preferences) dispatch(hydratePreferences(persisted.preferences));
        if (persisted.wallet) dispatch(hydrateWallet(persisted.wallet));
        if (persisted.rpc) dispatch(hydrateRpc(persisted.rpc));
      }

      const Security = SecurityService();
      const result = await Security.initEncryption();
      const { authMode } = selectSecuritySettings(store.getState());

      if (result.hasPinConfigured && authMode !== "none") {
        go("LOCKED");
      } else {
        boot();
      }
    }

    coldStart();

    async function handlePause() {
      if (phaseRef.current !== "RUNNING") return;
      const { authMode, authActions } = selectSecuritySettings(store.getState());
      const shouldLock = authMode !== "none" && authActions.includes(AuthActions.AppResume);
      if (shouldLock) {
        await SecurityService().clearKeyFromMemory();
        go("PAUSED");
      }
    }

    function handleResume() {
      if (phaseRef.current === "PAUSED") {
        go("LOCKED");
      }
    }

    App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        handlePause();
      } else {
        handleResume();
      }
    });

    window.addEventListener("online", () => dispatch(setConnected(true)));
    window.addEventListener("offline", () => dispatch(setConnected(false)));

    return () => {
      mounted = false;
      App.removeAllListeners();
      window.removeEventListener("online", () => dispatch(setConnected(true)));
      window.removeEventListener("offline", () => dispatch(setConnected(false)));
    };
  }, []);

  const boot = async () => {
    try {
      const KeyManager = KeyManagerService();
      const state = store.getState();
      const activeWalletId = state.wallet.activeWalletId;

      if (!KeyManager.isInitialized()) {
        // Try loading the active wallet first
        let loaded = false;
        if (activeWalletId) {
          loaded = await KeyManager.loadWalletById(activeWalletId);
        }
        // Fall back to any stored wallet
        if (!loaded) {
          const wallets = await SecureStorageService().listWallets();
          if (wallets.length > 0) {
            loaded = await KeyManager.loadWalletById(wallets[0].id);
            if (loaded) dispatch(setActiveWallet(wallets[0].id));
          }
        }
      }

      if (KeyManager.isInitialized()) {
        dispatch(setWalletAddress(KeyManager.getAddress()));
      }
      setPhase("RUNNING");
    } catch (e) {
      setStartupError(e instanceof Error ? e : new Error(String(e)));
      setPhase("STARTUP_ERROR");
    }
  };


  let content: ReactNode = null;
  switch (phase) {
    case "PREFLIGHT":
    case "PAUSED":
      break;
    case "LOCKED":
      content = <AppLockScreen boot={boot} />;
      break;
    case "RUNNING":
      content = children;
      break;
    case "STARTUP_ERROR":
    default:
      content = (
        <ErrorBoundary
          startupError={startupError ?? new Error(`Unknown phase: ${phase}`)}
        />
      );
      break;
  }

  return (
    <div id="container">
      {content}
      {phase === "RUNNING" && <TransactionTracker />}
      <ModalProvider />
    </div>
  );
}
