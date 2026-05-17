import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";
import Address from "@/atoms/Address";
import { selectWallets, selectActiveWalletId, setActiveWallet, setWalletAddress, removeWalletById, renameWallet, addWallet } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import SecureStorageService from "@/kernel/app/SecureStorageService";
import BalanceService from "@/kernel/evm/BalanceService";
import NotificationService from "@/kernel/app/NotificationService";

export default function WalletManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const chainId = useSelector(selectChainId);
  const wallets = useSelector(selectWallets);
  const activeWalletId = useSelector(selectActiveWalletId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    const Balance = BalanceService(chainId);
    Promise.all(
      wallets.map(async (w) => {
        try {
          const b = await Balance.getBalance(w.address as `0x${string}`);
          return [w.id, b.toString()] as const;
        } catch {
          return [w.id, "0"] as const;
        }
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach(([id, b]) => { map[id] = b; });
      setBalances(map);
    });
  }, [wallets, chainId]);

  const handleSwitch = useCallback(async (id: string) => {
    if (id === activeWalletId) { return; }
    const KeyManager = KeyManagerService();
    const loaded = await KeyManager.loadWalletById(id);
    if (loaded) {
      dispatch(setActiveWallet(id));
      dispatch(setWalletAddress(KeyManager.getAddress()));
      navigate("/wallet");
    }
  }, [activeWalletId, dispatch, navigate]);

  const handleDelete = useCallback(async (id: string) => {
    if (wallets.length <= 1) {
      NotificationService().error("Cannot delete the last wallet");
      return;
    }
    await SecureStorageService().deleteWallet(id);
    dispatch(removeWalletById(id));
    NotificationService().success("Wallet deleted");
  }, [wallets.length, dispatch]);

  const handleRename = useCallback((id: string) => {
    const w = wallets.find(w => w.id === id);
    if (w) {
      setRenamingId(id);
      setRenameValue(w.name);
    }
  }, [wallets]);

  const handleRenameSubmit = useCallback(async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== wallets.find(w => w.id === id)?.name) {
      dispatch(renameWallet({ id, name: trimmed }));
      const s = SecureStorageService();
      const entries = await s.listWallets();
      const entry = entries.find(e => e.id === id);
      if (entry) {
        entry.name = trimmed;
        await s.saveWalletIndex(entries);
      }
    }
    setRenamingId(null);
  }, [renameValue, wallets, dispatch]);

  return (
    <div>
      <ViewHeader title="Manage Wallets" showBack />
      <div className="flex flex-col gap-3 px-4">
        {wallets.length === 0 && (
          <p className="text-center text-neutral-400 py-8">No wallets found</p>
        )}
        {wallets.map((w) => (
          <div
            key={w.id}
            className={`p-4 rounded-xl border transition-colors ${
              w.id === activeWalletId
                ? "border-primary bg-primary/5"
                : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {w.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {renamingId === w.id ? (
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(w.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(w.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full text-sm font-medium bg-neutral-100 dark:bg-neutral-800 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                ) : (
                  <div className="text-sm font-medium truncate">{w.name}</div>
                )}
                <Address address={w.address} short className="text-xs text-neutral-400" />
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-medium">
                  {balances[w.id] !== undefined
                    ? `${(BigInt(balances[w.id]) / 10n ** 18n).toString()} RBTC`
                    : "—"}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {w.id !== activeWalletId && (
                <button
                  onClick={() => handleSwitch(w.id)}
                  className="flex-1 py-2 text-xs font-medium rounded-lg bg-primary/10 text-primary active:bg-primary/20"
                >
                  Switch
                </button>
              )}
              <button
                onClick={() => handleRename(w.id)}
                className={`py-2 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 active:bg-neutral-200 dark:active:bg-neutral-700 ${w.id === activeWalletId ? "flex-1" : ""}`}
              >
                Rename
              </button>
              {wallets.length > 1 && (
                <button
                  onClick={() => handleDelete(w.id)}
                  className="py-2 px-3 text-xs font-medium rounded-lg bg-error/10 text-error active:bg-error/20"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => navigate("/onboarding")}
          className="w-full p-4 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 font-medium flex items-center justify-center gap-2 active:bg-neutral-100 dark:active:bg-neutral-800 mt-2"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Wallet
        </button>
      </div>
    </div>
  );
}
