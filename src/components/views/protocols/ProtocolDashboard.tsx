import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";
import Card from "@/atoms/Card";
import Button from "@/atoms/Button";
import WeiDisplay from "@/atoms/WeiDisplay";
import PullToRefresh from "@/atoms/PullToRefresh";
import { selectWalletAddress } from "@/redux/wallet";
import { selectChainId } from "@/redux/preferences";
import MoCService from "@/rsk/MoCService";
import { getProtocolTokens } from "@/rsk/addresses";

export default function ProtocolDashboard() {
  const navigate = useNavigate();
  const address = useSelector(selectWalletAddress);
  const chainId = useSelector(selectChainId);
  const [btcPrice, setBtcPrice] = useState<string | null>(null);
  const [protocolBalances, setProtocolBalances] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState(true);

  const protocolTokens = getProtocolTokens(chainId);
  const hasProtocols = protocolTokens.length > 0;

  useEffect(() => {
    if (!address || !hasProtocols) { setLoading(false); return; }
    const moc = MoCService(chainId);
    const load = async () => {
      try {
        const price = await moc.getBtcPrice().catch(() => null);
        if (price) setBtcPrice(price.toString());
        const { erc20Abi } = await import("viem");
        const { getPublicClientByChainId } = await import("@/kernel/evm/ClientService");
        const client = getPublicClientByChainId(chainId);
        for (const t of protocolTokens) {
          try {
            const bal = await client.readContract({
              address: t.address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            }) as bigint;
            setProtocolBalances(prev => ({ ...prev, [t.symbol]: bal }));
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address, chainId, hasProtocols]);

  const byProtocol = (protocol: string) =>
    protocolTokens.filter(t => t.protocol === protocol);

  return (
    <>
      <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
      <div>
        <ViewHeader title="Protocols" subtitle="RSK ecosystem integrations" />
        {!hasProtocols && (
          <div className="mx-4 p-3 rounded-lg bg-warn-light/20 border border-warn/30 text-xs text-warn-dark">
            No protocol integrations available on this network.
          </div>
        )}
        {chainId === 31 && (
          <div className="mx-4 mt-2 p-2 rounded-lg bg-primary/10 text-xs text-primary text-center">
            Testnet — balances are for testing only
          </div>
        )}
        <div className="flex flex-col gap-4 px-4 mt-4">

          {/* MoC Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Money On Chain</h2>
              {btcPrice && <span className="text-xs text-neutral-500">BTC: ${(BigInt(btcPrice) / 10n ** 18n).toString()}</span>}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {byProtocol('moc').map(t => (
                <div key={t.symbol} className="flex justify-between">
                  <span className="text-neutral-500">{t.symbol}</span>
                  <WeiDisplay wei={protocolBalances[t.symbol] ?? 0n} symbol={t.symbol} decimals={t.decimals} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button label="Create DOC" variant="secondary" size="sm" onClick={() => navigate("/protocols/moc")} />
              <Button label="Buy BPro" variant="secondary" size="sm" onClick={() => navigate("/protocols/moc")} />
            </div>
          </Card>

          {/* Tropykus Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Tropykus</h2>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {byProtocol('tropykus').map(t => (
                <div key={t.symbol} className="flex justify-between">
                  <span className="text-neutral-500">{t.symbol}</span>
                  <WeiDisplay wei={protocolBalances[t.symbol] ?? 0n} symbol={t.symbol} decimals={t.decimals} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button label="Lend" variant="secondary" size="sm" onClick={() => navigate("/protocols/tropykus")} />
              <Button label="Borrow" variant="secondary" size="sm" onClick={() => navigate("/protocols/tropykus")} />
            </div>
          </Card>

          {/* Sovryn Card */}
          <Card className="p-4">
            {chainId !== 30 && (
              <div className="mb-2 p-1.5 rounded bg-warn-light/20 border border-warn/30 text-xs text-warn-dark text-center">
                Mainnet only — switch to RSK Mainnet to use
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Sovryn</h2>
              <a href="https://sovryn.app" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold">Open dapp ↗</a>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {byProtocol('sovryn').length > 0 ? byProtocol('sovryn').map(t => (
                <div key={t.symbol} className="flex justify-between">
                  <span className="text-neutral-500">{t.symbol}</span>
                  <WeiDisplay wei={protocolBalances[t.symbol] ?? 0n} symbol={t.symbol} decimals={t.decimals} />
                </div>
              )) : (
                <div className="text-xs text-neutral-400 italic py-1">Tokens only available on mainnet</div>
              )}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button label="Swap" variant="secondary" size="sm" disabled={chainId !== 30} onClick={() => navigate("/protocols/sovryn/swap")} />
              <Button label="Earn" variant="secondary" size="sm" disabled={chainId !== 30} onClick={() => navigate("/protocols/sovryn/earn")} />
            </div>
            <div className="flex gap-2 mt-2">
              <a href="https://sovryn.app/trade" target="_blank" rel="noopener noreferrer"
                className="flex-1 p-2 text-center text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-primary/50 transition-colors">
                Margin Trade ↗
              </a>
              <a href="https://sovryn.app/lending" target="_blank" rel="noopener noreferrer"
                className="flex-1 p-2 text-center text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-primary/50 transition-colors">
                Loans ↗
              </a>
              <a href="https://sovryn.app/staking" target="_blank" rel="noopener noreferrer"
                className="flex-1 p-2 text-center text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-primary/50 transition-colors">
                Staking ↗
              </a>
            </div>
          </Card>

        </div>
      </div>
    </PullToRefresh>
    </>
  );
}
