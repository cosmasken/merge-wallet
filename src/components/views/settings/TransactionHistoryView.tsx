import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";

import ViewHeader from "@/layout/ViewHeader";
import Button from "@/atoms/Button";
import { selectWalletAddress, selectPendingTransactions } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import TransactionHistoryService, { type TxHistoryEntry } from "@/kernel/evm/TransactionHistoryService";

export default function TransactionHistoryView() {
  const navigate = useNavigate();
  const address = useSelector(selectWalletAddress);
  const chainId = useSelector(selectChainId);
  const pendingTxs = useSelector(selectPendingTransactions);
  const [history, setHistory] = useState<TxHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    setIsLoading(true);
    TransactionHistoryService(chainId)
      .getHistory(address as `0x${string}`)
      .then(setHistory)
      .finally(() => setIsLoading(false));
  }, [address, chainId]);

  const allTxs = [
    ...pendingTxs.map(tx => ({
      hash: tx.hash,
      from: address,
      to: "",
      value: 0n,
      blockNumber: 0,
      timestamp: tx.timestamp,
      status: tx.status as "pending" | "success" | "failed",
      symbol: tx.symbol,
      amount: tx.amount,
    })),
    ...history.filter(h => !pendingTxs.some(p => p.hash === h.hash)),
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div>
      <ViewHeader title="Transaction History" showBack />
      <div className="flex flex-col gap-2 px-4 pt-4">
        {isLoading && pendingTxs.length === 0 && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        )}

        {allTxs.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p className="text-neutral-500">No transactions yet</p>
            <p className="text-xs text-neutral-400 max-w-xs">Your transactions will appear here</p>
          </div>
        )}

        {allTxs.slice(0, 50).map(tx => (
          <div key={tx.hash} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                tx.status === "success" ? "bg-success/20" :
                tx.status === "failed" ? "bg-error/20" :
                "bg-warn/20 animate-pulse"
              }`}>
                {tx.status === "success" ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-success" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : tx.status === "failed" ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-error" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-warn" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {"symbol" in tx && (tx as typeof tx & { symbol: string }).symbol
                    ? `${(tx as typeof tx & { amount: string }).amount} ${(tx as typeof tx & { symbol: string }).symbol}`
                    : tx.hash.slice(0, 10) + "..."}
                </div>
                <div className="text-xs text-neutral-500">
                  {tx.status === "pending" ? "Confirming..." :
                   tx.status === "success" ? "Confirmed" : "Failed"}
                  {" · "}{new Date(tx.timestamp * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tx/${tx.hash}`);
              }}
              className="text-primary text-xs shrink-0 hover:underline font-semibold"
            >
              View
            </button>
          </div>
        ))}

        {allTxs.length > 50 && (
          <p className="text-xs text-neutral-400 text-center pt-2 pb-4">
            Showing last 50 transactions
          </p>
        )}
      </div>
    </div>
  );
}
