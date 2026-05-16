import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { selectPendingTransactions, updatePendingTransaction } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import TransactionManagerService from "@/kernel/evm/TransactionManagerService";

export default function TransactionTracker() {
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const pendingTxs = useSelector(selectPendingTransactions);
  const activePolls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activePending = pendingTxs.filter(tx => tx.status === "pending" && tx.chainId === chainId);
    
    activePending.forEach(tx => {
      if (activePolls.current.has(tx.hash)) return;

      activePolls.current.add(tx.hash);
      
      const txManager = TransactionManagerService(chainId);
      
      txManager.waitForReceipt(tx.hash as `0x${string}`)
        .then((receipt) => {
          dispatch(updatePendingTransaction({
            hash: tx.hash,
            status: receipt.status === "success" ? "success" : "failed"
          }));
        })
        .catch((err) => {
          console.error(`Failed to track transaction ${tx.hash}:`, err);
        })
        .finally(() => {
          activePolls.current.delete(tx.hash);
        });
    });
  }, [pendingTxs, chainId, dispatch]);

  return null; // Background component
}
