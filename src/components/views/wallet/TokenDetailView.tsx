import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatEther } from "viem";

import ViewHeader from "@/layout/ViewHeader";
import Card from "@/atoms/Card";
import Address from "@/atoms/Address";
import WeiDisplay from "@/atoms/WeiDisplay";
import FiatValue from "@/atoms/FiatValue";
import Button from "@/atoms/Button";
import LoadingSkeleton from "@/atoms/LoadingSkeleton";
import SendIcon from "@/icons/SendIcon";
import ReceiveIcon from "@/icons/ReceiveIcon";
import { selectWalletAddress, selectWalletBalance, selectTrackedTokens } from "@/redux/wallet";
import { selectChainId, selectShouldHideBalance } from "@/redux/preferences";
import { buildAddressUrl } from "@/util/networks";
import { getNativeCurrency } from "@/chains";
import { useTranslation } from "@/translations";
import { getTokenList } from "@/kernel/evm/TokenManagerService";
import { useEffect, useState } from "react";
import TokenManagerService, { TokenBalance } from "@/kernel/evm/TokenManagerService";

export default function TokenDetailView() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const address = useSelector(selectWalletAddress);
  const nativeBalance = useSelector(selectWalletBalance);
  const chainId = useSelector(selectChainId);
  const hideBalance = useSelector(selectShouldHideBalance);
  const trackedTokens = useSelector(selectTrackedTokens);
  const { t } = useTranslation();
  
  const nativeCurrency = getNativeCurrency(chainId);
  const isNative = symbol === nativeCurrency.symbol;
  const [token, setToken] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(!isNative);

  useEffect(() => {
    if (isNative) {
      setToken({
        address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        symbol: nativeCurrency.symbol,
        name: nativeCurrency.name,
        balance: BigInt(nativeBalance),
        decimals: nativeCurrency.decimals,
      });
      return;
    }

    if (!address || !symbol) return;

    const allTokens = [...getTokenList(chainId), ...trackedTokens.filter(t => t.chainId === chainId)];
    const tokenInfo = allTokens.find(t => t.symbol === symbol);
    
    if (tokenInfo) {
      TokenManagerService(chainId)
        .getTokenBalance(address as `0x${string}`, tokenInfo.address!)
        .then(res => {
          if (res) {
            setToken({ ...res, symbol: tokenInfo.symbol, decimals: tokenInfo.decimals });
          } else {
            setToken({
              address: tokenInfo.address as `0x${string}`,
              symbol: tokenInfo.symbol,
              decimals: tokenInfo.decimals,
              balance: 0n,
            });
          }
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [symbol, address, nativeBalance, chainId, trackedTokens]);

  if (!token && !loading) {
    return (
      <div>
        <ViewHeader title={t("common.error")} showBack />
        <div className="p-4 text-center text-neutral-500">Token not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ViewHeader title={token?.name || symbol || ""} showBack />
      
      <div className="flex flex-col items-center gap-2 px-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20">
          {symbol?.slice(0, 3)}
        </div>
        <div className="text-3xl font-bold font-display mt-2">
          {loading ? (
            <LoadingSkeleton variant="text" className="w-32 h-8" />
          ) : (
            <WeiDisplay wei={token?.balance || 0n} decimals={token?.decimals} symbol={token?.symbol} hideBalance={hideBalance} />
          )}
        </div>
        {!hideBalance && token && (
          <FiatValue wei={token.balance} decimals={token.decimals} className="text-neutral-500" />
        )}
      </div>

      <div className="flex gap-4 px-4">
        <Button
          label={t("common.send")}
          icon={SendIcon}
          variant="primary"
          fullWidth
          onClick={() => navigate("/wallet/send")}
        />
        <Button
          label={t("common.receive")}
          icon={ReceiveIcon}
          variant="secondary"
          fullWidth
          onClick={() => navigate("/wallet/receive")}
        />
      </div>

      {symbol === "DOC" ? (
        <div className="flex gap-4 px-4">
          <Button
            label={t("protocols.moc.mintDoc_btn")}
            variant="secondary"
            fullWidth
            onClick={() => navigate("/protocols/moc/create-doc")}
          />
          <Button
            label={t("protocols.moc.redeemDoc_btn")}
            variant="secondary"
            fullWidth
            onClick={() => navigate("/protocols/moc/redeem-doc")}
          />
        </div>
      ) : symbol === "BPro" ? (
        <div className="flex gap-4 px-4">
          <Button
            label={t("protocols.moc.mintBPro_btn")}
            variant="secondary"
            fullWidth
            onClick={() => navigate("/protocols/moc/buy-bpro")}
          />
          <Button
            label={t("protocols.moc.redeemBPro_btn")}
            variant="secondary"
            fullWidth
            onClick={() => navigate("/protocols/moc/sell-bpro")}
          />
        </div>
      ) : (
        <div className="px-4">
          <button
            disabled
            className="w-full p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between opacity-60"
          >
            <span className="font-bold text-neutral-800 dark:text-neutral-100 italic">Buy</span>
            <span className="text-xs text-neutral-400">(coming soon)</span>
          </button>
        </div>
      )}

      <div className="px-4 flex flex-col gap-4">
        <Card className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Your Wallet Address</label>
            <div className="flex items-center justify-between">
              <Address address={address} className="text-sm font-mono text-neutral-700 dark:text-neutral-300" />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  // Optional: Add toast or feedback
                }}
                className="text-primary text-xs font-bold"
              >
                Copy
              </button>
            </div>
          </div>
          
          <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
            <a
              href={token?.address ? buildAddressUrl(chainId, token.address) : buildAddressUrl(chainId, address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group"
            >
              <span className="text-sm text-neutral-700 dark:text-neutral-300">View on Explorer</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
