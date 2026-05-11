import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import WeiDisplay from "@/atoms/WeiDisplay";
import { selectWalletAddress } from "@/redux/wallet";
import TokenManagerService from "@/kernel/evm/TokenManagerService";

interface TokenBalance {
  address: `0x${string}`
  symbol: string
  balance: bigint
}

const RIF_MAINNET = "0x2acc95758f8b5f583470bA265E685CF8e3f4283b";
const RIF_TESTNET = "0x19F64674D8A5B4E652319F5e239eFd3bc969a1fE";
const TRACKED_TOKENS = [RIF_TESTNET, RIF_MAINNET];

type Tab = "tokens" | "nfts";

export default function AssetsView() {
  const address = useSelector(selectWalletAddress);
  const [activeTab, setActiveTab] = useState<Tab>("tokens");
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(function fetchTokens() {
    if (!address) return;

    setIsLoading(true);
    TokenManagerService()
      .getTokenBalances(
        address as `0x${string}`,
        TRACKED_TOKENS as `0x${string}`[],
      )
      .then(setTokens)
      .finally(() => setIsLoading(false));
  }, [address]);

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
          {isLoading ? (
            [1, 2].map((i) => (
              <div key={i} className="h-14 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))
          ) : tokens.length === 0 ? (
            <p className="text-center text-neutral-500 pt-8">No token balances found</p>
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
        <p className="text-center text-neutral-500 pt-8 px-4">No NFTs yet</p>
      )}
    </div>
  );
}
