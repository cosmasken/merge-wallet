import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import BottomNavigation from "@/layout/BottomNavigation";
import { selectIsDarkMode } from "@/redux/preferences";
import { selectWalletAddress } from "@/redux/wallet";
import { NotificationProvider } from "@/kernel/app/NotificationService";

export default function MainLayout() {
  const isDark = useSelector(selectIsDarkMode);
  const walletAddress = useSelector(selectWalletAddress);
  const location = useLocation();
  const navigate = useNavigate();
  
  const isOnboardingPath = location.pathname === "/onboarding" || 
                          location.pathname.startsWith("/wallet/import") ||
                          location.pathname.startsWith("/wallet/backup");

  // Redirect to onboarding if no wallet and not already on onboarding path
  useEffect(() => {
    if (!walletAddress && !isOnboardingPath) {
      navigate("/onboarding", { replace: true });
    }
  }, [walletAddress, isOnboardingPath, navigate]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Hide navigation during onboarding or when no wallet
  const showNavigation = walletAddress && !isOnboardingPath;

  return (
    <NotificationProvider>
      <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-1000 text-neutral-800 dark:text-neutral-100">
        <main className={`flex-1 overflow-y-auto ${showNavigation ? 'pb-20' : ''}`}>
          <Outlet />
        </main>
        {showNavigation && <BottomNavigation />}
      </div>
    </NotificationProvider>
  );
}
