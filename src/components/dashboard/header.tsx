"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route configuration for breadcrumb labels
const routeLabels: Record<string, string> = {
  "": "Loyalty Program",
  customers: "Customers",
  design: "Card Design",
  team: "Team",
  settings: "Settings",
  account: "Account",
  new: "New Design",
};

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

function generateBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  // If we're at root (Loyalty Program page)
  if (segments.length === 0) {
    return [{ label: "Loyalty Program", href: "/", isLast: true }];
  }

  const breadcrumbs: Crumb[] = [
    { label: "Loyalty Program", href: "/", isLast: false },
  ];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Get label from config or derive it
    let label = routeLabels[segment];
    if (!label) {
      // Check if it's a UUID/ID (dynamic segment)
      if (segment.match(/^[a-f0-9-]{8,}$/i)) {
        label = "Edit";
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    }

    breadcrumbs.push({
      label,
      href: currentPath,
      isLast,
    });
  });

  return breadcrumbs;
}

export function DashboardHeader() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--cream)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--cream)]/60 pt-4">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="md:hidden" />

        {/* Separator between trigger and breadcrumbs on mobile */}
        <Separator orientation="vertical" className="h-4 md:hidden" />

        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <BreadcrumbItem key={crumb.href}>
                {index > 0 && <BreadcrumbSeparator />}
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
