import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isAddress } from "viem";

import Button from "@/atoms/Button";
import TokenManagerService from "@/kernel/evm/TokenManagerService";
import { selectNetwork } from "@/redux/preferences";
import { addTrackedToken } from "@/redux/wallet";

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTokenModal({ isOpen, onClose }: AddTokenModalProps) {
  const dispatch = useDispatch();
  const network = useSelector(selectNetwork);
  const [address, setAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"enter" | "preview">("enter");

  useEffect(() => {
    if (!isOpen) {
      setAddress("");
      setSymbol("");
      setDecimals("");
      setError("");
      setStep("enter");
    }
  }, [isOpen]);

  const handleFetchMetadata = async () => {
    if (!isAddress(address)) {
      setError("Invalid contract address");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const metadata = await TokenManagerService(network).getTokenMetadata(address);
      if (metadata) {
        setSymbol(metadata.symbol);
        setDecimals(metadata.decimals);
        setStep("preview");
      } else {
        setError("Could not fetch token details. Verify address and network.");
      }
    } catch (e) {
      setError("Failed to verify token contract.");
    }
    setIsLoading(false);
  };

  const handleAdd = () => {
    if (!address || !symbol || decimals === "") return;
    dispatch(addTrackedToken({
      address,
      symbol,
      decimals: Number(decimals),
      network,
    }));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-10 sm:pb-6 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Add Custom Token</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "enter" ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1 block">Contract Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setError(""); }}
                placeholder="0x..."
                className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 font-mono"
              />
              {error && <p className="text-error text-xs mt-1.5">{error}</p>}
            </div>
            <Button 
              onClick={handleFetchMetadata} 
              disabled={!address || isLoading}
              className="mt-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : "Next"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
              <div className="flex justify-between mb-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-sm text-neutral-500">Symbol</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{symbol}</span>
              </div>
              <div className="flex justify-between mb-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                <span className="text-sm text-neutral-500">Decimals</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{decimals}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-neutral-500">Address</span>
                <span className="text-xs font-mono text-neutral-400 break-all">{address}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStep("enter")}
                className="flex-1 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold"
              >
                Back
              </button>
              <Button 
                onClick={handleAdd}
                className="flex-[2]"
              >
                Add Token
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
