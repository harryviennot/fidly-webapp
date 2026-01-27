"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { title: string; description?: string }> = {
  "/app": { title: "Dashboard", description: "Overview of your business" },
  "/app/customers": { title: "Customers", description: "Manage your loyalty customers" },
  "/app/design": { title: "Card Design", description: "Customize your loyalty cards" },
  "/app/team": { title: "Team", description: "Manage team members and permissions" },
  "/app/settings": { title: "Settings", description: "Configure your business" },
};

export function DashboardHeader() {
  const pathname = usePathname();

  // Find the matching page title
  const getPageInfo = () => {
    // Exact match first
    if (pageTitles[pathname]) {
      return pageTitles[pathname];
    }
    // Then check for prefix matches (for nested routes)
    for (const [path, info] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path) && path !== "/app") {
        return info;
      }
    }
    return { title: "Dashboard", description: "" };
  };

  const { title, description } = getPageInfo();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-16 items-center px-6">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </header>
  );
}
