import { useCallback, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPublicClient, http } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import PullToRefresh from "@/atoms/PullToRefresh";
import Button from "@/atoms/Button";
import Card from "@/atoms/Card";
import MainnetWarningModal from "@/composite/MainnetWarningModal";
import { selectChainId, setChainId } from "@/redux/preferences";
import { addRpcUrl, removeRpcUrl, resetRpcUrls, toggleRpcUrl, selectRpcOverrides } from "@/redux/rpc";
import { getChainConfig } from "@/chains";

const MAINNET = 30;
const TESTNET = 31;

interface UrlStatus {
  url: string;
  ok: boolean | null;
  testing: boolean;
}

export default function NetworkSettings() {
  const dispatch = useDispatch();
  const currentChainId = useSelector(selectChainId);
  const overrides = useSelector(selectRpcOverrides);
  const [testing, setTesting] = useState(false);
  const [urlStatus, setUrlStatus] = useState<Record<string, UrlStatus>>({});
  const [addingUrl, setAddingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [showMainnetWarning, setShowMainnetWarning] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  const isMainnet = currentChainId === MAINNET;
  const activeChainId = currentChainId;
  const chainConfig = getChainConfig(activeChainId);

  useEffect(() => {
    if (addingUrl && addRef.current) {
      addRef.current.focus();
    }
  }, [addingUrl]);

  const testUrl = useCallback(async (url: string) => {
    setUrlStatus(prev => ({ ...prev, [url]: { url, ok: null, testing: true } }));
    try {
      const transport = http(url);
      const client = createPublicClient({ transport });
      await client.getBlockNumber();
      setUrlStatus(prev => ({ ...prev, [url]: { url, ok: true, testing: false } }));
    } catch {
      setUrlStatus(prev => ({ ...prev, [url]: { url, ok: false, testing: false } }));
    }
  }, []);

  const testConnection = useCallback(async (chainId: number) => {
    const config = getChainConfig(chainId);
    if (!config) return;
    const entry = overrides[chainId];
    const urls = [...config.rpcUrls, ...(entry?.customUrls ?? [])];
    for (const url of urls) {
      if (entry?.disabledUrls.includes(url)) continue;
      setUrlStatus(prev => ({ ...prev, [url]: { url, ok: null, testing: true } }));
      try {
        const transport = http(url);
        const client = createPublicClient({ transport });
        await client.getBlockNumber();
        setUrlStatus(prev => ({ ...prev, [url]: { url, ok: true, testing: false } }));
      } catch {
        setUrlStatus(prev => ({ ...prev, [url]: { url, ok: false, testing: false } }));
      }
    }
  }, [overrides]);

  useEffect(function autoTestOnMount() {
    testConnection(activeChainId);
  }, [activeChainId, testConnection]);

  const switchChain = (mainnet: boolean) => {
    if (mainnet && !isMainnet) {
      if (localStorage.getItem("mainnetWarningDismissed") === "true") {
        dispatch(setChainId(MAINNET));
      } else {
        setShowMainnetWarning(true);
      }
      return;
    }
    dispatch(setChainId(mainnet ? MAINNET : TESTNET));
  };

  const handleMainnetConfirm = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem("mainnetWarningDismissed", "true");
    dispatch(setChainId(MAINNET));
    setShowMainnetWarning(false);
  };

  const handleAddUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    dispatch(addRpcUrl({ chainId: activeChainId, url: trimmed }));
    setNewUrl("");
    setAddingUrl(false);
  };

  if (!chainConfig) {
    return (
      <div>
        <ViewHeader title="Network" showBack />
        <div className="p-4 text-neutral-500">Unknown chain</div>
      </div>
    );
  }

  const entry = overrides[activeChainId];
  const allUrls = [
    ...chainConfig.rpcUrls.map(url => ({ url, isDefault: true, disabled: entry?.disabledUrls.includes(url) ?? false })),
    ...(entry?.customUrls ?? []).map(url => ({ url, isDefault: false, disabled: entry?.disabledUrls.includes(url) ?? false })),
  ];

  return (
    <>
      <PullToRefresh onRefresh={() => testConnection(activeChainId)}>
      <div>
        <ViewHeader title="Network" showBack />
        <div className="flex flex-col gap-4 px-4">

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Network</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${!isMainnet ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"}`}>Testnet</span>
                <button
                  onClick={() => switchChain(!isMainnet)}
                  type="button"
                  className={`relative w-11 h-6 rounded-full transition-colors ${isMainnet ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isMainnet ? "translate-x-5" : ""}`} />
                </button>
                <span className={`text-xs font-medium ${isMainnet ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"}`}>Mainnet</span>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{chainConfig.name}</div>
              <div className="text-xs text-neutral-500">
                Chain ID: {chainConfig.id} · {chainConfig.nativeCurrency.symbol}
              </div>
            </div>
            <Button
              label={testing ? "Testing..." : "Test"}
              variant="secondary"
              size="sm"
              disabled={testing}
              onClick={() => testConnection(activeChainId)}
            />
          </div>

          {chainConfig.blockExplorer && (
            <div className="text-xs text-neutral-500">
              Explorer: <span className="text-primary font-mono">{chainConfig.blockExplorer.url}</span>
            </div>
          )}

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-500">RPC Endpoints</h3>
              <button
                onClick={() => setAddingUrl(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                + Add URL
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {allUrls.map(({ url, isDefault, disabled }) => {
                const status = urlStatus[url];
                return (
                  <div key={url} className={`flex items-center gap-2 text-xs ${disabled ? "opacity-40" : ""}`}>
                    {status?.testing ? (
                      <div className="w-2 h-2 rounded-full bg-warn animate-pulse shrink-0" />
                    ) : status?.ok === true ? (
                      <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                    ) : status?.ok === false ? (
                      <div className="w-2 h-2 rounded-full bg-error shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-neutral-300 shrink-0" />
                    )}
                    <span className="font-mono truncate flex-1">{url}</span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDefault && <span className="text-neutral-400">default</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); testUrl(url); }}
                        className="text-primary font-medium hover:underline"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => dispatch(toggleRpcUrl({ chainId: activeChainId, url }))}
                        className={`font-medium hover:underline ${disabled ? "text-primary" : "text-neutral-400"}`}
                      >
                        {disabled ? "Enable" : "Disable"}
                      </button>
                      {!isDefault && (
                        <button
                          onClick={() => dispatch(removeRpcUrl({ chainId: activeChainId, url }))}
                          className="text-error font-medium hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {addingUrl && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  ref={addRef}
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 font-mono outline-none focus:border-primary"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddUrl();
                    if (e.key === 'Key') { setAddingUrl(false); setNewUrl(""); }
                  }}
                />
                <button onClick={handleAddUrl} className="text-xs text-primary font-medium hover:underline">Add</button>
                <button onClick={() => { setAddingUrl(false); setNewUrl(""); }} className="text-xs text-neutral-400 font-medium hover:underline">Cancel</button>
              </div>
            )}

            {(entry?.customUrls && entry.customUrls.length > 0) && (
              <button
                onClick={() => dispatch(resetRpcUrls(activeChainId))}
                className="text-xs text-neutral-400 font-medium mt-3 hover:underline"
              >
                Reset to defaults
              </button>
            )}
          </Card>
        </div>
      </div>
      </PullToRefresh>
      <MainnetWarningModal
        isOpen={showMainnetWarning}
        onConfirm={handleMainnetConfirm}
        onCancel={() => setShowMainnetWarning(false)}
      />
    </>
  );
}
