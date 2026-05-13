import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

import BottomNavigation from "@/layout/BottomNavigation";
import { selectIsDarkMode } from "@/redux/preferences";
import { NotificationProvider } from "@/kernel/app/NotificationService";

export default function MainLayout() {
  const isDark = useSelector(selectIsDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <NotificationProvider>
      <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-1000 text-neutral-800 dark:text-neutral-100">
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </NotificationProvider>
  );
}
