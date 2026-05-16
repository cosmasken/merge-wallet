import { useCallback, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import PullToRefresh from "@/atoms/PullToRefresh";
import Button from "@/atoms/Button";
import { getPublicClient } from "@/kernel/evm/ClientService";
import { selectChainId, setChainId } from "@/redux/preferences";
import { getAllChainConfigs } from "@/chains";

export default function NetworkSettings() {
  const dispatch = useDispatch();
  const currentChainId = useSelector(selectChainId);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, boolean | null>>({});

  const chains = getAllChainConfigs();

  const testConnection = useCallback(async (chainId: number) => {
    setTesting(true);
    try {
      const client = getPublicClient(chainId);
      await client.getBlockNumber();
      setTestResults(prev => ({ ...prev, [chainId]: true }));
    } catch {
      setTestResults(prev => ({ ...prev, [chainId]: false }));
    }
    setTesting(false);
  }, []);

  const testAllConnections = useCallback(async () => {
    setTesting(true);
    setTestResults({});

    for (const chain of chains) {
      try {
        const client = getPublicClient(chain.id);
        await client.getBlockNumber();
        setTestResults(prev => ({ ...prev, [chain.id]: true }));
      } catch {
        setTestResults(prev => ({ ...prev, [chain.id]: false }));
      }
    }
    setTesting(false);
  }, [chains]);

  const handleSwitch = (chainId: number) => {
    dispatch(setChainId(chainId));
  };

  useEffect(function autoTestOnMount() {
    testAllConnections();
  }, [testAllConnections]);

  return (
    <>
      <PullToRefresh onRefresh={testAllConnections}>
      <div>
        <ViewHeader title="Network" subtitle="Multichain network configuration" showBack />
        <div className="flex flex-col gap-4 px-4">
          <Button
            label={testing ? "Testing Connections..." : "Test All Connections"}
            variant="secondary"
            fullWidth
            disabled={testing}
            onClick={testAllConnections}
          />

          {chains.map((chain) => {
            const isActive = currentChainId === chain.id;
            const testResult = testResults[chain.id];
            return (
              <div
                key={chain.id}
                onClick={() => handleSwitch(chain.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSwitch(chain.id);
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
                        {chain.name}
                      </div>
                      {testResult !== null && (
                        <div className={`w-2 h-2 rounded-full ${testResult ? "bg-success" : "bg-error"}`} />
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Chain ID: {chain.id} · {chain.nativeCurrency.symbol}
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
                  {chain.rpcUrls[0]}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    testConnection(chain.id);
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
    </>
  );
}
