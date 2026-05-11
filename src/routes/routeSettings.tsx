import SettingsView from "@/views/settings/SettingsView";
import SecuritySettings from "@/views/settings/SecuritySettings";
import NetworkSettings from "@/views/settings/NetworkSettings";
import CurrencySettings from "@/views/settings/CurrencySettings";
import AboutView from "@/views/settings/AboutView";

export const routeSettings = [
  {
    path: "/settings",
    element: <SettingsView />,
  },
  {
    path: "/settings/security",
    element: <SecuritySettings />,
  },
  {
    path: "/settings/network",
    element: <NetworkSettings />,
  },
  {
    path: "/settings/currency",
    element: <CurrencySettings />,
  },
  {
    path: "/settings/about",
    element: <AboutView />,
  },
];
