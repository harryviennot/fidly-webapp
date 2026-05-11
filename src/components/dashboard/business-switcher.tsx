"use client"

import * as React from "react"
import { CaretUpDown, Check, ArrowRight } from "@phosphor-icons/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBusiness } from "@/contexts/business-context"
import { useIsSuperadmin } from "@/lib/auth/use-is-superadmin"
import Image from "next/image"
import { cn } from "@/lib/utils"

const DROPDOWN_LIMIT = 5

function BusinessAvatar({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string | null; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const height = size === "sm" ? "h-7" : "h-9";

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={120}
        height={36}
        className={cn("w-auto shrink-0 object-contain", height)}
        unoptimized
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg shrink-0 flex items-center justify-center bg-[var(--accent)] text-white font-bold",
        height,
        size === "sm" ? "w-7 text-xs" : "w-9 text-sm"
      )}
    >
      {initials}
    </div>
  );
}

export function BusinessSwitcher() {
  const { memberships, currentBusiness, setCurrentBusiness } = useBusiness()
  const isSuperadmin = useIsSuperadmin()
  const t = useTranslations()

  // Superadmins always get the dropdown (even with 0/1 memberships) so they
  // can reach /businesses via "View all". Regular users only get a dropdown
  // when they have more than one membership.
  const hasMultipleMemberships = memberships.length > 1 || isSuperadmin
  const shouldShowViewAll = isSuperadmin || memberships.length > DROPDOWN_LIMIT

  // Sort: current business first, then active, then by name.
  const sortedMemberships = React.useMemo(() => {
    const list = [...memberships]
    list.sort((a, b) => {
      if (a.business.id === currentBusiness?.id) return -1
      if (b.business.id === currentBusiness?.id) return 1
      const aActive = a.business.status === "active" ? 0 : 1
      const bActive = b.business.status === "active" ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return (a.business.name || "").localeCompare(b.business.name || "")
    })
    return list
  }, [memberships, currentBusiness?.id])

  const visibleMemberships = sortedMemberships.slice(0, DROPDOWN_LIMIT)

  const formatRole = (role: string) => {
    const key = `roles.${role}` as const;
    return t(key);
  }

  const triggerContent = (
    <div className="flex items-center gap-3 w-full min-w-0">
      <BusinessAvatar
        name={currentBusiness?.name || "S"}
        logoUrl={currentBusiness?.logo_url}
      />
      <div className="flex flex-col flex-1 min-w-0 text-left">
        <span className="text-sm font-semibold text-[var(--foreground)] truncate">
          {currentBusiness?.name || "Stampeo"}
        </span>
        <span className="text-[11px] text-[var(--muted-foreground)] truncate">
          {currentBusiness ? formatRole(memberships.find(m => m.business.id === currentBusiness.id)?.role || "owner") : ""}
        </span>
      </div>
      {hasMultipleMemberships && (
        <CaretUpDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      )}
    </div>
  )

  const cardClasses = cn(
    "flex items-center w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2.5 transition-colors",
    hasMultipleMemberships && "cursor-pointer hover:bg-[var(--muted)]"
  );

  // Single membership — static card
  if (!hasMultipleMemberships) {
    return (
      <div className={cardClasses}>
        {triggerContent}
      </div>
    )
  }

  // Multiple memberships — dropdown card
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(cardClasses, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1")}>
          {triggerContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-lg"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {t("businessSwitcher.yourBusinesses")}
        </DropdownMenuLabel>
        {visibleMemberships.map((membership) => {
          const isSelected = membership.business.id === currentBusiness?.id
          return (
            <DropdownMenuItem
              key={membership.id}
              onClick={() => setCurrentBusiness(membership.business)}
              className="gap-2 p-2"
            >
              <BusinessAvatar
                name={membership.business.name}
                logoUrl={membership.business.logo_url}
                size="sm"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate font-medium text-sm">
                  {membership.business.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRole(membership.role)}
                </span>
              </div>
              {isSelected && (
                <Check className="size-4 text-[var(--accent)]" weight="bold" />
              )}
            </DropdownMenuItem>
          )
        })}
        {shouldShowViewAll && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/businesses"
                className="flex items-center justify-between gap-2 p-2 text-sm"
              >
                <span className="text-[var(--accent)] font-medium">
                  {t("businessSwitcher.viewAll", { count: memberships.length })}
                </span>
                <ArrowRight className="size-3.5 text-[var(--accent)]" weight="bold" />
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
