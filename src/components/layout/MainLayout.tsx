import { Outlet } from "react-router-dom";

import BottomNavigation from "@/layout/BottomNavigation";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-1000 text-neutral-800 dark:text-neutral-100">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
