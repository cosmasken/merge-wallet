import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { isAddress } from "viem";

import Button from "@/atoms/Button";
import Card from "@/atoms/Card";
import Address from "@/atoms/Address";
import WeiDisplay from "@/atoms/WeiDisplay";
import FiatValue from "@/atoms/FiatValue";
import PullToRefresh from "@/atoms/PullToRefresh";
import LoadingSkeleton from "@/atoms/LoadingSkeleton";
import SendIcon from "@/icons/SendIcon";
import ReceiveIcon from "@/icons/ReceiveIcon";
import HistoryIcon from "@/icons/HistoryIcon";
import {
  selectWalletAddress,
  selectWalletBalance,
  selectSeedBackedUp,
  setWalletBalance,
  selectTrackedTokens,
  selectUseSmartWallet,
  selectSmartWalletAddress,
  selectActiveAddress,
  addTrackedNft,
  removeTrackedNft,
  selectTrackedNfts,
} from "@/redux/wallet";
import { selectShouldHideBalance, toggleHideBalance, selectChainId } from "@/redux/preferences";
import AddTokenModal from "@/components/composite/AddTokenModal";
import DashboardHeader from "@/components/composite/DashboardHeader";
import { selectIsConnected } from "@/redux/device";
import BalanceService from "@/kernel/evm/BalanceService";
import TokenManagerService, { getTokenList } from "@/kernel/evm/TokenManagerService";
import type { TokenBalance, TokenInfo } from "@/kernel/evm/TokenManagerService";
import NftService from "@/kernel/evm/NftService";
import type { NftInfo } from "@/kernel/evm/NftService";
import { getNativeCurrency } from "@/chains";
import { useTranslation } from "@/translations";
import RifRelayService from "@/kernel/evm/RifRelayService";

export default function WalletHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const reduxBalance = useSelector(selectWalletBalance);
  const chainId = useSelector(selectChainId);
  const seedBackedUp = useSelector(selectSeedBackedUp);
  const isConnected = useSelector(selectIsConnected);
  const hideBalance = useSelector(selectShouldHideBalance);
  const trackedTokens = useSelector(selectTrackedTokens);
  
  const useSmartWallet = useSelector(selectUseSmartWallet);
  const smartWalletAddress = useSelector(selectSmartWalletAddress);
  const activeAddress = useSelector(selectActiveAddress);
  const [activeBalance, setActiveBalance] = useState("0");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const nativeCurrency = getNativeCurrency(chainId);
  const { t } = useTranslation();

  // NFT State
  const trackedNfts = useSelector(selectTrackedNfts);
  const [activeTab, setActiveTab] = useState<"tokens" | "nfts">("tokens");
  const [nfts, setNfts] = useState<NftInfo[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importAddress, setImportAddress] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  // Sync activeBalance with Redux balance initially or when switching to EOA
  useEffect(() => {
    if (!useSmartWallet) {
      setActiveBalance(reduxBalance);
    }
  }, [useSmartWallet, reduxBalance]);

  useEffect(function fetchBalance() {
    if (!activeAddress) return;

    setIsLoading(true);
    setConnectionError(false);
    const Balance = BalanceService(chainId);

    Balance.startAutoRefresh(
      activeAddress as `0x${string}`,
      (value) => {
        setActiveBalance(value.toString());
        if (!useSmartWallet) {
          dispatch(setWalletBalance(value.toString()));
        }
        setIsLoading(false);
        setConnectionError(false);
      },
      () => {
        setConnectionError(true);
        setIsLoading(false);
      },
    );

    return () => Balance.stopAutoRefresh();
  }, [activeAddress, chainId, useSmartWallet, dispatch]);

  useEffect(function fetchTokens() {
    if (!activeAddress) return;
    const allTokens: TokenInfo[] = [...getTokenList(chainId), ...trackedTokens.filter(t => t.chainId === chainId).map(t => ({
      address: t.address as `0x${string}`,
      symbol: t.symbol,
      decimals: t.decimals,
      chainId: t.chainId
    }))];
    TokenManagerService(chainId)
      .getAllTokenBalances(activeAddress as `0x${string}`, allTokens)
      .then(setTokens);
  }, [activeAddress, chainId, trackedTokens]);

  useEffect(function fetchNfts() {
    if (!activeAddress || trackedNfts.length === 0) {
      setNfts([]);
      return;
    }

    NftService()
      .getNftBalances(
        activeAddress as `0x${string}`,
        trackedNfts as `0x${string}`[],
      )
      .then(setNfts);
  }, [activeAddress, trackedNfts]);

  const refreshAll = useCallback(async () => {
    if (!activeAddress) return;
    setIsLoading(true);
    const Balance = BalanceService(chainId);
    const allTokens: TokenInfo[] = [...getTokenList(chainId), ...trackedTokens.filter(t => t.chainId === chainId).map(t => ({
      address: t.address as `0x${string}`,
      symbol: t.symbol,
      decimals: t.decimals,
      chainId: t.chainId
    }))];

    const [b, t, n] = await Promise.all([
      Balance.getBalance(activeAddress as `0x${string}`),
      TokenManagerService(chainId).getAllTokenBalances(activeAddress as `0x${string}`, allTokens),
      trackedNfts.length > 0
        ? NftService().getNftBalances(activeAddress as `0x${string}`, trackedNfts as `0x${string}`[])
        : Promise.resolve([] as NftInfo[]),
    ]);
    
    setActiveBalance(b.toString());
    if (!useSmartWallet) {
      dispatch(setWalletBalance(b.toString()));
    }
    setTokens(t);
    setNfts(n);
    setIsLoading(false);
  }, [activeAddress, chainId, dispatch, useSmartWallet, trackedTokens, trackedNfts]);

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
        activeAddress as `0x${string}`,
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
  }, [importAddress, activeAddress, dispatch]);

  return (
    <PullToRefresh onRefresh={refreshAll}>
    <div className="flex flex-col gap-6 px-4 pt-4">
      <DashboardHeader />

      {!isConnected && (
        <div className="w-full p-3 rounded-lg bg-error/10 border border-error/30 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <p className="text-xs text-error">{t("common.error")}: {t("wallet.home.no_internet")}</p>
        </div>
      )}

      {connectionError && isConnected && (
        <div className="w-full p-3 rounded-lg bg-warn-light/20 border border-warn/30 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-warn-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <p className="text-xs text-warn-dark">{t("wallet.home.network_error")}</p>
        </div>
      )}


      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          <div className="text-4xl font-bold font-display text-neutral-800 dark:text-neutral-100">
            {isLoading ? (
              <LoadingSkeleton variant="text" className="w-32 h-8 mx-auto" />
            ) : (
              <WeiDisplay wei={BigInt(activeBalance)} hideBalance={hideBalance} symbol={nativeCurrency.symbol} />
            )}
          </div>
          <button
            onClick={() => dispatch(toggleHideBalance())}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700"
          >
            {hideBalance ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {!hideBalance && (
          <FiatValue
            value={BigInt(activeBalance)}
            className="text-lg text-neutral-500"
          />
        )}

        <Address address={activeAddress} short className="text-xs text-neutral-400" />
      </div>

      <div className="flex gap-4 w-full">
        <Button
          label={t("common.send")}
          icon={SendIcon}
          variant="primary"
          fullWidth
          onClick={() => navigate("/wallet/send", { state: { useSmartWallet } })}
        />
        <Button
          label={t("common.receive")}
          icon={ReceiveIcon}
          variant="secondary"
          fullWidth
          onClick={() => navigate("/wallet/receive", { state: { useSmartWallet, smartWalletAddress } })}
        />
      </div>

      <div className="w-full">
        {/* Tab Selector */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 px-1">
          <button
            className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === "tokens"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            }`}
            onClick={() => setActiveTab("tokens")}
          >
            {t("common.tokens")}
          </button>
          <button
            className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === "nfts"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            }`}
            onClick={() => setActiveTab("nfts")}
          >
            NFTs
          </button>
        </div>

        {activeTab === "tokens" ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-500">{t("common.tokens")}</h2>
              <button 
                onClick={() => setIsAddTokenOpen(true)}
                className="text-xs font-semibold text-primary px-2 py-1 rounded-md hover:bg-primary/5 transition-colors"
              >
                + {t("wallet.home.add_token")}
              </button>
            </div>
            <div 
              onClick={() => navigate(`/wallet/token/${nativeCurrency.symbol}`)}
              className="flex items-center justify-between py-2.5 cursor-pointer active:opacity-70"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">{nativeCurrency.symbol}</div>
                <span className="font-semibold text-sm">{nativeCurrency.name}</span>
              </div>
              <span className="font-mono text-sm font-medium">
                {isLoading ? (
                  <LoadingSkeleton variant="text" className="w-16 h-4" />
                ) : (
                  <WeiDisplay wei={BigInt(activeBalance)} hideBalance={hideBalance} symbol={nativeCurrency.symbol} />
                )}
              </span>
            </div>
            {tokens.map((token) => (
              <div 
                key={token.symbol} 
                onClick={() => navigate(`/wallet/token/${token.symbol}`)}
                className="flex items-center justify-between py-2.5 border-t border-neutral-100 dark:border-neutral-800 cursor-pointer active:opacity-70 animate-in fade-in duration-300"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primarydark-200 flex items-center justify-center text-xs font-bold text-primary-900 dark:text-primarydark-900">
                    {token.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{token.symbol}</span>
                    {!hideBalance && (
                      <div className="text-xs text-neutral-400 mt-0.5">
                        <FiatValue wei={token.balance} fallbackClassName="inline" />
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-mono text-sm font-medium">
                  <WeiDisplay 
                    wei={token.balance} 
                    hideBalance={hideBalance} 
                    symbol={token.symbol} 
                    decimals={token.decimals} 
                  />
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-500">NFT Collections</h2>
              <button 
                onClick={() => setShowImport(true)}
                className="text-xs font-semibold text-primary px-2 py-1 rounded-md hover:bg-primary/5 transition-colors"
              >
                + Import NFT
              </button>
            </div>

            {nfts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-500">No NFTs tracked</p>
                  <p className="text-xs text-neutral-400 mt-0.5 max-w-xs mx-auto">Import an ERC-721 contract address to track your digital collectibles</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 animate-in fade-in duration-300">
                {nfts.map((nft) => (
                  <div
                    key={nft.address}
                    className="flex flex-col rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 shadow-sm"
                  >
                    <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center overflow-hidden border-b border-neutral-100 dark:border-neutral-800">
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
                        <div className="w-full h-full bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center p-3 text-center">
                          <span className="text-lg font-bold text-primary tracking-wide">
                            {nft.symbol.slice(0, 4)}
                          </span>
                          <span className="text-[9px] text-neutral-400 mt-1 uppercase tracking-wider font-semibold truncate max-w-full">
                            {nft.name.slice(0, 16)}
                          </span>
                        </div>
                      )}

                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                        {nft.balance.toString()} Owned
                      </span>
                    </div>

                    <div className="p-2.5 flex flex-col gap-1.5 justify-between flex-1">
                      <div>
                        <div className="font-bold text-xs truncate text-neutral-800 dark:text-neutral-100">{nft.name}</div>
                        <div className="text-[9px] text-neutral-400 font-mono truncate">{nft.address.slice(0, 6)}...{nft.address.slice(-4)}</div>
                      </div>

                      <button
                        onClick={() => dispatch(removeTrackedNft(nft.address))}
                        className="w-full py-1.5 rounded-lg border border-red-100 hover:bg-red-50 dark:border-red-950/20 dark:hover:bg-red-950/20 text-red-500 text-[10px] font-bold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <Button
        label={t("wallet.home.history_button") || t("common.history")}
        icon={HistoryIcon}
        variant="ghost"
        onClick={() => navigate("/wallet/history")}
      />
    </div>
      <AddTokenModal 
        isOpen={isAddTokenOpen} 
        onClose={() => setIsAddTokenOpen(false)} 
      />
      {showImport && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { setShowImport(false); setImportError(""); }}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-sm border border-neutral-200 dark:border-neutral-700 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">Import NFT Collection</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter the ERC-721 contract address to track this collection in your wallet.
            </p>
            <input
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-mono outline-none focus:border-primary"
              placeholder="0x..."
              value={importAddress}
              onChange={(e) => { setImportAddress(e.target.value); setImportError(""); }}
            />
            {importError && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">{importError}</p>
            )}
            <div className="flex gap-2 mt-5">
              <Button
                label="Cancel"
                variant="ghost"
                fullWidth
                onClick={() => { setShowImport(false); setImportError(""); }}
              />
              <Button
                label={importing ? "Verifying..." : "Import"}
                variant="primary"
                fullWidth
                disabled={!importAddress.trim() || importing}
                onClick={handleImport}
              />
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  );
}
