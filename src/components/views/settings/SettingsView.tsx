import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import ViewHeader from "@/layout/ViewHeader";
import { selectThemeMode, setTheme, ThemeMode } from "@/redux/preferences";

const sections = [
  { title: "Security", path: "/settings/security", desc: "PIN, biometric, recovery" },
  { title: "Network", path: "/settings/network", desc: "Mainnet, testnet, RPC" },
  { title: "Currency", path: "/settings/currency", desc: "Display currency, units" },
  { title: "Import Wallet", path: "/wallet/import", desc: "Restore from recovery phrase" },
  { title: "About", path: "/settings/about", desc: "Version, links" },
];

const themes = [
  { value: ThemeMode.System, label: "System" },
  { value: ThemeMode.Light, label: "Light" },
  { value: ThemeMode.Dark, label: "Dark" },
] as const;

export default function SettingsView() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentTheme = useSelector(selectThemeMode);

  return (
    <div>
      <ViewHeader title="Settings" />
      <div className="flex flex-col px-4 gap-1">
        <div className="rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="font-medium text-neutral-800 dark:text-neutral-100">Appearance</div>
            <div className="text-xs text-neutral-500">Theme preference</div>
          </div>
          <div className="flex">
            {themes.map(({ value, label }, i) => (
              <button
                key={value}
                onClick={() => dispatch(setTheme(value))}
                className={`flex-1 p-3 text-sm font-medium transition-colors ${
                  currentTheme === value
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-500"
                } ${i < themes.length - 1 ? "border-r border-neutral-200 dark:border-neutral-700" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
