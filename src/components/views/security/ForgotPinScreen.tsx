import { useState } from "react";
import { useNavigate } from "react-router-dom";

import SecurityService from "@/kernel/app/SecurityService";

export default function ForgotPinScreen() {
  const navigate = useNavigate();
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleReset = async () => {
    try {
      const Security = SecurityService();
      await Security.resetEncryption();
      setResetDone(true);
    } catch {
      setResetError("Failed to reset encryption. Reload the page.");
    }
  };

  if (resetDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-1000 px-4">
        <h1 className="text-xl font-bold text-white">Reset Complete</h1>
        <p className="text-neutral-400 text-sm text-center max-w-xs">
          Encryption has been reset. Reload the app to create a new wallet.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="p-3 rounded-full bg-primary text-white font-semibold"
        >
          Reload App
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-1000 px-4">
      <h1 className="text-xl font-bold text-white">Forgot PIN</h1>
      <p className="text-neutral-400 text-sm text-center max-w-xs">
        Resetting will clear the encryption key. You will need to restore your wallet from your recovery phrase.
      </p>
      {resetError && <p className="text-error text-sm">{resetError}</p>}
      <button
        onClick={handleReset}
        className="p-3 rounded-full bg-error text-white font-semibold"
      >
        Reset Encryption
      </button>
      <button
        onClick={() => navigate(-1)}
        className="text-neutral-400 text-sm"
      >
        Back
      </button>
    </div>
  );
}
