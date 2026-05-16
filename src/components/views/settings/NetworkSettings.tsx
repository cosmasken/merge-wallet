import { useCallback, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPublicClient, http } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import PullToRefresh from "@/atoms/PullToRefresh";
import Button from "@/atoms/Button";
import Card from "@/atoms/Card";
import { selectChainId, setChainId } from "@/redux/preferences";
import { addRpcUrl, removeRpcUrl, resetRpcUrls, toggleRpcUrl, selectRpcOverrides } from "@/redux/rpc";
import { NETWORK_FAMILIES, getFamilyForChain, getFamilyChainIds, getChainConfig } from "@/chains";
import type { NetworkFamily } from "@/chains";

interface UrlStatus {
  url: string;
  ok: boolean | null;
  testing: boolean;
}

const FAMILY_KEYS = Object.keys(NETWORK_FAMILIES) as NetworkFamily[];

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label ?? (checked ? "Mainnet" : "Testnet")}</span>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${!checked ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"}`}>Testnet</span>
        <button
          onClick={onChange}
          type="button"
          className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-600"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`} />
        </button>
        <span className={`text-xs font-medium ${checked ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"}`}>Mainnet</span>
      </div>
    </div>
  );
}

export default function NetworkSettings() {
  const dispatch = useDispatch();
  const currentChainId = useSelector(selectChainId);
  const overrides = useSelector(selectRpcOverrides);
  const [testing, setTesting] = useState(false);
  const [urlStatus, setUrlStatus] = useState<Record<string, UrlStatus>>({});
  const [addingUrl, setAddingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [familyOpen, setFamilyOpen] = useState(false);
  const familyRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  const currentFamily = getFamilyForChain(currentChainId) ?? FAMILY_KEYS[0];
  const [selectedFamily, setSelectedFamily] = useState<NetworkFamily>(currentFamily);
  const [isMainnet, setIsMainnet] = useState(() => {
    const info = NETWORK_FAMILIES[selectedFamily];
    return currentChainId === info.mainnet;
  });

  const activeChainId = isMainnet
    ? NETWORK_FAMILIES[selectedFamily].mainnet
    : NETWORK_FAMILIES[selectedFamily].testnet;

  const chainConfig = getChainConfig(activeChainId);

  useEffect(() => {
    const family = getFamilyForChain(currentChainId);
    if (family) {
      setSelectedFamily(family);
      const info = NETWORK_FAMILIES[family];
      setIsMainnet(currentChainId === info.mainnet);
    }
  }, [currentChainId]);

  useEffect(() => {
    if (addingUrl && addRef.current) {
      addRef.current.focus();
    }
  }, [addingUrl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (familyRef.current && !familyRef.current.contains(e.target as Node)) {
        setFamilyOpen(false);
      }
    }
    if (familyOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [familyOpen]);

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
    const family = getFamilyForChain(chainId);
    if (!family) return;
    const info = NETWORK_FAMILIES[family];
    const chainIds = [info.mainnet, info.testnet];
    for (const cid of chainIds) {
      const config = getChainConfig(cid);
      if (!config) continue;
      const entry = overrides[cid];
      const urls = [...config.rpcUrls, ...(entry?.customUrls ?? [])];
      for (const url of urls) {
        if (entry?.disabledUrls.includes(url)) continue;
        try {
          const transport = http(url);
          const client = createPublicClient({ transport });
          await client.getBlockNumber();
          setUrlStatus(prev => ({ ...prev, [url]: { url, ok: true, testing: false } }));
        } catch {
          setUrlStatus(prev => ({ ...prev, [url]: { url, ok: false, testing: false } }));
        }
      }
    }
  }, [overrides]);

  useEffect(function autoTestOnMount() {
    testConnection(activeChainId);
  }, [activeChainId, testConnection]);

  const switchChain = (mainnet: boolean) => {
    const info = NETWORK_FAMILIES[selectedFamily];
    const chainId = mainnet ? info.mainnet : info.testnet;
    dispatch(setChainId(chainId));
    setIsMainnet(mainnet);
  };

  const switchFamily = (family: NetworkFamily) => {
    setSelectedFamily(family);
    const info = NETWORK_FAMILIES[family];
    const chainId = info.mainnet;
    dispatch(setChainId(chainId));
    setIsMainnet(true);
    setUrlStatus({});
    setFamilyOpen(false);
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
        <ViewHeader title="Network" subtitle="Multichain network configuration" showBack />
        <div className="flex flex-col gap-4 px-4">

          {/* Network Family Dropdown — overlay style */}
          <div ref={familyRef} className="relative">
            <button
              onClick={() => setFamilyOpen(!familyOpen)}
              className="w-full text-left"
              type="button"
            >
              <Card className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-0.5">Network</div>
                    <div className="font-medium">{NETWORK_FAMILIES[selectedFamily].name}</div>
                  </div>
                  <svg
                    viewBox="0 0 20 20"
                    className={`w-5 h-5 text-neutral-400 transition-transform ${familyOpen ? "rotate-180" : ""}`}
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </Card>
            </button>

            {familyOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFamilyOpen(false)} />
                <div className="fixed inset-x-4 z-50 top-1/4 bottom-24 overflow-y-auto bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl">
                  {FAMILY_KEYS.map(family => {
                    const isActive = family === selectedFamily;
                    const [m, t] = getFamilyChainIds(family);
                    const statuses = [m, t].flatMap(cid => {
                      const config = getChainConfig(cid);
                      if (!config) return [];
                      const e = overrides[cid];
                      return [...config.rpcUrls, ...(e?.customUrls ?? [])].filter(u => !e?.disabledUrls.includes(u));
                    });
                    const anyOnline = statuses.some(u => urlStatus[u]?.ok === true);
                    const anyOffline = statuses.some(u => urlStatus[u]?.ok === false);
                    return (
                      <button
                        key={family}
                        onClick={() => switchFamily(family)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-neutral-100 dark:border-neutral-700 last:border-0 ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                        }`}
                      >
                        <span>{NETWORK_FAMILIES[family].name}</span>
                        <div className="flex items-center gap-2">
                          {anyOnline && !anyOffline ? (
                            <div className="w-2 h-2 rounded-full bg-success" />
                          ) : anyOffline && !anyOnline ? (
                            <div className="w-2 h-2 rounded-full bg-error" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-neutral-300" />
                          )}
                          {isActive && (
                            <svg viewBox="0 0 16 16" className="w-4 h-4 text-primary" fill="currentColor">
                              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Mainnet / Testnet Toggle Switch */}
          <Card className="p-4">
            <ToggleSwitch checked={isMainnet} onChange={() => switchChain(!isMainnet)} />
          </Card>

          {/* Active Chain Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{chainConfig.name}</div>
              <div className="text-xs text-neutral-500">
                Chain ID: {chainConfig.id} · {chainConfig.nativeCurrency.symbol} · {chainConfig.gasType === "eip1559" ? "EIP-1559" : "Legacy"}
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

          {/* Block Explorer */}
          {chainConfig.blockExplorer && (
            <div className="text-xs text-neutral-500">
              Explorer: <span className="text-primary font-mono">{chainConfig.blockExplorer.url}</span>
            </div>
          )}

          {/* RPC URLs */}
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
                    if (e.key === 'Escape') { setAddingUrl(false); setNewUrl(""); }
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
    </>
  );
}
