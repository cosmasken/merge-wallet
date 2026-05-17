import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import WalletSwitcher from "@/components/composite/WalletSwitcher";
import {
  selectWalletAddress,
  selectUseSmartWallet,
  setUseSmartWallet,
  setSmartWalletAddress,
  selectHasSeenSmartWalletNotice,
  setHasSeenSmartWalletNotice,
} from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import RifRelayService from "@/kernel/evm/RifRelayService";
import { useTranslation } from "@/translations";

export default function DashboardHeader() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const chainId = useSelector(selectChainId);
  const useSmartWallet = useSelector(selectUseSmartWallet);
  const hasSeenNotice = useSelector(selectHasSeenSmartWalletNotice);
  const { t } = useTranslation();

  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  // Derive RIF Smart Wallet Address globally
  useEffect(() => {
    if (!address) return;
    RifRelayService(chainId)
      .getSmartWalletAddress(address as `0x${string}`)
      .then((addr) => {
        dispatch(setSmartWalletAddress(addr));
      });
  }, [address, chainId, dispatch]);

  const handleSelectSmartWallet = () => {
    if (!hasSeenNotice) {
      setIsNoticeOpen(true);
    } else {
      dispatch(setUseSmartWallet(true));
    }
  };

  const handleConfirmNotice = () => {
    dispatch(setHasSeenSmartWalletNotice(true));
    dispatch(setUseSmartWallet(true));
    setIsNoticeOpen(false);
  };

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
          onClick={handleSelectSmartWallet}
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

      {/* First-Time Smart Wallet Premium Notice Modal */}
      {isNoticeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 animate-scale-up">
            
            {/* Modal Header Icon */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m9 11 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                  {t("wallet.home.smart_notice_title")}
                </h3>
                <p className="text-[10px] text-primary font-semibold tracking-wider uppercase mt-0.5">
                  Powered by RIF Relay
                </p>
              </div>
            </div>

            {/* Modal Description */}
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {t("wallet.home.smart_notice_desc")}
            </p>

            {/* Features list */}
            <div className="flex flex-col gap-3.5 my-1">
              {/* Bullet 1 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-normal">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">Gasless Transactions:</span> Pay gas fees in stablecoins or standard tokens instead of RBTC.
                </p>
              </div>

              {/* Bullet 2 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-normal">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">Self-Custody:</span> Secured and controlled by your existing recovery phrase. No new backup required.
                </p>
              </div>

              {/* Bullet 3 */}
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-normal">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">Unique Address:</span> Your RIF Smart Wallet has a completely different address from your EOA. Double-check before receiving funds!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={handleConfirmNotice}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:opacity-95 text-white font-bold text-xs shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
              >
                {t("wallet.home.smart_notice_button")}
              </button>
              <button
                onClick={() => setIsNoticeOpen(false)}
                className="w-full py-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 font-semibold text-xs transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
