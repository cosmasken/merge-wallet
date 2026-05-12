import { useState } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";

import MergeLogo from "@/atoms/MergeLogo";
import SecurityService from "@/kernel/app/SecurityService";
import ForgotPinScreen from "@/views/security/ForgotPinScreen";

function LockScreen({ boot }: { boot: () => void }) {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = async (digit: string) => {
    if (isVerifying) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");

    if (newPin.length >= 4) {
      setIsVerifying(true);
      try {
        const Security = SecurityService();
        const isValid = await Security.verifyPin(newPin);
        if (isValid) {
          await Security.initEncryption(newPin);
          boot();
        } else {
          setPin("");
          setError("Incorrect PIN. Try again.");
        }
      } catch {
        setPin("");
        setError("PIN verification unavailable on this device");
      }
      setIsVerifying(false);
    }
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleForgot = () => navigate("/forgot-pin");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-1000 px-4 sm:px-8">
      <MergeLogo className="w-32 h-32" />
      <h1 className="text-2xl font-bold text-white">Merge Wallet</h1>

      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 border-primary ${
              pin.length > i ? "bg-primary" : ""
            }`}
          />
        ))}
      </div>

      {error && <p className="text-error text-sm">{error}</p>}

      <div className="grid grid-cols-3 gap-4 max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(String(d))}
            disabled={isVerifying}
            className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold active:bg-neutral-700 disabled:opacity-40"
          >
            {d}
          </button>
        ))}
        <button
          onClick={handleDelete}
          disabled={isVerifying}
          className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl active:bg-neutral-700 disabled:opacity-40"
        >
          ⌫
        </button>
        <button
          onClick={() => handleDigit("0")}
          disabled={isVerifying}
          className="w-16 h-16 rounded-full bg-neutral-800 text-white text-xl font-bold active:bg-neutral-700 disabled:opacity-40"
        >
          0
        </button>
        <div />
      </div>

      <button
        onClick={handleForgot}
        className="text-primary text-sm mt-4"
      >
        Forgot PIN?
      </button>
    </div>
  );
}

export default function AppLockScreen({ boot }: { boot: () => void }) {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<LockScreen boot={boot} />} />
        <Route path="/forgot-pin" element={<ForgotPinScreen />} />
      </Routes>
    </MemoryRouter>
  );
}
