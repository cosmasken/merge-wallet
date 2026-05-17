import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { isAddress, parseEther, formatEther, encodeFunctionData, erc20Abi, parseUnits } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import { selectWalletAddress, selectWalletBalance, selectUseSmartWallet, selectSmartWalletAddress, selectActiveAddress, selectContacts, addContact, addPendingTransaction } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import { selectIsConnected } from "@/redux/device";
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
import { getNativeCurrency } from "@/chains";
import { useTranslation } from "@/translations";
import BalanceService from "@/kernel/evm/BalanceService";
import RifRelayService from "@/kernel/evm/RifRelayService";

interface TokenOption {
  type: "native" | "erc20";
  symbol: string;
  address?: `0x${string}`;
  decimals: number;
  balance: bigint;
}

export default function WalletSend() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectWalletBalance);
  const chainId = useSelector(selectChainId);
  const isConnected = useSelector(selectIsConnected);
  const contacts = useSelector(selectContacts);
  const useSmartWallet = useSelector(selectUseSmartWallet);
  const smartWalletAddress = useSelector(selectSmartWalletAddress);
  const activeAddress = useSelector(selectActiveAddress);

  const [to, setTo] = useState("");
  const [contactName, setContactName] = useState("");
  const [shouldSaveContact, setShouldSaveContact] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
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

  const [activeBalance, setActiveBalance] = useState("0");

  const [selectedToken, setSelectedToken] = useState<TokenOption>({
    type: "native",
    symbol: nativeCurrency.symbol,
    decimals: nativeCurrency.decimals,
    balance: BigInt(balance),
  });
  const [tokenBalances, setTokenBalances] = useState<TokenOption[]>([]);

  // Sync activeBalance
  useEffect(() => {
    if (!activeAddress) return;
    if (useSmartWallet) {
      const Balance = BalanceService(chainId);
      Balance.getBalance(activeAddress as `0x${string}`)
        .then(b => setActiveBalance(b.toString()))
        .catch(() => setActiveBalance("0"));
    } else {
      setActiveBalance(balance);
    }
  }, [activeAddress, useSmartWallet, balance, chainId]);

  // Fetch balances for activeAddress
  useEffect(() => {
    if (!activeAddress) return;
    TokenManagerService(chainId)
      .getAllTokenBalances(activeAddress as `0x${string}`, getTokenList(chainId))
      .then((results) => {
        const tokens: TokenOption[] = [
          { type: "native", symbol: nativeCurrency.symbol, decimals: nativeCurrency.decimals, balance: BigInt(activeBalance) },
          ...results.map((t) => ({
            type: "erc20" as const,
            symbol: t.symbol,
            address: t.address,
            decimals: t.decimals,
            balance: t.balance,
          })),
        ];
        setTokenBalances(tokens);

        // Sync selected token balance
        const match = tokens.find(t => t.symbol === selectedToken.symbol);
        if (match) {
          setSelectedToken(match);
        } else {
          setSelectedToken(tokens[0]);
        }
      });
  }, [activeAddress, chainId, activeBalance]);

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
      if (useSmartWallet) {
        const serverInfo = await RifRelayService(chainId).getRelayServerInfo();
        if (serverInfo) {
          const gPrice = BigInt(serverInfo.minGasPrice || "6000000000");
          setGasPrice(gPrice);
          setGasEstimate(100000n);
        } else {
          setGasEstimate(100000n);
        }
      } else {
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
      }
    } catch (e) {
      const msg = classifyError(e).message
      if (msg.includes("gas") || msg.includes("intrinsic")) {
        setGasEstimate(0n)
      } else {
        setError(msg);
      }
    }
    setIsEstimating(false);
  };

  const handleInitiateSend = async () => {
    if (!isValidAddress || !isValidAmount) return;
    if (isInsufficientFunds) {
      setError(t("wallet.send.insufficient", { symbol: selectedToken.symbol }));
      return;
    }
    setIsConfirming(true);
  };

  useEffect(() => {
    if (isConfirming && gasEstimate === null) {
      handleEstimateGas()
    }
  }, [isConfirming])

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
      if (shouldSaveContact && contactName) {
        dispatch(addContact({ name: contactName, address: to }));
        NotificationService().success(`Contact "${contactName}" saved`);
      }

      if (useSmartWallet) {
        const relayService = RifRelayService(chainId);
        let target: `0x${string}`;
        let data: `0x${string}`;
        let value: bigint = 0n;

        if (selectedToken.type === "native") {
          target = to as `0x${string}`;
          data = "0x";
          value = valueWei;
        } else {
          target = selectedToken.address!;
          data = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [to as `0x${string}`, valueWei],
          });
          value = 0n;
        }

        const res = await relayService.relayTransaction(target, data, value);
        if (!res.success) {
          throw new Error(res.error || t("wallet.send.rif_error"));
        }

        const hash = res.txHash as `0x${string}`;
        setTxHash(hash);
        dispatch(addPendingTransaction({
          hash,
          type: selectedToken.type === "native" ? "send" : "contract",
          amount,
          symbol: selectedToken.symbol,
          chainId,
        }));
        NotificationService().success(
          selectedToken.type === "native"
            ? t("wallet.send.success_rif_native")
            : t("wallet.send.success_rif_erc20")
        );
      } else {
        const txManager = TransactionManagerService(chainId);

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
          <button
            onClick={() => navigate(`/tx/${txHash}`)}
            className="text-primary text-sm font-semibold hover:underline"
          >
            {t("wallet.send.view_explorer")}
          </button>
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
    const gasReady = gasEstimate !== null && gasPrice !== null
    return (
      <div>
        <ViewHeader title={t("wallet.send.confirm_title")} showBack onBack={() => setIsConfirming(false)} />
        {isEstimating && !gasReady ? (
          <div className="flex flex-col items-center gap-4 px-4 pt-16 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center animate-pulse">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h2 className="text-lg font-bold">Estimating network fee</h2>
            <p className="text-sm text-neutral-500">Please wait...</p>
          </div>
        ) : (
          <TransactionConfirmation
            transaction={{
              to: to as `0x${string}`,
              value: valueWei,
              gasEstimate: useSmartWallet ? 0n : (gasEstimate ?? 0n),
              gasPrice: useSmartWallet ? 0n : (gasPrice ?? 0n),
              total: useSmartWallet ? valueWei : (valueWei + (gasEstimate ?? 0n) * (gasPrice ?? 0n)),
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
        )}
        {error && (
          <p className="text-error text-sm bg-error/10 p-3 m-4 rounded-lg">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <ViewHeader 
        title={useSmartWallet ? t("wallet.send.rif_title") : t("wallet.send.title")} 
        subtitle={useSmartWallet ? t("wallet.send.rif_subtitle") : t("wallet.send.subtitle")} 
        showBack 
      />
      <div className="flex flex-col gap-4 px-4">
        <div>
          <label className="text-sm text-neutral-500 mb-1.5 block">{t("wallet.send.token_label")}</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 transition-all hover:border-primary/50 text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {selectedToken.symbol.slice(0, 3)}
                </div>
                <div>
                  <div className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{selectedToken.symbol}</div>
                  <div className="text-xs text-neutral-400">
                    Balance: {formatEther(selectedToken.balance)} {selectedToken.symbol}
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${isTokenDropdownOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isTokenDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                {tokenBalances.map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedToken(token);
                      setGasEstimate(null);
                      setError("");
                      setIsTokenDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                      selectedToken.symbol === token.symbol ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-primary dark:text-neutral-300 shrink-0">
                        {token.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">{token.symbol}</div>
                        <div className="text-xs text-neutral-500 font-mono">
                          {formatEther(token.balance)} {token.symbol}
                        </div>
                      </div>
                    </div>
                    {selectedToken.symbol === token.symbol && (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
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

        {isEstimating && (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <LoadingSpinner size="sm" />
            <span>{t("wallet.send.estimating")}</span>
          </div>
        )}

        {gasEstimate !== null && gasPrice !== null && !isEstimating && (
          <div className="text-sm text-neutral-500">
            {t("wallet.send.max_fee_label")}: {formatEther(gasEstimate * gasPrice)} {selectedToken.symbol}
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

