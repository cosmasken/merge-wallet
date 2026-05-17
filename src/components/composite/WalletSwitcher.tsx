import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import KeyManagerService from "@/kernel/evm/KeyManagerService";
import { selectWallets, selectActiveWalletId, setActiveWallet, setWalletAddress } from "@/redux/wallet";
import Address from "@/atoms/Address";

export default function WalletSwitcher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wallets = useSelector(selectWallets);
  const activeWalletId = useSelector(selectActiveWalletId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeWallet = wallets.find(w => w.id === activeWalletId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSwitch = useCallback(async (id: string) => {
    if (id === activeWalletId) { setIsOpen(false); return; }
    const KeyManager = KeyManagerService();
    const loaded = await KeyManager.loadWalletById(id);
    if (loaded) {
      dispatch(setActiveWallet(id));
      dispatch(setWalletAddress(KeyManager.getAddress()));
    }
    setIsOpen(false);
  }, [activeWalletId, dispatch]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 text-sm"
      >
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {activeWallet ? activeWallet.name[0].toUpperCase() : "W"}
        </div>
        <span className="font-medium max-w-[100px] truncate">
          {activeWallet?.name ?? "Wallet"}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 py-1">
          <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Wallets
          </div>
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => handleSwitch(w.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${w.id === activeWalletId ? "bg-primary/5" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {w.name[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium truncate">{w.name}</div>
                <Address address={w.address} short className="text-xs text-neutral-400" />
              </div>
              {w.id === activeWalletId && (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-neutral-100 dark:border-neutral-800 mt-1 pt-1">
            <button
              onClick={() => { setIsOpen(false); navigate("/wallet/manage"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Manage Wallets
            </button>
            <button
              onClick={() => { setIsOpen(false); navigate("/onboarding"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
