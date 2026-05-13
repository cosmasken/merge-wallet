import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { mnemonicToAccount } from "viem/accounts";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import BalanceService from "@/kernel/evm/BalanceService";
import { setWalletAddress } from "@/redux/wallet";
import { selectNetwork, setNetwork } from "@/redux/preferences";

export default function WalletImport() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentNetwork = useSelector(selectNetwork);
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState("");

  const handleImport = async () => {
    const trimmed = mnemonic.trim().toLowerCase();
    const words = trimmed.split(/\s+/);

    if (words.length !== 12 && words.length !== 24) {
      setError("Recovery phrase must be 12 or 24 words");
      return;
    }

    setIsImporting(true);
    setError("");
    setStatus("Discovering accounts...");

    try {
      const KeyManager = KeyManagerService();
      
      let bestIndex = 0;

      // Scan first 5 accounts ONLY on the currently selected network
      setStatus(`Scanning ${currentNetwork}...`);
      const Balance = BalanceService(currentNetwork);
      
      for (let i = 0; i < 5; i++) {
        const { address } = KeyManager.importFromMnemonic(trimmed, i);
        try {
          const balance = await Balance.getBalance(address as `0x${string}`);
          if (balance > 0n) {
            bestIndex = i;
            console.log(`Found balance ${balance} at index ${i}`);
            break;
          }
        } catch (e) {
          console.error(`Failed to check balance for ${address}`, e);
        }
      }

      setStatus("Finalizing...");
      const { address } = KeyManager.importFromMnemonic(trimmed, bestIndex);

      await KeyManager.storeMnemonicSecurely();
      dispatch(setWalletAddress(address));
      
      navigate("/wallet");
    } catch (e) {
      console.error(e);
      setError("Invalid recovery phrase or connection error. Please try again.");
    }
    setIsImporting(false);
    setStatus("");
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
        {status && (
          <p className="text-primary text-sm bg-primary/10 p-3 rounded-lg flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            {status}
          </p>
        )}
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
