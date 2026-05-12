import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import { selectSeedBackedUp, setSeedBackedUp } from "@/redux/wallet";

export default function SeedBackup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const alreadyBackedUp = useSelector(selectSeedBackedUp);
  const [revealed, setRevealed] = useState(alreadyBackedUp);
  const [confirmed, setConfirmed] = useState(alreadyBackedUp);

  const mnemonic = KeyManagerService().getMnemonic();

  const handleConfirm = () => {
    dispatch(setSeedBackedUp(true));
    navigate("/wallet");
  };

  return (
    <div>
      <ViewHeader title="Backup Wallet" subtitle="Secure your recovery phrase" />
      <div className="flex flex-col gap-4 px-4">
        <p className="text-sm text-neutral-500">
          Your recovery phrase is the only way to restore your wallet if you lose access.
          Write it down and store it in a safe place. Never share it with anyone.
        </p>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full p-3 rounded-full bg-primary text-white font-semibold"
          >
            Reveal Recovery Phrase
          </button>
        ) : mnemonic ? (
          <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            {mnemonic.split(" ").map((word, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded bg-white dark:bg-neutral-700 text-sm font-mono"
              >
                <span className="text-neutral-400 text-xs w-5 text-right">{i + 1}.</span>
                <span className="text-neutral-800 dark:text-neutral-100">{word}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-error text-sm">No recovery phrase available. This may indicate a imported wallet.</p>
        )}

        {revealed && mnemonic && (
          <>
            <label className="flex items-start gap-3 text-sm text-neutral-500">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={() => setConfirmed(!confirmed)}
                className="mt-0.5"
              />
              <span>I have saved my recovery phrase in a secure location and understand that if I lose it, my funds cannot be recovered.</span>
            </label>

            <button
              onClick={handleConfirm}
              disabled={!confirmed}
              className="w-full p-3 rounded-full bg-primary text-white font-semibold disabled:opacity-50"
            >
              {alreadyBackedUp ? "Done" : "Confirm Backup"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
