import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isAddress, formatEther } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import WeiDisplay from "@/atoms/WeiDisplay";
import Button from "@/atoms/Button";
import { selectWalletAddress, selectWalletBalance, addTrackedNft, removeTrackedNft, selectTrackedNfts } from "@/redux/wallet";
import { selectNetwork } from "@/redux/preferences";
import TokenManagerService, { getTokenList } from "@/kernel/evm/TokenManagerService";
import type { TokenBalance } from "@/kernel/evm/TokenManagerService";
import NftService from "@/kernel/evm/NftService";
import type { NftInfo } from "@/kernel/evm/NftService";

type Tab = "tokens" | "nfts";

export default function AssetsView() {
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectWalletBalance);
  const network = useSelector(selectNetwork);
  const trackedNfts = useSelector(selectTrackedNfts);
  const [activeTab, setActiveTab] = useState<Tab>("tokens");
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [nfts, setNfts] = useState<NftInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importAddress, setImportAddress] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(function fetchTokens() {
    if (!address) return;

    setIsLoading(true);
    TokenManagerService(network)
      .getAllTokenBalances(address as `0x${string}`, getTokenList(network))
      .then(setTokens)
      .finally(() => setIsLoading(false));
  }, [address, network]);

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
    <div>
      <ViewHeader title="Assets" />
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 px-4">
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "tokens"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500"
          }`}
          onClick={() => setActiveTab("tokens")}
        >
          Tokens
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "nfts"
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
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">RBTC</div>
              <div>
                <div className="font-medium text-sm">Rootstock RBTC</div>
                <div className="text-xs text-neutral-500">Native</div>
              </div>
            </div>
            <div className="font-mono text-sm">
              <WeiDisplay value={BigInt(balance)} />
            </div>
          </div>

          {isLoading ? (
            [1, 2].map((i) => (
              <div key={i} className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))
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
                  </div>
                </div>
                <div className="font-mono text-sm">
                  <WeiDisplay value={token.balance} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "nfts" && (
        <div className="flex flex-col px-4 pt-4 gap-2">
          {nfts.length === 0 ? (
            <p className="text-center text-neutral-500 pt-8">No NFTs tracked</p>
          ) : (
            nfts.map((nft) => (
              <div
                key={nft.address}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primarydark-200 flex items-center justify-center text-xs font-bold text-primary-900 dark:text-primarydark-900">
                    {nft.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{nft.name}</div>
                    <div className="text-xs text-neutral-500">
                      {nft.balance.toString()} owned
                    </div>
                  </div>
                </div>
                <button
                  className="text-xs text-red-500 p-1"
                  onClick={() => dispatch(removeTrackedNft(nft.address))}
                >
                  Remove
                </button>
              </div>
            ))
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
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
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
  );
}
