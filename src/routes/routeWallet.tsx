import WalletHome from "@/views/wallet/WalletHome";
import WalletSend from "@/views/wallet/WalletSend";
import WalletReceive from "@/views/wallet/WalletReceive";
import WalletHistory from "@/views/wallet/WalletHistory";
import WalletImport from "@/views/wallet/WalletImport";
import SeedBackup from "@/views/wallet/SeedBackup";
import TokenDetailView from "@/views/wallet/TokenDetailView";
import WalletManager from "@/views/settings/WalletManager";

export const routeWallet = [
  {
    path: "/wallet",
    children: [
      {
        index: true,
        element: <WalletHome />,
      },
      {
        path: "send",
        element: <WalletSend />,
      },
      {
        path: "receive",
        element: <WalletReceive />,
      },
      {
        path: "history",
        element: <WalletHistory />,
      },
      {
        path: "backup",
        element: <SeedBackup />,
      },
      {
        path: "token/:symbol",
        element: <TokenDetailView />,
      },
      {
        path: "manage",
        element: <WalletManager />,
      },
    ],
  },
  {
    path: "/wallet/import",
    element: <WalletImport />,
  },
];
