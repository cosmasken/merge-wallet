import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import KeyManagerService from "@/kernel/evm/KeyManagerService";
import SecureStorageService from "@/kernel/app/SecureStorageService";
import NotificationService from "@/kernel/app/NotificationService";
import { setWalletAddress, setSeedBackedUp, selectWalletAddress, addWallet, setActiveWallet } from "@/redux/wallet";
import { clearState } from "@/redux/persistence";
import type { WalletIndexEntry } from "@/kernel/app/SecureStorageService";

function generateId(): string {
  return crypto.randomUUID();
}

export default function WalletOnboarding() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const existingAddress = useSelector(selectWalletAddress);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (existingAddress && !KeyManagerService().isInitialized()) {
      clearState();
    }
  }, [existingAddress]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const KeyManager = KeyManagerService();
      const id = generateId();
      KeyManager.setActiveWalletId(id);
      const { address } = KeyManager.generateWallet();
      await KeyManager.storeWalletSecurely();
      const walletMeta: WalletIndexEntry = {
        id,
        name: `Wallet ${(await SecureStorageService().listWallets()).length + 1}`,
        address,
        createdAt: Date.now(),
        importType: "mnemonic",
      };
      await SecureStorageService().saveWalletIndex([...(await SecureStorageService().listWallets()), walletMeta]);
      dispatch(addWallet({ id, name: walletMeta.name, address, createdAt: walletMeta.createdAt }));
      dispatch(setActiveWallet(id));
      dispatch(setWalletAddress(address));
      dispatch(setSeedBackedUp(false));
      NotificationService().success("Wallet created successfully!");
      navigate("/wallet/backup", { replace: true });
    } catch (error) {
      NotificationService().error("Failed to create wallet. Please try again.");
      setCreating(false);
    }
  };

  const handleImport = () => {
    navigate("/wallet/import", { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 gap-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Merge Wallet</h1>
        <p className="text-sm text-neutral-500 mt-1">Self-custodial Rootstock wallet</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full p-4 rounded-xl bg-primary text-white font-semibold text-lg flex items-center justify-center gap-3 active:bg-primary-dark disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {creating ? "Creating..." : "Create New Wallet"}
        </button>
        <button
          onClick={handleImport}
          className="w-full p-4 rounded-xl border-2 border-primary text-primary font-semibold text-lg flex items-center justify-center gap-3 active:bg-primary/10"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Import Existing Wallet
        </button>
      </div>
    </div>
  );
}
