import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router";

import "./index.css";
import { store } from "@/redux/store";
import AppProvider from "@/AppProvider";
import ErrorBoundary from "@/layout/ErrorBoundary";
import MainLayout from "@/layout/MainLayout";
import IndexRoute from "@/views/IndexRoute";
import WalletOnboarding from "@/views/wallet/WalletOnboarding";
import { routeWallet } from "@/routes/routeWallet";
import { routeAssets } from "@/routes/routeAssets";
import { routeSettings } from "@/routes/routeSettings";
import { routeProtocols } from "@/routes/routeProtocols";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "/",
        element: <IndexRoute />,
      },
      {
        path: "/onboarding",
        element: <WalletOnboarding />,
      },
      ...routeWallet,
      ...routeAssets,
      ...routeSettings,
      ...routeProtocols,
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </Provider>
  </StrictMode>,
);
