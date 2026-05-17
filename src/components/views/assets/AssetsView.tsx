import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isAddress } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import DashboardHeader from "@/components/composite/DashboardHeader";
import PullToRefresh from "@/atoms/PullToRefresh";
import WeiDisplay from "@/atoms/WeiDisplay";
import FiatValue from "@/atoms/FiatValue";
import Button from "@/atoms/Button";
import { TokenSkeleton } from "@/atoms/LoadingSkeleton";
import ErrorState from "@/atoms/ErrorState";
import { selectWalletAddress, selectWalletBalance, selectActiveAddress, addTrackedNft, removeTrackedNft, selectTrackedNfts } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import TokenManagerService, { getTokenList } from "@/kernel/evm/TokenManagerService";
import type { TokenBalance } from "@/kernel/evm/TokenManagerService";
import { getNativeCurrency } from "@/chains";
import NftService from "@/kernel/evm/NftService";
import type { NftInfo } from "@/kernel/evm/NftService";

type Tab = "tokens" | "nfts";

export default function AssetsView() {
  const dispatch = useDispatch();
  const address = useSelector(selectActiveAddress);
  const balance = useSelector(selectWalletBalance);
  const chainId = useSelector(selectChainId);
  const trackedNfts = useSelector(selectTrackedNfts);
  const [activeTab, setActiveTab] = useState<Tab>("tokens");
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [nfts, setNfts] = useState<NftInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importAddress, setImportAddress] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const nativeCurrency = getNativeCurrency(chainId);

  useEffect(function fetchTokens() {
    if (!address) return;

    setIsLoading(true);
    setError(null);
    TokenManagerService(chainId)
      .getAllTokenBalances(address as `0x${string}`, getTokenList(chainId))
      .then(setTokens)
      .catch(() => setError("Failed to load token balances"))
      .finally(() => setIsLoading(false));
  }, [address, chainId]);

  useEffect(function fetchNfts() {
    if (!address || trackedNfts.length === 0) {
      setNfts([]);
      return;
    }

    NftService()
      .getNftBalances(
        address as `0x${string}`,
        trackedNfts as `0x${string}`[],
      )
      .then(setNfts);
  }, [address, trackedNfts]);

  const refreshAll = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const [t, n] = await Promise.all([
        TokenManagerService(chainId).getAllTokenBalances(address as `0x${string}`, getTokenList(chainId)),
        trackedNfts.length > 0
          ? NftService().getNftBalances(address as `0x${string}`, trackedNfts as `0x${string}`[])
          : Promise.resolve([] as NftInfo[]),
      ]);
      setTokens(t);
      setNfts(n);
    } catch {
      setError("Failed to refresh data");
    }
    setIsLoading(false);
  }, [address, chainId, trackedNfts]);

  const handleImport = useCallback(async () => {
    const trimmed = importAddress.trim();
    if (!isAddress(trimmed)) {
      setImportError("Invalid contract address");
      return;
    }

    setImporting(true);
    setImportError("");

    try {
      const info = await NftService().getNftBalance(
        trimmed as `0x${string}`,
        address as `0x${string}`,
      );

      if (!info) {
        setImportError("Could not verify NFT contract at this address");
        return;
      }

      dispatch(addTrackedNft(trimmed as `0x${string}`));
      setShowImport(false);
      setImportAddress("");
    } catch {
      setImportError("Failed to verify contract address");
    } finally {
      setImporting(false);
    }
  }, [importAddress, address, dispatch]);

  return (
    <PullToRefresh onRefresh={refreshAll}>
      <div className="pt-4">
        <div className="px-4">
          <DashboardHeader />
        </div>
        <ViewHeader title="Assets" />
        <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-4">
          <button
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "tokens"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500"
              }`}
            onClick={() => setActiveTab("tokens")}
          >
            Tokens
          </button>
          <button
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "nfts"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500"
              }`}
            onClick={() => setActiveTab("nfts")}
          >
            NFTs
          </button>
        </div>

        {activeTab === "tokens" && (
          <div className="flex flex-col px-4 pt-4 gap-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">{nativeCurrency.symbol}</div>
                <div>
                  <div className="font-medium text-sm">{nativeCurrency.name}</div>
                  <div className="text-xs text-neutral-500">Native</div>
                  <FiatValue value={BigInt(balance)} className="text-xs text-neutral-400" />
                </div>
              </div>
              <div className="font-mono text-sm">
                <WeiDisplay value={BigInt(balance)} symbol={nativeCurrency.symbol} />
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <TokenSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState
                title="Failed to Load Tokens"
                message={error}
                action={{
                  label: "Retry",
                  onClick: refreshAll
                }}
              />
            ) : (
              tokens.map((token) => (
                <div
                  key={token.address}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primarydark-200 flex items-center justify-center text-xs font-bold text-primary-900 dark:text-primarydark-900">
                      {token.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{token.symbol}</div>
                      <div className="text-xs text-neutral-500">ERC-20</div>
                      <FiatValue value={token.balance} className="text-xs text-neutral-400" />
                    </div>
                  </div>
                  <div className="font-mono text-sm">
                    <WeiDisplay value={token.balance} symbol={token.symbol} />
                  </div>
                </div>
              ))
            )}

            {!isLoading && tokens.length === 0 && (
              <div className="flex flex-col items-center gap-3 pt-12 text-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <p className="text-neutral-500">No tokens found</p>
                <p className="text-xs text-neutral-400 max-w-xs">Your ERC-20 tokens will appear here when you receive them</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "nfts" && (
          <div className="flex flex-col px-4 pt-4 gap-2">
            {nfts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-12 text-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-neutral-500">No NFTs tracked</p>
                <p className="text-xs text-neutral-400 max-w-xs">Import an ERC-721 contract address to track your NFTs</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {nfts.map((nft) => (
                  <div
                    key={nft.address}
                    className="flex flex-col rounded-xl overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm transition-all hover:shadow-md"
                  >
                    {/* Image / Fallback Container */}
                    <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden border-b border-neutral-200 dark:border-neutral-700">
                      {nft.image ? (
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full h-full object-cover animate-in fade-in duration-500"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-2xl font-bold text-primary dark:text-primary-light tracking-wide font-display">
                            {nft.symbol.slice(0, 4)}
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-medium">
                            {nft.name.slice(0, 16)}
                          </span>
                        </div>
                      )}

                      {/* Badge for balance */}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                        {nft.balance.toString()} Owned
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 flex flex-col gap-2">
                      <div>
                        <div className="font-semibold text-sm truncate text-neutral-800 dark:text-neutral-100">{nft.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono truncate">{nft.address.slice(0, 6)}...{nft.address.slice(-4)}</div>
                      </div>

                      <div className="flex gap-1.5 mt-1">
                        {/* Transfer button (Coming Soon) */}
                        <button
                          disabled
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 text-[10px] font-bold cursor-not-allowed border border-neutral-200/50 dark:border-neutral-600/50"
                        >
                          Transfer
                          <span className="px-1 py-0.2 rounded bg-neutral-200 dark:bg-neutral-600 text-neutral-500 text-[8px] scale-90 origin-center">Soon</span>
                        </button>

                        {/* Remove Tracked NFT button */}
                        <button
                          onClick={() => dispatch(removeTrackedNft(nft.address))}
                          className="px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 text-[10px] font-bold transition-colors"
                          title="Stop tracking this NFT collection"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Button
                label="Import NFT"
                variant="secondary"
                fullWidth
                onClick={() => setShowImport(true)}
              />
            </div>
          </div>
        )}

        {showImport && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowImport(false); setImportError(""); }}
          >
            <div
              className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-sm border border-neutral-200 dark:border-neutral-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Import NFT</h3>
              <p className="text-sm text-neutral-500 mb-4">
                Enter the ERC-721 contract address to track an NFT collection.
              </p>
              <input
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono outline-none focus:border-primary"
                placeholder="0x..."
                value={importAddress}
                onChange={(e) => { setImportAddress(e.target.value); setImportError(""); }}
              />
              {importError && (
                <p className="text-xs text-red-500 mt-1">{importError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  label="Cancel"
                  variant="ghost"
                  onClick={() => { setShowImport(false); setImportError(""); }}
                />
                <Button
                  label={importing ? "Verifying..." : "Import"}
                  variant="primary"
                  disabled={!importAddress.trim() || importing}
                  onClick={handleImport}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
