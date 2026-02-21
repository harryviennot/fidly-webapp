"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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

// Route segment keys for breadcrumb labels
const routeSegmentKeys: Record<string, string> = {
  "": "header.loyaltyProgram",
  program: "header.loyaltyProgram",
  details: "loyaltyProgram.nav.details",
  customers: "header.customers",
  design: "header.design",
  activity: "header.activity",
  team: "header.team",
  settings: "header.settings",
  account: "header.account",
  new: "header.new",
};

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

function useGenerateBreadcrumbs(pathname: string): Crumb[] {
  const t = useTranslations();
  const segments = pathname.split("/").filter(Boolean);

  // If we're at root, redirect happens so just show program
  if (segments.length === 0) {
    return [{ label: t("header.loyaltyProgram"), href: "/program", isLast: true }];
  }

  const breadcrumbs: Crumb[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Get label from config or derive it
    const key = routeSegmentKeys[segment];
    let label: string;
    if (key) {
      label = t(key);
    } else if (segment.match(/^[a-f0-9-]{8,}$/i)) {
      label = t("header.edit");
    } else {
      label = segment.charAt(0).toUpperCase() + segment.slice(1);
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
  const breadcrumbs = useGenerateBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--cream)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--cream)]/60 pt-2">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="md:hidden" />

        {/* Separator between trigger and breadcrumbs on mobile */}
        <Separator orientation="vertical" className="h-4 md:hidden" />

        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
