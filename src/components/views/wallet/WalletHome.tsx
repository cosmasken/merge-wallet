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
import { selectIsConnected } from "@/redux/device";
import BalanceService from "@/kernel/evm/BalanceService";

export default function WalletHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectWalletBalance);
  const seedBackedUp = useSelector(selectSeedBackedUp);
  const isConnected = useSelector(selectIsConnected);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

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

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-8">
      {!isConnected && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-error/10 border border-error/30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0" />
          <p className="text-xs text-error">
            No internet connection
          </p>
        </div>
      )}

      {connectionError && isConnected && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-warn-light/20 border border-warn/30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warn animate-pulse shrink-0" />
          <p className="text-xs text-warn-dark">
            Unable to reach Rootstock network
          </p>
        </div>
      )}

      {!seedBackedUp && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-warn-light/20 border border-warn/30 flex items-center justify-between">
          <p className="text-xs text-warn-dark">
            Back up your recovery phrase to protect your wallet.
          </p>
          <button
            onClick={() => navigate("/wallet/backup")}
            className="text-xs font-semibold text-primary ml-2 shrink-0"
          >
            Back Up
          </button>
        </div>
      )}

      <div className="text-center">
        <div className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">
          {isLoading ? (
            <div className="w-32 h-8 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mx-auto" />
          ) : (
            <WeiDisplay value={BigInt(balance)} />
          )}
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
                <WeiDisplay value={BigInt(balance)} />
              )}
            </span>
          </div>
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
