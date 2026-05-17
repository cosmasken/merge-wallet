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
    children: [
      {
        index: true,
        element: <SettingsView />,
      },
      {
        path: "about",
        element: <AboutView />,
      },
      {
        path: "security",
        element: <SecuritySettings />,
      },
      {
        path: "network",
        element: <NetworkSettings />,
      },
      {
        path: "currency",
        element: <CurrencySettings />,
      },
      {
        path: "language",
        element: <LanguageSettings />,
      },
      {
        path: "contacts",
        element: <AddressBook />,
      },
      {
        path: "governance",
        element: <GovernanceView />,
      },
    ],
  },
];
