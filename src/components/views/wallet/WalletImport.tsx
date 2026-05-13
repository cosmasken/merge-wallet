import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import { setWalletAddress } from "@/redux/wallet";

export default function WalletImport() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    const trimmed = mnemonic.trim().toLowerCase();
    const words = trimmed.split(/\s+/);

    if (words.length !== 12 && words.length !== 24) {
      setError("Recovery phrase must be 12 or 24 words");
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      const KeyManager = KeyManagerService();
      const { address } = KeyManager.importFromMnemonic(trimmed);
      await KeyManager.storeMnemonicSecurely();
      dispatch(setWalletAddress(address));
      navigate("/wallet");
    } catch {
      setError("Invalid recovery phrase. Check the words and try again.");
    }
    setIsImporting(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonic(text);
      setError("");
    } catch {
      setError("Cannot read from clipboard");
    }
  };

  return (
    <div>
      <ViewHeader title="Import Wallet" subtitle="Restore from recovery phrase" showBack />
      <div className="flex flex-col gap-4 px-4">
        <label className="text-sm text-neutral-500">
          Enter your 12 or 24 word recovery phrase
        </label>
        <textarea
          value={mnemonic}
          onChange={(e) => { setMnemonic(e.target.value); setError(""); }}
          placeholder="word1 word2 word3 ..."
          rows={4}
          className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100 font-mono text-sm resize-none"
        />
        <button
          onClick={handlePaste}
          className="text-primary text-sm self-start"
        >
          Paste from clipboard
        </button>
        {error && (
          <p className="text-error text-sm bg-error-light/20 dark:bg-error-dark/30 p-3 rounded-lg">
            {error}
          </p>
        )}
        <button
          onClick={handleImport}
          disabled={!mnemonic.trim() || isImporting}
          className="w-full p-3 rounded-full bg-primary text-white font-semibold disabled:opacity-50 mt-2"
        >
          {isImporting ? "Importing..." : "Import Wallet"}
        </button>
      </div>
    </div>
  );
}
