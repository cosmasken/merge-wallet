import { useCallback, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import PullToRefresh from "@/atoms/PullToRefresh";
import Button from "@/atoms/Button";
import { selectNetwork, setNetwork, type ValidNetwork } from "@/redux/preferences";
import { getChain } from "@/util/networks";
import ClientService from "@/kernel/evm/ClientService";
import MainnetWarningModal from "@/components/composite/MainnetWarningModal";

const NETWORKS: { key: ValidNetwork; label: string }[] = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
];

export default function NetworkSettings() {
  const dispatch = useDispatch();
  const currentNetwork = useSelector(selectNetwork);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [showMainnetWarning, setShowMainnetWarning] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<ValidNetwork | null>(null);

  // Check if user has seen mainnet warning before
  const hasSeenMainnetWarning = localStorage.getItem('hasSeenMainnetWarning') === 'true';

  const testConnection = useCallback(async (network: ValidNetwork) => {
    setTesting(true);
    try {
      const client = ClientService(network);
      await client.getPublicClient().getBlockNumber();
      setTestResults(prev => ({ ...prev, [network]: true }));
    } catch {
      setTestResults(prev => ({ ...prev, [network]: false }));
    }
    setTesting(false);
  }, []);

  const testAllConnections = useCallback(async () => {
    setTesting(true);
    setTestResults({});

    for (const { key } of NETWORKS) {
      try {
        const client = ClientService(key);
        await client.getPublicClient().getBlockNumber();
        setTestResults(prev => ({ ...prev, [key]: true }));
      } catch {
        setTestResults(prev => ({ ...prev, [key]: false }));
      }
    }
    setTesting(false);
  }, []);

  const handleSwitch = (network: ValidNetwork) => {
    // Show warning when switching to mainnet for the first time
    if (network === "mainnet" && currentNetwork !== "mainnet" && !hasSeenMainnetWarning) {
      setPendingNetwork(network);
      setShowMainnetWarning(true);
      return;
    }
    
    dispatch(setNetwork(network));
  };

  const handleMainnetWarningConfirm = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenMainnetWarning', 'true');
    }
    
    if (pendingNetwork) {
      dispatch(setNetwork(pendingNetwork));
    }
    
    setShowMainnetWarning(false);
    setPendingNetwork(null);
  };

  const handleMainnetWarningCancel = () => {
    setShowMainnetWarning(false);
    setPendingNetwork(null);
  };

  useEffect(function autoTestOnMount() {
    testAllConnections();
  }, [testAllConnections]);

  return (
    <>
      <PullToRefresh onRefresh={testAllConnections}>
      <div>
        <ViewHeader title="Network" subtitle="Rootstock network configuration" showBack />
        <div className="flex flex-col gap-4 px-4">
          <Button
            label={testing ? "Testing Connections..." : "Test All Connections"}
            variant="secondary"
            fullWidth
            disabled={testing}
            onClick={testAllConnections}
          />

          {NETWORKS.map(({ key, label }) => {
            const chain = getChain(key);
            const isActive = currentNetwork === key;
            const testResult = testResults[key];
            return (
              <div
                key={key}
                onClick={() => handleSwitch(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSwitch(key);
                  }
                }}
                className={`w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${isActive
                  ? "bg-primary/10 border-primary"
                  : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-neutral-800 dark:text-neutral-100">
                        {label}
                      </div>
                      {testResult !== null && (
                        <div className={`w-2 h-2 rounded-full ${testResult ? "bg-success" : "bg-error"}`} />
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Chain ID: {chain.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResult !== null && (
                      <span className={`text-xs font-medium ${testResult ? "text-success" : "text-error"}`}>
                        {testResult ? "Online" : "Offline"}
                      </span>
                    )}
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="currentColor">
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs text-neutral-400 font-mono truncate">
                  {chain.rpcUrls.default.http[0]}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    testConnection(key);
                  }}
                  disabled={testing}
                  className="mt-2 text-xs text-primary font-medium disabled:opacity-50 hover:underline"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>

            );
          })}
        </div>
      </div>
    </PullToRefresh>

    <MainnetWarningModal
      isOpen={showMainnetWarning}
      onConfirm={handleMainnetWarningConfirm}
      onCancel={handleMainnetWarningCancel}
    />
  </>
  );
}
