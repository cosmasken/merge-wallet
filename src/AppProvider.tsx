import { ReactNode, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

import AppLockScreen from "@/views/security/AppLockScreen";
import ErrorBoundary from "@/layout/ErrorBoundary";

type Phase = "PREFLIGHT" | "LOCKED" | "RUNNING" | "PAUSED" | "STARTUP_ERROR";

interface AppProviderProps {
  children: ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const [phase, setPhase] = useState<Phase>("PREFLIGHT");
  const [startupError, setStartupError] = useState<Error | null>(null);
  const phaseRef = useRef<Phase>("PREFLIGHT");
  phaseRef.current = phase;

  useEffect(function mount() {
    function go(next: Phase) {
      setPhase(next);
      phaseRef.current = next;
    }

    async function coldStart() {
      await SplashScreen.hide();
      go("LOCKED");
    }

    coldStart();

    async function handlePause() {
      if (phaseRef.current === "RUNNING") {
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

    return () => {
      App.removeAllListeners();
    };
  }, []);

  const boot = async () => {
    setPhase("RUNNING");
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
