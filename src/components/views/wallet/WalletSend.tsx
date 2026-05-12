import { useState } from "react";
import { useSelector } from "react-redux";
import { isAddress, parseEther } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import { selectWalletAddress } from "@/redux/wallet";
import { selectNetwork } from "@/redux/preferences";
import { buildTxUrl } from "@/util/networks";
import KeyManagerService from "@/kernel/evm/KeyManagerService";
import { getPublicClient } from "@/kernel/evm/ClientService";

export default function WalletSend() {
  const address = useSelector(selectWalletAddress);
  const network = useSelector(selectNetwork);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const isValidAddress = isAddress(to);
  const isValidAmount = amount && !isNaN(Number(amount)) && Number(amount) > 0;

  const handleEstimateGas = async () => {
    if (!isValidAddress || !isValidAmount) return;
    setIsEstimating(true);
    setError("");
    try {
      const publicClient = getPublicClient();
      const gas = await publicClient.estimateGas({
        to: to as `0x${string}`,
        value: parseEther(amount),
        account: address as `0x${string}`,
      });
      setGasEstimate(gas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gas estimation failed");
    }
    setIsEstimating(false);
  };

  const handleSend = async () => {
    if (!isValidAddress || !isValidAmount) return;
    setIsSending(true);
    setError("");
    try {
      const publicClient = getPublicClient();
      const chainId = await publicClient.getChainId();
      const nonce = await publicClient.getTransactionCount({
        address: address as `0x${string}`,
      });

      const KeyManager = KeyManagerService();
      const signedTx = await KeyManager.signTransaction({
        to: to as `0x${string}`,
        value: parseEther(amount),
        chainId,
        nonce,
        gas: gasEstimate ?? undefined,
      });

      const hash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      });

      setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    }
    setIsSending(false);
  };

  if (txHash) {
    return (
      <div>
        <ViewHeader title="Send" />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">Transaction Sent</h2>
          <p className="text-sm text-neutral-500 font-mono break-all">{txHash}</p>
          <a
            href={buildTxUrl(network, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm"
          >
            View on Explorer
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title="Send" subtitle="Send RBTC or tokens" />
      <div className="flex flex-col gap-4 px-4">
        <div>
          <label className="text-sm text-neutral-500 mb-1 block">Recipient Address</label>
          <input
            type="text"
            placeholder="0x..."
            value={to}
            onChange={(e) => { setTo(e.target.value); setGasEstimate(null); }}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100 font-mono"
          />
          {to && !isValidAddress && (
            <p className="text-error text-xs mt-1">Invalid address</p>
          )}
        </div>

        <div>
          <label className="text-sm text-neutral-500 mb-1 block">Amount (RBTC)</label>
          <input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setGasEstimate(null); }}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100"
          />
        </div>

        {isValidAddress && isValidAmount && gasEstimate === null && (
          <button
            onClick={handleEstimateGas}
            disabled={isEstimating}
            className="w-full p-3 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold"
          >
            {isEstimating ? "Estimating..." : "Estimate Gas"}
          </button>
        )}

        {gasEstimate !== null && (
          <div className="text-sm text-neutral-500">
            Estimated gas: {gasEstimate.toString()} units
          </div>
        )}

        {error && (
          <p className="text-error text-sm bg-error-light/20 dark:bg-error-dark/30 p-3 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleSend}
          disabled={!isValidAddress || !isValidAmount || isSending}
          className="w-full p-3 rounded-full bg-primary text-white font-semibold disabled:opacity-50 mt-4"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
