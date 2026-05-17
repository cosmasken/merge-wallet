import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";

import ViewHeader from "@/layout/ViewHeader";
import PullToRefresh from "@/atoms/PullToRefresh";
import WeiDisplay from "@/atoms/WeiDisplay";
import Address from "@/atoms/Address";
import { TransactionSkeleton } from "@/atoms/LoadingSkeleton";
import ErrorState from "@/atoms/ErrorState";
import { selectWalletAddress } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import TransactionHistoryService, { type TxHistoryEntry } from "@/kernel/evm/TransactionHistoryService";
import TransactionExportService from "@/kernel/evm/TransactionExportService";
import { getNativeCurrency } from "@/chains";
import { useTranslation } from "@/translations";

export default function WalletHistory() {
  const navigate = useNavigate();
  const address = useSelector(selectWalletAddress);
  const chainId = useSelector(selectChainId);
  const [txs, setTxs] = useState<TxHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const nativeCurrency = getNativeCurrency(chainId);
  const { t } = useTranslation();

  useEffect(function fetchHistory() {
    if (!address) return;

    setIsLoading(true);
    setError(null);
    TransactionHistoryService(chainId)
      .getHistory(address as `0x${string}`)
      .then(setTxs)
      .catch(() => setError(t("wallet.history.failed_load")))
      .finally(() => setIsLoading(false));
  }, [address, chainId, t]);

  const refreshHistory = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const txs = await TransactionHistoryService(chainId).getHistory(address as `0x${string}`);
      setTxs(txs);
    } catch {
      setError(t("wallet.history.failed_refresh"));
    }
  }, [address, chainId, t]);

  const handleExport = async () => {
    if (!address) return;
    setExporting(true);
    try {
      await TransactionExportService(chainId).exportCsv(address as `0x${string}`);
    } catch {
      // silently fail
    }
    setExporting(false);
  };

  return (
    <PullToRefresh onRefresh={refreshHistory}>
      <div>
        <ViewHeader title={t("wallet.history.title")} subtitle={t("wallet.history.subtitle")} showBack />
        {isLoading ? (
          <div className="flex flex-col gap-3 px-4">
            {[1, 2, 3].map((i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title={t("common.error")}
            message={error}
            action={{
              label: t("wallet.history.retry"),
              onClick: refreshHistory
            }}
          />
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3zM21 9H3M9 21V9" />
              </svg>
            </div>
            <div>
              <p className="text-neutral-500 font-medium">{t("wallet.history.no_transactions")}</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs">{t("wallet.history.no_transactions_desc")}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col px-4 gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="self-end px-3 py-1.5 rounded-full border border-primary text-primary text-xs font-medium active:bg-primary/10 disabled:opacity-50"
            >
              {exporting ? t("wallet.history.exporting") : t("wallet.history.export_csv")}
            </button>
            {txs.map((tx) => {
              const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
              return (
                <button
                  key={tx.hash}
                  onClick={() => navigate(`/tx/${tx.hash}`)}
                  className="text-left w-full flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isOutgoing ? "bg-warn-light text-warn-dark" : "bg-success-light text-success-dark"}`}>
                        {isOutgoing ? t("wallet.history.sent") : t("wallet.history.received")}
                      </span>
                      <span className={`text-xs ${tx.status === "success" ? "text-success" : tx.status === "pending" ? "text-warn" : "text-error"}`}>
                        {t(`wallet.history.status_${tx.status}`)}
                      </span>
                    </div>
                    <Address address={isOutgoing ? tx.to : tx.from} short className="text-xs text-neutral-500" />
                  </div>
                  <div className="text-right">
                    <div className={`font-mono text-sm ${isOutgoing ? "text-error" : "text-success"}`}>
                      {isOutgoing ? "-" : "+"}<WeiDisplay value={tx.value} symbol={nativeCurrency.symbol} />
                    </div>
                    <div className="text-xs text-neutral-400">
                      {new Date(tx.timestamp * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
