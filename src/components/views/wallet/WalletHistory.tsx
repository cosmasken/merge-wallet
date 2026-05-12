import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import WeiDisplay from "@/atoms/WeiDisplay";
import Address from "@/atoms/Address";
import { selectWalletAddress } from "@/redux/wallet";
import { selectNetwork } from "@/redux/preferences";
import { buildTxUrl } from "@/util/networks";
import TransactionHistoryService, { type TxHistoryEntry } from "@/kernel/evm/TransactionHistoryService";
import TransactionExportService from "@/kernel/evm/TransactionExportService";

export default function WalletHistory() {
  const address = useSelector(selectWalletAddress);
  const network = useSelector(selectNetwork);
  const [txs, setTxs] = useState<TxHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(function fetchHistory() {
    if (!address) return;

    setIsLoading(true);
    TransactionHistoryService(network)
      .getHistory(address as `0x${string}`)
      .then(setTxs)
      .finally(() => setIsLoading(false));
  }, [address]);

  const handleExport = async () => {
    if (!address) return;
    setExporting(true);
    try {
      await TransactionExportService(network).exportCsv(address as `0x${string}`);
    } catch {
      // silently fail
    }
    setExporting(false);
  };

  return (
    <div>
      <ViewHeader title="History" subtitle="Your transaction history" showBack />
      {isLoading ? (
        <div className="flex flex-col gap-3 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-neutral-500">No transactions yet</p>
        </div>
      ) : (
        <div className="flex flex-col px-4 gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="self-end px-3 py-1.5 rounded-full border border-primary text-primary text-xs font-medium active:bg-primary/10 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          {txs.map((tx) => {
            const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
            return (
              <a
                key={tx.hash}
                href={buildTxUrl(network, tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isOutgoing ? "bg-warn-light text-warn-dark" : "bg-success-light text-success-dark"}`}>
                      {isOutgoing ? "SENT" : "RECEIVED"}
                    </span>
                    <span className={`text-xs ${tx.status === "success" ? "text-success" : tx.status === "pending" ? "text-warn" : "text-error"}`}>
                      {tx.status.toUpperCase()}
                    </span>
                  </div>
                  <Address address={isOutgoing ? tx.to : tx.from} short className="text-xs text-neutral-500" />
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm ${isOutgoing ? "text-error" : "text-success"}`}>
                    {isOutgoing ? "-" : "+"}<WeiDisplay value={tx.value} />
                  </div>
                  <div className="text-xs text-neutral-400">
                    {new Date(tx.timestamp * 1000).toLocaleDateString()}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
