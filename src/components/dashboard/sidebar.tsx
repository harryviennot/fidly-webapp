"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HouseIcon,
  UsersIcon,
  PaletteIcon,
  UserPlusIcon,
  GearIcon,
  SignOutIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StampeoLogo } from "@/components/ui/stampeo-logo";

const navItems = [
  { href: "/", label: "Dashboard", icon: HouseIcon },
  { href: "/customers", label: "Customers", icon: UsersIcon },
  { href: "/design", label: "Card Design", icon: PaletteIcon },
  { href: "/team", label: "Team", icon: UserPlusIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { currentBusiness, memberships, setCurrentBusiness, loading } = useBusiness();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-[var(--border)] bg-[var(--cream)]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4">
        <StampeoLogo className="w-7 h-7 text-[var(--accent)]" />
        <span className="font-bold text-lg text-[var(--foreground)]">Stampeo</span>
      </div>

      <Separator className="bg-[var(--border)]" />

      {/* Business Selector */}
      <div className="p-4">
        {memberships.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-3 px-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-white font-semibold">
                    {currentBusiness?.name?.[0] || "B"}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">
                      {currentBusiness?.name || "Select Business"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentBusiness?.subscription_tier || ""}
                    </p>
                  </div>
                </div>
                <CaretDownIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[248px]">
              {memberships.map((membership) => (
                <DropdownMenuItem
                  key={membership.id}
                  onClick={() => setCurrentBusiness(membership.business)}
                  className={cn(
                    "cursor-pointer",
                    currentBusiness?.id === membership.business.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--accent-muted)] text-[var(--accent)] font-medium text-sm">
                      {membership.business.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{membership.business.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {membership.role}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3 py-3 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-white font-semibold">
              {currentBusiness?.name?.[0] || "B"}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {currentBusiness?.name || "Loading..."}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentBusiness?.subscription_tier || ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-[var(--border)]" />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent-muted)] hover:text-[var(--accent)]"
              )}
            >
              <Icon className="h-5 w-5" weight={active ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-[var(--border)]" />

      {/* User Profile */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-[var(--accent-muted)] text-[var(--accent)]">
              {user?.email ? getInitials(user.email.split("@")[0]) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="shrink-0"
          >
            <SignOutIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
