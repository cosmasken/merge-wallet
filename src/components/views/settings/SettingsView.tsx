import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";

const sections = [
  { title: "Security", path: "/settings/security", desc: "PIN, biometric, recovery" },
  { title: "Network", path: "/settings/network", desc: "Mainnet, testnet, RPC" },
  { title: "Currency", path: "/settings/currency", desc: "Display currency, units" },
  { title: "Import Wallet", path: "/wallet/import", desc: "Restore from recovery phrase" },
  { title: "About", path: "/settings/about", desc: "Version, links" },
];

export default function SettingsView() {
  const navigate = useNavigate();

  return (
    <div>
      <ViewHeader title="Settings" />
      <div className="flex flex-col px-4 gap-1">
        {sections.map(({ title, path, desc }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-left"
          >
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-100">{title}</div>
              <div className="text-xs text-neutral-500">{desc}</div>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
