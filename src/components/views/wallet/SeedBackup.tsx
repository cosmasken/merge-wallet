import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Clipboard } from "@capacitor/clipboard";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import { selectSeedBackedUp, setSeedBackedUp } from "@/redux/wallet";
import BackupVerification from "@/components/composite/BackupVerification";
import { useTranslation } from "@/translations";

export default function SeedBackup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const alreadyBackedUp = useSelector(selectSeedBackedUp);
  const [revealed, setRevealed] = useState(alreadyBackedUp);
  const [confirmed, setConfirmed] = useState(alreadyBackedUp);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const mnemonic = KeyManagerService().getMnemonic();

  const handleCopySeed = useCallback(async () => {
    if (!mnemonic) return
    try {
      await Clipboard.write({ string: mnemonic })
    } catch {
      await navigator.clipboard.writeText(mnemonic)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [mnemonic])

  const handleStartVerification = () => {
    setIsVerifying(true);
  };

  const handleVerificationSuccess = () => {
    dispatch(setSeedBackedUp(true));
    KeyManagerService().clearMnemonic();
    navigate("/wallet");
  };

  if (isVerifying && mnemonic) {
    return (
      <div>
        <ViewHeader title={t("wallet.backup.verify_title")} showBack onBack={() => setIsVerifying(false)} />
        <BackupVerification 
          mnemonic={mnemonic}
          onSuccess={handleVerificationSuccess}
          onCancel={() => setIsVerifying(false)}
          isRequired={true}
        />
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title={t("wallet.backup.title")} subtitle={t("wallet.backup.subtitle")} showBack />
      <div className="flex flex-col gap-4 px-4 pb-10">
        <div className="bg-amber-900/10 border border-amber-900/20 p-4 rounded-xl">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t("wallet.backup.warning")}
          </p>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full p-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            {t("wallet.backup.reveal_button")}
          </button>
        ) : mnemonic ? (
          <div className="grid grid-cols-2 gap-2 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 animate-in zoom-in-95 duration-300">
            {mnemonic.split(" ").map((word, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-neutral-700 text-sm font-mono shadow-sm"
              >
                <span className="text-neutral-400 text-xs w-5 text-right font-sans">{i + 1}.</span>
                <span className="text-neutral-800 dark:text-neutral-100 font-bold">{word}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-error text-sm p-4 bg-error/10 rounded-xl">{t("wallet.backup.no_mnemonic")}</p>
        )}

        {revealed && mnemonic && (
          <div className="space-y-4 mt-4">
            <button
              onClick={handleCopySeed}
              className="w-full p-3 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-sm text-neutral-500 font-semibold flex items-center justify-center gap-2 active:bg-neutral-50 dark:active:bg-neutral-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>

            <label className="flex items-start gap-3 text-sm text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={() => setConfirmed(!confirmed)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="select-none">{t("wallet.backup.confirmation_label")}</span>
            </label>

            <button
              onClick={handleStartVerification}
              disabled={!confirmed}
              className="w-full p-4 rounded-2xl bg-primary text-white font-bold disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {alreadyBackedUp ? t("wallet.backup.verify_again") : t("wallet.backup.continue_button")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

