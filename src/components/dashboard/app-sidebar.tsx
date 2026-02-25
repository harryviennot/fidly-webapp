import * as React from "react"
import { useTranslations } from "next-intl";
import { canSeeNavItem } from "@/lib/rbac";
import { useBusiness } from "@/contexts/business-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BusinessSwitcher } from "./business-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";
import { Badge } from "@/components/ui/badge";
import {
  SquaresFour,
  Users,
  ChartBar,
  QrCode,
  GearSix,
  CreditCard,
  Bell,
  Megaphone,
  MapPin,
  UserCircle,
  Question,
} from "@phosphor-icons/react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; weight?: "regular" | "fill" | "bold" }>;
  pro?: boolean;
}

// Top section — no label
const mainItems: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: SquaresFour },
  { href: "/customers", labelKey: "nav.customers", icon: Users },
  { href: "/activity", labelKey: "nav.activity", icon: ChartBar },
];

// "LOYALTY PROGRAM" section
const programItems: NavItem[] = [
  { href: "/program", labelKey: "loyaltyProgram.nav.overview", icon: QrCode },
  { href: "/program/settings", labelKey: "loyaltyProgram.nav.settings", icon: GearSix },
  { href: "/program/templates", labelKey: "loyaltyProgram.nav.templates", icon: CreditCard },
  { href: "/program/notifications", labelKey: "loyaltyProgram.nav.notifications", icon: Bell },
  { href: "/program/promotions", labelKey: "loyaltyProgram.nav.promotions", icon: Megaphone, pro: true },
  { href: "/program/locations", labelKey: "loyaltyProgram.nav.locations", icon: MapPin, pro: true },
];

// "MANAGE" section
const manageItems: NavItem[] = [
  { href: "/team", labelKey: "nav.team", icon: UserCircle },
  { href: "/settings", labelKey: "nav.settings", icon: GearSix },
];

// Bottom utility links
const bottomItems: NavItem[] = [
  { href: "/support", labelKey: "nav.support", icon: Question },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentRole } = useBusiness();
  const t = useTranslations();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + '/');
  };

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => canSeeNavItem(currentRole, item.href));

  const filteredMain = filterItems(mainItems);
  const filteredProgram = filterItems(programItems);
  const filteredManage = filterItems(manageItems);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn(
            "transition-all duration-200 h-9",
            active
              ? "bg-[var(--muted)] border border-[var(--border-dark)] text-[var(--foreground)] font-semibold"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          <Link href={item.href}>
            <Icon
              className="h-[18px] w-[18px]"
              weight={active ? "fill" : "bold"}
            />
            <span className={cn(!active && "text-[#5A5A5A]")}>{t(item.labelKey)}</span>
            {item.pro && (
              <Badge variant="pro" className="ml-auto">
                PRO
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="p-3">
        <BusinessSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav — no section label */}
        {filteredMain.length > 0 && (
          <SidebarGroup>
            <SidebarMenu className="gap-0.5">
              {filteredMain.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Loyalty Program section */}
        {filteredProgram.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
              {t("nav.sectionLoyaltyProgram")}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {filteredProgram.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Manage section */}
        {filteredManage.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
              {t("nav.sectionManage")}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {filteredManage.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-0">
        {/* Bottom utility links */}
        <div className="px-3">
          <SidebarMenu className="gap-0.5">
            {bottomItems.map(renderNavItem)}
          </SidebarMenu>
        </div>

        <SidebarSeparator className="mx-3" />

        {/* User footer */}
        <div className="px-3 pb-3">
          <NavUser />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
