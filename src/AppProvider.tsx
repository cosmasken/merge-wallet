import { ReactNode, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

import AppLockScreen from "@/views/security/AppLockScreen";
import ErrorBoundary from "@/layout/ErrorBoundary";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import SecurityService from "@/kernel/app/SecurityService";
import { setWalletAddress, setSeedBackedUp, hydrateWallet } from "@/redux/wallet";
import { hydratePreferences } from "@/redux/preferences";
import { setConnected } from "@/redux/device";
import { loadState } from "@/redux/persistence";

type Phase = "PREFLIGHT" | "LOCKED" | "RUNNING" | "PAUSED" | "STARTUP_ERROR";

interface AppProviderProps {
  children: ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const dispatch = useDispatch();
  const [phase, setPhase] = useState<Phase>("PREFLIGHT");
  const [startupError, setStartupError] = useState<Error | null>(null);
  const phaseRef = useRef<Phase>("PREFLIGHT");
  phaseRef.current = phase;

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
      }

      const Security = SecurityService();
      const result = await Security.initEncryption();

      if (result.hasPinConfigured) {
        go("LOCKED");
      } else {
        boot();
      }
    }

    coldStart();

    async function handlePause() {
      if (phaseRef.current === "RUNNING") {
        await SecurityService().clearKeyFromMemory();
        go("PAUSED");
      }
    }

    function handleResume() {
      if (phaseRef.current === "PAUSED") {
        go("LOCKED");
      }
    }

    App.addListener("pause", handlePause);
    App.addListener("resume", handleResume);

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
      
      // If not initialized in memory, try to load from secure storage
      if (!KeyManager.isInitialized()) {
        const isStored = await KeyManager.isWalletStored();
        if (isStored) {
          try {
            await KeyManager.loadWalletSecurely();
          } catch (e) {
            console.error("Failed to load wallet from secure storage", e);
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

  return <div id="container">{content}</div>;
}
