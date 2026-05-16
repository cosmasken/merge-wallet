import SettingsView from "@/views/settings/SettingsView";
import SecuritySettings from "@/views/settings/SecuritySettings";
import NetworkSettings from "@/views/settings/NetworkSettings";
import CurrencySettings from "@/views/settings/CurrencySettings";
import AboutView from "@/views/settings/AboutView";
import LanguageSettings from "@/views/settings/LanguageSettings";
import AddressBook from "@/views/wallet/AddressBook";
import GovernanceView from "@/views/settings/GovernanceView";

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
    path: "/settings/governance",
    element: <GovernanceView />,
  },
  {
    path: "/settings/about",
    element: <AboutView />,
  },
  {
    path: "/settings/language",
    element: <LanguageSettings />,
  },
  {
    path: "/settings/contacts",
    element: <AddressBook />,
  },
];
