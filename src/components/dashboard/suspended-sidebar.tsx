"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { BusinessSwitcher } from "./business-switcher";
import { NavUser } from "./nav-user";
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
  Wallet,
  Question,
} from "@phosphor-icons/react";

type Item = { labelKey: string; icon: React.ComponentType<{ className?: string; weight?: "regular" | "bold" }> };

const mainItems: Item[] = [
  { labelKey: "nav.dashboard", icon: SquaresFour },
  { labelKey: "nav.customers", icon: Users },
  { labelKey: "nav.activity", icon: ChartBar },
];

const programItems: Item[] = [
  { labelKey: "loyaltyProgram.nav.overview", icon: QrCode },
  { labelKey: "loyaltyProgram.nav.configuration", icon: GearSix },
  { labelKey: "loyaltyProgram.nav.templates", icon: CreditCard },
  { labelKey: "loyaltyProgram.nav.notifications", icon: Bell },
  { labelKey: "loyaltyProgram.nav.broadcasts", icon: Megaphone },
  { labelKey: "loyaltyProgram.nav.locations", icon: MapPin },
];

const manageItems: Item[] = [
  { labelKey: "nav.team", icon: UserCircle },
  { labelKey: "nav.settings", icon: GearSix },
  { labelKey: "nav.billing", icon: Wallet },
];

const bottomItems: Item[] = [
  { labelKey: "nav.support", icon: Question },
];

export function SuspendedSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations();

  const renderItem = (item: Item, index: number) => {
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={`${item.labelKey}-${index}`}>
        <div
          aria-disabled="true"
          className="flex items-center gap-2 h-9 px-2 rounded-md text-[var(--muted-foreground)] opacity-50 pointer-events-none select-none"
        >
          <Icon className="h-[18px] w-[18px]" weight="bold" />
          <span className="text-sm">{t(item.labelKey)}</span>
        </div>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="p-3">
        <BusinessSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {mainItems.map(renderItem)}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
            {t("nav.sectionLoyaltyProgram")}
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {programItems.map(renderItem)}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">
            {t("nav.sectionManage")}
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {manageItems.map(renderItem)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <div className="px-3">
          <SidebarMenu className="gap-0.5">
            {bottomItems.map(renderItem)}
          </SidebarMenu>
        </div>

        <SidebarSeparator className="mx-3" />

        <div className="px-3 pb-3">
          <NavUser />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
