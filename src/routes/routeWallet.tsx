import WalletHome from "@/views/wallet/WalletHome";
import WalletSend from "@/views/wallet/WalletSend";
import WalletReceive from "@/views/wallet/WalletReceive";
import WalletHistory from "@/views/wallet/WalletHistory";
import WalletImport from "@/views/wallet/WalletImport";

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
    ],
  },
  {
    path: "/wallet/import",
    element: <WalletImport />,
  },
];
