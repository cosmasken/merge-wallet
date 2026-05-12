import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import Button from "@/atoms/Button";
import Card from "@/atoms/Card";
import Address from "@/atoms/Address";
import WeiDisplay from "@/atoms/WeiDisplay";
import SendIcon from "@/icons/SendIcon";
import ReceiveIcon from "@/icons/ReceiveIcon";
import HistoryIcon from "@/icons/HistoryIcon";
import { selectWalletAddress, selectWalletBalance, selectSeedBackedUp, setWalletBalance } from "@/redux/wallet";
import { selectShouldHideBalance, toggleHideBalance } from "@/redux/preferences";
import { selectIsConnected } from "@/redux/device";
import BalanceService from "@/kernel/evm/BalanceService";
import TokenManagerService from "@/kernel/evm/TokenManagerService";

const RIF_MAINNET = "0x2acc95758f8b5f583470bA265E685CF8e3f4283b";
const RIF_TESTNET = "0x19F64674D8A5B4E652319F5e239eFd3bc969a1fE";
const TRACKED_TOKENS = [RIF_TESTNET, RIF_MAINNET];

interface TokenBalance {
  symbol: string;
  balance: bigint;
}

export default function WalletHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectWalletBalance);
  const seedBackedUp = useSelector(selectSeedBackedUp);
  const isConnected = useSelector(selectIsConnected);
  const hideBalance = useSelector(selectShouldHideBalance);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);

  useEffect(function fetchBalance() {
    if (!address) return;

    setIsLoading(true);
    setConnectionError(false);
    const Balance = BalanceService();

    Balance.startAutoRefresh(
      address as `0x${string}`,
      (value) => {
        dispatch(setWalletBalance(value.toString()));
        setIsLoading(false);
        setConnectionError(false);
      },
      () => {
        setConnectionError(true);
        setIsLoading(false);
      },
    );

    return () => Balance.stopAutoRefresh();
  }, [address, dispatch]);

  useEffect(function fetchTokens() {
    if (!address) return;
    TokenManagerService()
      .getTokenBalances(address as `0x${string}`, TRACKED_TOKENS as `0x${string}`[])
      .then((results) => {
        setTokens(results.map((r) => ({ symbol: r.symbol, balance: r.balance })));
      });
  }, [address]);

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-8">
      {!isConnected && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-error/10 border border-error/30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0" />
          <p className="text-xs text-error">No internet connection</p>
        </div>
      )}

      {connectionError && isConnected && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-warn-light/20 border border-warn/30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warn animate-pulse shrink-0" />
          <p className="text-xs text-warn-dark">Unable to reach Rootstock network</p>
        </div>
      )}

      {!seedBackedUp && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-warn-light/20 border border-warn/30 flex items-center justify-between">
          <p className="text-xs text-warn-dark">Back up your recovery phrase to protect your wallet.</p>
          <button
            onClick={() => navigate("/wallet/backup")}
            className="text-xs font-semibold text-primary ml-2 shrink-0"
          >
            Back Up
          </button>
        </div>
      )}

      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">
            {isLoading ? (
              <div className="w-32 h-8 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mx-auto" />
            ) : (
              <WeiDisplay value={BigInt(balance)} hideBalance={hideBalance} />
            )}
          </div>
          <button
            onClick={() => dispatch(toggleHideBalance())}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 active:bg-neutral-300 dark:active:bg-neutral-700"
          >
            {hideBalance ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <Address address={address} short className="text-xs text-neutral-400" />

      <div className="flex gap-4 w-full max-w-sm">
        <Button
          label="Send"
          icon={SendIcon}
          variant="primary"
          fullWidth
          onClick={() => navigate("/wallet/send")}
        />
        <Button
          label="Receive"
          icon={ReceiveIcon}
          variant="secondary"
          fullWidth
          onClick={() => navigate("/wallet/receive")}
        />
      </div>

      <div className="w-full max-w-sm">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-neutral-500 mb-3">Tokens</h2>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">RBTC</div>
              <span className="font-medium">Rootstock RBTC</span>
            </div>
            <span className="font-mono text-sm">
              {isLoading ? (
                <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              ) : (
                <WeiDisplay value={BigInt(balance)} hideBalance={hideBalance} />
              )}
            </span>
          </div>
          {tokens.map((token) => (
            <div key={token.symbol} className="flex items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-200 dark:bg-primarydark-200 flex items-center justify-center text-xs font-bold text-primary-900 dark:text-primarydark-900">
                  {token.symbol.slice(0, 3)}
                </div>
                <span className="font-medium">{token.symbol}</span>
              </div>
              <span className="font-mono text-sm">
                <WeiDisplay value={token.balance} hideBalance={hideBalance} />
              </span>
            </div>
          ))}
        </Card>
      </div>

      <Button
        label="Transaction History"
        icon={HistoryIcon}
        variant="ghost"
        onClick={() => navigate("/wallet/history")}
      />
    </div>
  );
}
