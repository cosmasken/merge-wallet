import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import SecureStorageService from "@/kernel/app/SecureStorageService";
import BalanceService from "@/kernel/evm/BalanceService";
import { setWalletAddress, addWallet, setActiveWallet } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import type { WalletIndexEntry } from "@/kernel/app/SecureStorageService";

type ImportMode = "mnemonic" | "privateKey";

function generateId(): string {
  return crypto.randomUUID();
}

export default function WalletImport() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const [mode, setMode] = useState<ImportMode>("mnemonic");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState("");

  const handleImport = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setIsImporting(true);
    setError("");

    try {
      const KeyManager = KeyManagerService();
      const id = generateId();
      KeyManager.setActiveWalletId(id);
      const s = SecureStorageService();
      
      if (mode === "mnemonic") {
        const words = trimmed.toLowerCase().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          setError("Recovery phrase must be 12 or 24 words");
          setIsImporting(false);
          return;
        }

        const normalizedMnemonic = words.join(" ");

        setStatus("Discovering accounts...");
        let bestIndex = 0;
        const Balance = BalanceService(chainId);
        
        for (let i = 0; i < 5; i++) {
          const { address } = KeyManager.importFromMnemonic(normalizedMnemonic, i);
          try {
            const balance = await Balance.getBalance(address as `0x${string}`);
            if (balance > 0n) {
              bestIndex = i;
              break;
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        setStatus("Finalizing...");
        const { address } = KeyManager.importFromMnemonic(normalizedMnemonic, bestIndex);
        await KeyManager.storeWalletSecurely();
        const walletMeta: WalletIndexEntry = { id, name: `Wallet ${(await s.listWallets()).length + 1}`, address, createdAt: Date.now(), importType: "mnemonic" };
        await s.saveWalletIndex([...(await s.listWallets()), walletMeta]);
        dispatch(addWallet({ id, name: walletMeta.name, address, createdAt: walletMeta.createdAt }));
        dispatch(setActiveWallet(id));
        dispatch(setWalletAddress(address));
      } else {
        // Private Key Import
        if (!trimmed.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
          setError("Invalid private key format (expected 64 hex characters)");
          setIsImporting(false);
          return;
        }

        const { address } = KeyManager.importFromPrivateKey(trimmed);
        await KeyManager.storeWalletSecurely();
        const walletMeta: WalletIndexEntry = { id, name: `Wallet ${(await s.listWallets()).length + 1}`, address, createdAt: Date.now(), importType: "privateKey" };
        await s.saveWalletIndex([...(await s.listWallets()), walletMeta]);
        dispatch(addWallet({ id, name: walletMeta.name, address, createdAt: walletMeta.createdAt }));
        dispatch(setActiveWallet(id));
        dispatch(setWalletAddress(address));
      }
      
      navigate("/wallet");
    } catch (e) {
      console.error(e);
      setError("Import failed. Please check your input and try again.");
    }
    setIsImporting(false);
    setStatus("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      setError("");
    } catch {
      setError("Cannot read from clipboard");
    }
  };

  return (
    <div>
      <ViewHeader title="Import Wallet" subtitle="Restore access to your funds" showBack />
      <div className="flex flex-col gap-6 px-4">
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => { setMode("mnemonic"); setError(""); setInputValue(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === "mnemonic" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary" : "text-neutral-500"}`}
          >
            Recovery Phrase
          </button>
          <button
            onClick={() => { setMode("privateKey"); setError(""); setInputValue(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === "privateKey" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary" : "text-neutral-500"}`}
          >
            Private Key
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm text-neutral-500">
            {mode === "mnemonic" 
              ? "Enter your 12 or 24 word recovery phrase" 
              : "Enter your private key (64 hex characters)"}
          </label>
          <textarea
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(""); }}
            placeholder={mode === "mnemonic" ? "word1 word2 word3 ..." : "0x..."}
            rows={mode === "mnemonic" ? 4 : 2}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100 font-mono text-sm resize-none"
          />
          <button
            onClick={handlePaste}
            className="text-primary text-sm self-start"
          >
            Paste from clipboard
          </button>
        </div>

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
          disabled={!inputValue.trim() || isImporting}
          className="w-full p-3 rounded-full bg-primary text-white font-semibold disabled:opacity-50"
        >
          {isImporting ? "Importing..." : "Import Wallet"}
        </button>
      </div>
    </div>
  );
}

