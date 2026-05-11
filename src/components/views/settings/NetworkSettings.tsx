import { useDispatch, useSelector } from "react-redux";

import ViewHeader from "@/layout/ViewHeader";
import Card from "@/atoms/Card";
import { selectNetwork, setNetwork, type ValidNetwork } from "@/redux/preferences";
import { getChain } from "@/util/networks";

const NETWORKS: { key: ValidNetwork; label: string }[] = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
];

export default function NetworkSettings() {
  const dispatch = useDispatch();
  const currentNetwork = useSelector(selectNetwork);

  const handleSwitch = (network: ValidNetwork) => {
    dispatch(setNetwork(network));
  };

  return (
    <div>
      <ViewHeader title="Network" subtitle="Rootstock network configuration" />
      <div className="flex flex-col gap-3 px-4">
        {NETWORKS.map(({ key, label }) => {
          const chain = getChain(key);
          const isActive = currentNetwork === key;
          return (
            <button
              key={key}
              onClick={() => handleSwitch(key)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                isActive
                  ? "bg-primary/10 border-primary"
                  : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">
                    {label}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Chain ID: {chain.id}
                  </div>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="mt-1 text-xs text-neutral-400 font-mono truncate">
                {chain.rpcUrls.default.http[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
