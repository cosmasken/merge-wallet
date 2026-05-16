import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { isAddress, parseEther, formatEther, encodeFunctionData, erc20Abi, parseUnits } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import { selectWalletAddress, selectWalletBalance } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import { selectIsConnected } from "@/redux/device";
import { buildTxUrl } from "@/util/networks";
import { getPublicClient } from "@/kernel/evm/ClientService";
import TransactionBuilderService from "@/kernel/evm/TransactionBuilderService";
import TransactionManagerService from "@/kernel/evm/TransactionManagerService";
import TokenManagerService, { getTokenList } from "@/kernel/evm/TokenManagerService";
import { classifyError, InsufficientFundsError } from "@/kernel/evm/errors";
import SecurityService, { AuthActions } from "@/kernel/app/SecurityService";
import NotificationService from "@/kernel/app/NotificationService";
import SlideToAction from "@/atoms/SlideToAction";
import TransactionConfirmation from "@/components/composite/TransactionConfirmation";
import LoadingSpinner from "@/atoms/LoadingSpinner";
import { selectContacts, addContact, addPendingTransaction } from "@/redux/wallet";
import { useDispatch } from "react-redux";
import { getNativeCurrency } from "@/chains";
import { useTranslation } from "@/translations";

interface TokenOption {
  type: "native" | "erc20";
  symbol: string;
  address?: `0x${string}`;
  decimals: number;
  balance: bigint;
}

export default function WalletSend() {
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectWalletBalance);
  const chainId = useSelector(selectChainId);
  const isConnected = useSelector(selectIsConnected);
  const contacts = useSelector(selectContacts);
  const [to, setTo] = useState("");
  const [contactName, setContactName] = useState("");
  const [shouldSaveContact, setShouldSaveContact] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const nativeCurrency = getNativeCurrency(chainId);
  const { t } = useTranslation();
  const [selectedToken, setSelectedToken] = useState<TokenOption>({
    type: "native",
    symbol: nativeCurrency.symbol,
    decimals: nativeCurrency.decimals,
    balance: BigInt(balance),
  });
  const [tokenBalances, setTokenBalances] = useState<TokenOption[]>([]);

  useEffect(() => {
    if (!address) return;
    TokenManagerService(chainId)
      .getAllTokenBalances(address as `0x${string}`, getTokenList(chainId))
      .then((results) => {
        const tokens: TokenOption[] = [
          { type: "native", symbol: nativeCurrency.symbol, decimals: nativeCurrency.decimals, balance: BigInt(balance) },
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
  }, [address, chainId, balance]);

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
      const builder = TransactionBuilderService(chainId);
      const publicClient = getPublicClient(chainId);
      const gPrice = await publicClient.getGasPrice();
      setGasPrice(gPrice);

      if (selectedToken.type === "native") {
        const gas = await builder.estimateGas(
          to as `0x${string}`,
          amount,
          address as `0x${string}`,
        );
        setGasEstimate(gas);
      } else {
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to as `0x${string}`, valueWei],
        });
        const gas = await publicClient.estimateGas({
          to: selectedToken.address,
          data,
          account: address as `0x${string}`,
        });
        setGasEstimate(gas);
      }
    } catch (e) {
      setError(classifyError(e).message);
    }
    setIsEstimating(false);
  };

  const handleInitiateSend = async () => {
    if (!isValidAddress || !isValidAmount) return;
    if (isInsufficientFunds) {
      setError(t("wallet.send.insufficient", { symbol: selectedToken.symbol }));
      return;
    }

    if (gasEstimate === null) {
      await handleEstimateGas();
    }

    setIsConfirming(true);
  };

  const handleSend = async () => {
    // Prevent multiple simultaneous transactions
    if (isSending) {
      return;
    }
    
    const authorized = await SecurityService().authorize(AuthActions.SendTransaction);
    if (!authorized) {
      NotificationService().error(t("wallet.send.authorization_required"));
      setIsConfirming(false);
      return;
    }

    setIsSending(true);
    setIsConfirming(false);
    setError("");
    
    try {
      const       txManager = TransactionManagerService(chainId);

      if (shouldSaveContact && contactName) {
        dispatch(addContact({ name: contactName, address: to }));
        NotificationService().success(`Contact "${contactName}" saved`);
      }

      if (selectedToken.type === "native") {
        const { hash } = await txManager.sendTransaction(
          to as `0x${string}`,
          valueWei,
          gasEstimate ?? undefined,
        );
        setTxHash(hash);
        dispatch(addPendingTransaction({
          hash,
          type: "send",
          amount,
          symbol: selectedToken.symbol,
          chainId,
        }));
        NotificationService().success("Transaction sent successfully!");
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
        dispatch(addPendingTransaction({
          hash,
          type: "contract",
          amount,
          symbol: selectedToken.symbol,
          chainId,
        }));
        NotificationService().success("Token transfer sent successfully!");
      }
    } catch (e) {
      const error = classifyError(e);
      setError(error.message);
      NotificationService().error(error.message);
    }
    setIsSending(false);
  };

  if (txHash) {
    return (
      <div className="animate-in fade-in duration-500">
        <ViewHeader title={t("wallet.send.title")} />
        <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold">{t("wallet.send.success_title")}</h2>
          <p className="text-sm text-neutral-500 font-mono break-all">{txHash}</p>
          <a
            href={buildTxUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm"
          >
            {t("wallet.send.view_explorer")}
          </a>
          <button
            onClick={() => window.history.go(-2)}
            className="mt-4 px-6 py-3 rounded-full bg-primary text-white font-semibold"
          >
            {t("wallet.send.back_to_wallet")}
          </button>
        </div>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div>
        <ViewHeader title={t("wallet.send.confirm_title")} showBack onBack={() => setIsConfirming(false)} />
        <TransactionConfirmation
          transaction={{
            to: to as `0x${string}`,
            value: valueWei,
            gasEstimate: gasEstimate ?? 0n,
            gasPrice: gasPrice ?? 0n,
            total: valueWei + (gasEstimate ?? 0n) * (gasPrice ?? 0n),
            token: {
              symbol: selectedToken.symbol,
              decimals: selectedToken.decimals,
              type: selectedToken.type,
              address: selectedToken.address,
            }
          }}
          onConfirm={handleSend}
          onEdit={() => setIsConfirming(false)}
          onCancel={() => setIsConfirming(false)}
        />
        {error && (
          <p className="text-error text-sm bg-error/10 p-3 m-4 rounded-lg">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title={t("wallet.send.title")} subtitle={t("wallet.send.subtitle")} showBack />
      <div className="flex flex-col gap-4 px-4">
        <div>
          <label className="text-sm text-neutral-500 mb-1 block">{t("wallet.send.token_label")}</label>
          <div className="flex gap-2">
            {tokenBalances.map((token) => (
              <button
                key={token.symbol}
                onClick={() => { setSelectedToken(token); setGasEstimate(null); setError(""); }}
                className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${selectedToken.symbol === token.symbol
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-neutral-500 block">{t("wallet.send.recipient")}</label>
            {contacts.length > 0 && (
              <button
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className="text-xs text-primary font-semibold"
              >
                {isPickerOpen ? t("wallet.send.close_contacts") : t("wallet.send.from_contacts")}
              </button>
            )}
          </div>

          {isPickerOpen && (
            <div className="mb-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {contacts.map(c => (
                <button
                  key={c.address}
                  onClick={() => { setTo(c.address); setIsPickerOpen(false); }}
                  className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            placeholder="0x..."
            value={to}
            onChange={(e) => { setTo(e.target.value); setGasEstimate(null); }}
            className="w-full p-3 rounded-lg border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-800 dark:text-neutral-100 font-mono"
          />
          {to && !isValidAddress && (
            <p className="text-error text-xs mt-1">{t("wallet.send.invalid_address")}</p>
          )}

          {isValidAddress && !contacts.some(c => c.address.toLowerCase() === to.toLowerCase()) && (
            <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shouldSaveContact}
                  onChange={(e) => setShouldSaveContact(e.target.checked)}
                  className="rounded border-neutral-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t("wallet.send.save_contact")}</span>
              </label>
              {shouldSaveContact && (
                <input
                  type="text"
                  placeholder={t("wallet.send.contact_name")}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-2 w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-neutral-500 mb-1 block">
            {t("wallet.send.amount_label")} ({selectedToken.symbol})
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
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{t("wallet.home.no_internet")}</p>
        )}

        {isConnected && isValidAddress && isValidAmount && gasEstimate === null && (
          <button
            onClick={handleEstimateGas}
            disabled={isEstimating}
            className="w-full p-3 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold"
          >
            {isEstimating ? t("wallet.send.estimating") : t("wallet.send.estimate_gas")}
          </button>
        )}

        {gasEstimate !== null && (
          <div className="text-sm text-neutral-500">
            {t("wallet.send.estimated_gas_label")}: {gasEstimate.toString()} units
            {gasPrice !== null && (
              <span> · {t("wallet.send.max_fee_label")}: {formatEther(gasEstimate * gasPrice)} {selectedToken.symbol}</span>
            )}
          </div>
        )}

        {isInsufficientFunds && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">
            {t("wallet.send.insufficient", { symbol: selectedToken.symbol })}
          </p>
        )}

        {error && (
          <p className="text-error text-sm bg-error/10 p-3 rounded-lg">{error}</p>
        )}

        <div className="mt-4">
          <SlideToAction
            label={isSending ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" color="white" />
                <span>{t("wallet.send.sending")}</span>
              </div>
            ) : t("wallet.send.review_button")}
            onSlide={handleInitiateSend}
            disabled={!isConnected || !isValidAddress || !isValidAmount || isSending || isInsufficientFunds}
          />
        </div>
      </div>
    </div>
  );
}

