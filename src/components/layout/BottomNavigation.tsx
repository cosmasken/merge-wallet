import { NavLink } from "react-router-dom";

import WalletIcon from "@/icons/WalletIcon";
import AssetsIcon from "@/icons/AssetsIcon";
import ProtocolsIcon from "@/icons/ProtocolsIcon";

const tabs = [
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/assets", label: "Assets", icon: AssetsIcon },
  { to: "/protocols", label: "Explore", icon: ProtocolsIcon },
];

export default function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 safe-area-bottom">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              isActive
                ? "text-primary"
                : "text-neutral-400 dark:text-neutral-500"
            }`
          }
        >
          <Icon className="w-6 h-6" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
