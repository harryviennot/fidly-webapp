import * as React from "react"
import { StampeoLogo } from "@/components/ui/stampeo-logo";
import { canSeeNavItem } from "@/lib/rbac";
import { useBusiness } from "@/contexts/business-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BusinessSwitcher } from "./business-switcher";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";
import {
  HouseIcon,
  UsersIcon,
  HeartIcon,
  UserPlusIcon,
  GearIcon,
  CaretRightIcon,
  CreditCardIcon,
  BellIcon,
  CalendarIcon,
  MapPinIcon,
  ChartBarIcon,
  Crown,
} from "@phosphor-icons/react";

const navItems = [
  { href: "/", label: "Loyalty Program", icon: HeartIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/team", label: "Team", icon: UserPlusIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

const loyaltyProgramSubItems = [
  { href: '/loyalty-program/overview', label: 'Overview', icon: ChartBarIcon },
  { href: '/loyalty-program/templates', label: 'Card Templates', icon: CreditCardIcon },
  { href: '/loyalty-program/notifications', label: 'Notifications', icon: BellIcon },
  { href: '/loyalty-program/settings', label: 'Settings', icon: GearIcon },
  { href: '/loyalty-program/scheduling', label: 'Scheduling', icon: CalendarIcon, proOnly: true },
  { href: '/loyalty-program/geofencing', label: 'Geofencing', icon: MapPinIcon, proOnly: true },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { currentRole, currentBusiness } = useBusiness();

  const isProPlan = currentBusiness?.subscription_tier === 'pro';

  const filteredNavItems = navItems.filter((item) =>
    canSeeNavItem(currentRole, item.href)
  );

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const isLoyaltyProgramActive = pathname.startsWith('/loyalty-program');
  const canSeeLoyaltyProgram = canSeeNavItem(currentRole, '/loyalty-program');

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader className="p-2">
        <BusinessSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2 pt-2">
            {/* Dashboard nav item */}
            {filteredNavItems.filter(item => item.href === "/").map((item) => {
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
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* Customers nav item */}
            {filteredNavItems.filter(item => item.href === "/customers").map((item) => {
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
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {/* HIDDEN FOR MVP: Loyalty Program collapsible submenu
                Pages are still accessible via direct URL.
                Re-enable when adding back advanced features. */}
            {/* {canSeeLoyaltyProgram && (
              <Collapsible
                asChild
                defaultOpen={isLoyaltyProgramActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Loyalty Program"
                      className={cn(
                        "transition-all duration-200",
                        isLoyaltyProgramActive
                          ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:text-white"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)]"
                      )}
                    >
                      <HeartIcon
                        className="h-5 w-5"
                        weight={isLoyaltyProgramActive ? "fill" : "regular"}
                      />
                      <span>Loyalty Program</span>
                      <CaretRightIcon
                        className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                        weight="bold"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {loyaltyProgramSubItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                        const isLocked = subItem.proOnly && !isProPlan;

                        return (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={subActive}
                              className={cn(
                                "transition-all duration-200",
                                subActive
                                  ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent-muted)]/50 hover:text-[var(--accent)]"
                              )}
                            >
                              <Link href={subItem.href}>
                                <SubIcon className="h-4 w-4" weight={subActive ? "fill" : "regular"} />
                                <span>{subItem.label}</span>
                                {isLocked && (
                                  <Crown className="ml-auto h-3 w-3 text-amber-500" weight="fill" />
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )} */}

            {/* Rest of nav items (Team, Settings) */}
            {filteredNavItems.filter(item => item.href !== "/" && item.href !== "/customers").map((item) => {
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
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer */}
      <SidebarFooter className="p-0">
        {/* Powered by Stampeo */}
        <div className="px-4">
          <div className="flex items-start flex-col gap-1 text-xs text-muted-foreground">
            <span>Powered by</span>
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
