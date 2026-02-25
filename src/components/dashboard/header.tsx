"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center h-14 px-4 md:hidden">
      <SidebarTrigger />
    </header>
  );
}
