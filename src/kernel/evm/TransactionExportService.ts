import { formatEther } from "viem";

import TransactionHistoryService from "@/kernel/evm/TransactionHistoryService";

export default function TransactionExportService(chainId?: number) {
  async function exportCsv(address: `0x${string}`): Promise<void> {
    const history = TransactionHistoryService(chainId);
    const txs = await history.getHistory(address);

    if (txs.length === 0) {
      throw new Error("No transactions to export");
    }

    const headers = ["Date", "Transaction ID", "From", "To", "Value", "Status"];
    const rows = txs.map((tx) => {
      const isOutgoing = tx.from.toLowerCase() === address.toLowerCase();
      const value = formatEther(tx.value);
      const signed = isOutgoing ? `-${value}` : value;
      return [
        new Date(tx.timestamp * 1000).toISOString(),
        tx.hash,
        tx.from,
        tx.to,
        signed,
        tx.status,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    downloadCsv(csv);
  }

  function downloadCsv(csv: string): void {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `transactions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { exportCsv };
}
