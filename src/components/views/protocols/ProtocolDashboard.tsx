import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";
import Card from "@/atoms/Card";
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
        <ViewHeader title="Explore" subtitle="DeFi protocols & earning opportunities" />
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
          <button onClick={() => navigate("/protocols/moc")} className="text-left w-full">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  MoC
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">Money On Chain</h2>
                    {btcPrice && <span className="text-xs text-neutral-500">BTC ${(BigInt(btcPrice) / 10n ** 18n).toString()}</span>}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">Mint/redeem RBTC-backed assets</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs">
                    {byProtocol('moc').map(t => (
                      <span key={t.symbol} className="text-neutral-500">
                        {t.symbol}: <WeiDisplay wei={protocolBalances[t.symbol] ?? 0n} symbol="" decimals={t.decimals} />
                      </span>
                    ))}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Card>
          </button>

          {/* Sovryn Card */}
          <button onClick={() => chainId === 30 ? navigate("/protocols/sovryn/swap") : undefined} className="text-left w-full" disabled={chainId !== 30}>
            <Card className={`p-4 ${chainId !== 30 ? "opacity-60" : ""}`}>
              {chainId !== 30 && (
                <div className="mb-2 p-1.5 rounded bg-warn-light/20 border border-warn/30 text-xs text-warn-dark text-center">
                  Mainnet only — switch to RSK Mainnet
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  Sv
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">Sovryn</h2>
                    <a href="https://sovryn.app" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold" onClick={e => e.stopPropagation()}>
                      dapp ↗
                    </a>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">Swap, earn, and trade with leverage</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs">
                    {byProtocol('sovryn').length > 0 ? byProtocol('sovryn').map(t => (
                      <span key={t.symbol} className="text-neutral-500">
                        {t.symbol}: <WeiDisplay wei={protocolBalances[t.symbol] ?? 0n} symbol="" decimals={t.decimals} />
                      </span>
                    )) : (
                      <span className="text-neutral-400 italic">Tokens only available on mainnet</span>
                    )}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-300 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Card>
          </button>

        </div>
      </div>
    </PullToRefresh>
    </>
  );
}
