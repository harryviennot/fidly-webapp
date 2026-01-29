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
import { getBackgroundFromSettings, getContrastTextColor } from "@/utils/theme";

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
      {(() => {
        const bgColor = currentBusiness?.logo_url
          ? getBackgroundFromSettings(currentBusiness.settings)
          : null;
        const textColor = bgColor ? getContrastTextColor(bgColor) : "dark";

        return (
          <div
            className="flex h-[68px] items-center gap-3 px-4"
            style={bgColor ? { backgroundColor: bgColor } : undefined}
          >
            {currentBusiness?.logo_url ? (
              <>
                <img
                  src={currentBusiness.logo_url}
                  alt={currentBusiness.name}
                  className="object-contain transition-all duration-300"
                  style={{ height: 40, maxWidth: 120 }}
                />
                <span
                  className="font-bold text-xl"
                  style={{ color: textColor === "white" ? "#ffffff" : "var(--foreground)" }}
                >
                  {currentBusiness.name}
                </span>
              </>
            ) : (
              <>
                <StampeoLogo className="w-8 h-8 text-[var(--accent)]" />
                <span className="font-bold text-xl text-[var(--foreground)]">Stampeo</span>
              </>
            )}
          </div>
        );
      })()}



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




      <div className="px-6 py-3">
        <div className="flex items-center flex-col gap-1 text-xs text-muted-foreground">
          <span>Powered by</span>
          <div className="flex items-center gap-2 transition-transform group-hover:scale-105">
            <StampeoLogo className="w-6 h-6" />
            <span className="text-xl font-bold gradient-text">
              Stampeo
            </span>
          </div>
        </div>
      </div>



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
