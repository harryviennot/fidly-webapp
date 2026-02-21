import * as React from "react"
import { useTranslations } from "next-intl";
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { canSeeNavItem } from "@/lib/rbac";
import { useBusiness } from "@/contexts/business-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BusinessSwitcher } from "./business-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";
import {
  UsersIcon,
  HeartIcon,
  UserPlusIcon,
  GearIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/program", labelKey: "nav.program" as const, icon: HeartIcon },
  { href: "/customers", labelKey: "nav.customers" as const, icon: UsersIcon },
  { href: "/activity", labelKey: "nav.activity" as const, icon: ClockCounterClockwiseIcon },
  { href: "/team", labelKey: "nav.team" as const, icon: UserPlusIcon },
  { href: "/settings", labelKey: "nav.settings" as const, icon: GearIcon },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentRole } = useBusiness();
  const t = useTranslations();

  const filteredNavItems = navItems.filter((item) =>
    canSeeNavItem(currentRole, item.href)
  );

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <Sidebar variant="floating" {...props} className="pr-0">
      <SidebarHeader className="p-2">
        <BusinessSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2 pt-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    className={cn(
                      "transition-all duration-200",
                      active
                        ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)]"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon
                        className="h-5 w-5"
                        weight={active ? "fill" : "regular"}
                      />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer */}
      <SidebarFooter className="p-0">
        {/* Powered by Stampeo */}
        <div className="px-4">
          <div className="flex items-start flex-col gap-1 text-xs text-muted-foreground">
            <span>{t("poweredBy")}</span>
            <div className="flex items-center gap-2">
              <StampeoLogo className="w-5 h-5" />
              <span className="text-lg font-bold gradient-text">Stampeo</span>
            </div>
          </div>
        </div>

        <SidebarSeparator className="mx-0 my-0" />

        {/* User Profile */}
        <div className="px-2 pb-2">
          <NavUser />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
