import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import { selectSeedBackedUp, setSeedBackedUp } from "@/redux/wallet";
import BackupVerification from "@/components/composite/BackupVerification";

export default function SeedBackup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const alreadyBackedUp = useSelector(selectSeedBackedUp);
  const [revealed, setRevealed] = useState(alreadyBackedUp);
  const [confirmed, setConfirmed] = useState(alreadyBackedUp);
  const [isVerifying, setIsVerifying] = useState(false);

  const mnemonic = KeyManagerService().getMnemonic();

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
        <ViewHeader title="Verify Backup" showBack onBack={() => setIsVerifying(false)} />
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
      <ViewHeader title="Backup Wallet" subtitle="Secure your recovery phrase" showBack />
      <div className="flex flex-col gap-4 px-4 pb-10">
        <div className="bg-amber-900/10 border border-amber-900/20 p-4 rounded-xl">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Your recovery phrase is the only way to restore your wallet if you lose access.
            Write it down and store it in a safe place. Never share it with anyone.
          </p>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full p-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            Reveal Recovery Phrase
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
          <p className="text-error text-sm p-4 bg-error/10 rounded-xl">No recovery phrase available. This may indicate an imported wallet or it was already cleared from memory.</p>
        )}

        {revealed && mnemonic && (
          <div className="space-y-6 mt-4">
            <label className="flex items-start gap-3 text-sm text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={() => setConfirmed(!confirmed)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="select-none">I have saved my recovery phrase in a secure location and understand that if I lose it, my funds cannot be recovered.</span>
            </label>

            <button
              onClick={handleStartVerification}
              disabled={!confirmed}
              className="w-full p-4 rounded-2xl bg-primary text-white font-bold disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {alreadyBackedUp ? "Verify Again" : "Continue to Verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

