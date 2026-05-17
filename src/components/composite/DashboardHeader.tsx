import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import WalletSwitcher from "@/components/composite/WalletSwitcher";
import { selectWalletAddress, selectUseSmartWallet, setUseSmartWallet, setSmartWalletAddress } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import RifRelayService from "@/kernel/evm/RifRelayService";
import { useTranslation } from "@/translations";

export default function DashboardHeader() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const chainId = useSelector(selectChainId);
  const useSmartWallet = useSelector(selectUseSmartWallet);
  const { t } = useTranslation();

  // Derive RIF Smart Wallet Address globally
  useEffect(() => {
    if (!address) return;
    RifRelayService(chainId)
      .getSmartWalletAddress(address as `0x${string}`)
      .then((addr) => {
        dispatch(setSmartWalletAddress(addr));
      });
  }, [address, chainId, dispatch]);

  return (
    <div className="flex items-center justify-between gap-3 px-1 mb-2">
      <div className="flex items-center gap-2 shrink-0">
        <WalletSwitcher />
      </div>

      {/* Global EOA vs Smart Wallet Switcher Pill */}
      <div className="flex-1 max-w-[200px] flex p-0.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 scale-90 sm:scale-100">
        <button
          onClick={() => dispatch(setUseSmartWallet(false))}
          className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all truncate ${
            !useSmartWallet
              ? "bg-white dark:bg-neutral-700 text-primary shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          {t("wallet.home.wallet_type_standard")}
        </button>
        <button
          onClick={() => dispatch(setUseSmartWallet(true))}
          className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 truncate ${
            useSmartWallet
              ? "bg-white dark:bg-neutral-700 text-primary shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          {t("wallet.home.wallet_type_smart")}
        </button>
      </div>

      <button
        onClick={() => navigate("/settings")}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 transition-colors border border-neutral-200/40 dark:border-neutral-700/40 shadow-sm shrink-0"
        aria-label="Settings"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-600 dark:text-neutral-300" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
