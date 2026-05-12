import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { isAddress, parseEther, formatEther, encodeFunctionData, erc20Abi, parseUnits } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import { selectWalletAddress, selectWalletBalance } from "@/redux/wallet";
import { selectNetwork } from "@/redux/preferences";
import { selectIsConnected } from "@/redux/device";
import { buildTxUrl } from "@/util/networks";
import { getPublicClient } from "@/kernel/evm/ClientService";
import TransactionBuilderService from "@/kernel/evm/TransactionBuilderService";
import TransactionManagerService from "@/kernel/evm/TransactionManagerService";
import TokenManagerService, { getTokenList } from "@/kernel/evm/TokenManagerService";
import { classifyError, InsufficientFundsError } from "@/kernel/evm/errors";
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService";
import SlideToAction from "@/atoms/SlideToAction";

interface TokenOption {
  type: "native" | "erc20";
  symbol: string;
  address?: `0x${string}`;
  decimals: number;
  balance: bigint;
}

export default function WalletSend() {
  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectWalletBalance);
  const network = useSelector(selectNetwork);
  const isConnected = useSelector(selectIsConnected);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenOption>({
    type: "native",
    symbol: "RBTC",
    decimals: 18,
    balance: BigInt(balance),
  });
  const [tokenBalances, setTokenBalances] = useState<TokenOption[]>([]);

  useEffect(() => {
    if (!address) return;
    TokenManagerService(network)
      .getAllTokenBalances(address as `0x${string}`, getTokenList(network))
      .then((results) => {
        const tokens: TokenOption[] = [
          { type: "native", symbol: "RBTC", decimals: 18, balance: BigInt(balance) },
          ...results.map((t) => ({
            type: "erc20" as const,
            symbol: t.symbol,
            address: t.address,
            decimals: t.decimals,
            balance: t.balance,
          })),
        ];
        setTokenBalances(tokens);
      });
  }, [address, network, balance]);

  const isValidAddress = isAddress(to);
  const isValidAmount = amount && !isNaN(Number(amount)) && Number(amount) > 0;
  const balanceBigInt = selectedToken.balance;

  const valueWei = isValidAmount
    ? selectedToken.type === "native"
      ? parseEther(amount)
      : parseUnits(amount, selectedToken.decimals)
    : 0n;

  const isInsufficientFunds = isValidAmount
    ? valueWei > balanceBigInt
    : false;

  const handleEstimateGas = async () => {
    if (!isValidAddress || !isValidAmount) return;
    setIsEstimating(true);
    setError("");
    try {
      const builder = TransactionBuilderService(network);
      if (selectedToken.type === "native") {
        const gas = await builder.estimateGas(
          to as `0x${string}`,
          amount,
          address as `0x${string}`,
        );
        setGasEstimate(gas);
      } else {
        const publicClient = getPublicClient(network);
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to as `0x${string}`, valueWei],
        });
        const [gas, gPrice] = await Promise.all([
          publicClient.estimateGas({
            to: selectedToken.address,
            data,
            account: address as `0x${string}`,
          }),
          publicClient.getGasPrice(),
        ]);
        setGasEstimate(gas);
        setGasPrice(gPrice);
      }
    } catch (e) {
      setError(classifyError(e).message);
    }
    setIsEstimating(false);
  };

  const handleSend = async () => {
    if (!isValidAddress || !isValidAmount) return;
    if (isInsufficientFunds) {
      setError(new InsufficientFundsError(valueWei, balanceBigInt).message);
      return;
    }

    const authorized = await SecurityService().authorize(AuthActions.SendTransaction);
    if (!authorized) {
      setError("Authorization required");
      return;
    }

    setIsSending(true);
    setError("");
    try {
      const txManager = TransactionManagerService(network);
      if (selectedToken.type === "native") {
        const { hash } = await txManager.sendTransaction(
          to as `0x${string}`,
          valueWei,
          gasEstimate ?? undefined,
        );
        setTxHash(hash);
      } else {
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to as `0x${string}`, valueWei],
        });
        const { hash } = await txManager.sendContractTransaction(
          selectedToken.address!,
          0n,
          data,
          gasEstimate ?? undefined,
        );
        setTxHash(hash);
      }
    } catch (e) {
      setError(classifyError(e).message);
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
          <button
            onClick={() => window.history.go(-2)}
            className="mt-4 px-6 py-3 rounded-full bg-primary text-white font-semibold"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title="Send" subtitle="Send RBTC or tokens" showBack />
      <div className="flex flex-col gap-4 px-4">
        <div>
          <label className="text-sm text-neutral-500 mb-1 block">Token</label>
          <div className="flex gap-2">
            {tokenBalances.map((token) => (
              <button
                key={token.symbol}
                onClick={() => { setSelectedToken(token); setGasEstimate(null); setError(""); }}
                className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  selectedToken.symbol === token.symbol
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                <div>{token.symbol}</div>
                <div className="text-xs opacity-70 font-mono mt-0.5">
                  {formatEther(token.balance)} {token.symbol}
                </div>
              </button>
            ))}
          </div>
        </div>

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
          <label className="text-sm text-neutral-500 mb-1 block">
            Amount ({selectedToken.symbol})
          </label>
          <input
            type="text"
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setGasEstimate(null); }}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100"
          />
        </div>

        {!isConnected && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">No internet connection</p>
        )}

        {isConnected && isValidAddress && isValidAmount && gasEstimate === null && (
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
            {gasPrice !== null && (
              <span> · Max fee: {formatEther(gasEstimate * gasPrice)} RBTC</span>
            )}
          </div>
        )}

        {isInsufficientFunds && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">
            Insufficient {selectedToken.symbol} balance.
          </p>
        )}

        {error && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>
        )}

        <div className="mt-4">
          <SlideToAction
            label={isSending ? "Sending..." : `Slide to send ${selectedToken.symbol}`}
            onSlide={handleSend}
            disabled={!isConnected || !isValidAddress || !isValidAmount || isSending || isInsufficientFunds}
          />
        </div>
      </div>
    </div>
  );
}
