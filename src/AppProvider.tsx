import { ReactNode, useEffect, useState } from "react";

import AppLockScreen from "@/views/security/AppLockScreen";
import ErrorBoundary from "@/layout/ErrorBoundary";

type Phase = "PREFLIGHT" | "LOCKED" | "RUNNING" | "STARTUP_ERROR";

interface AppProviderProps {
  children: ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const [phase, setPhase] = useState<Phase>("PREFLIGHT");
  const [startupError, setStartupError] = useState<Error | null>(null);

  useEffect(function coldStart() {
    const timer = setTimeout(() => setPhase("LOCKED"), 500);
    return () => clearTimeout(timer);
  }, []);

  const boot = async () => {
    setPhase("RUNNING");
  };

  let content: ReactNode = null;
  switch (phase) {
    case "PREFLIGHT":
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
    </div>
  );
}
