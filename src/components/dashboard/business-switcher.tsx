"use client"

import * as React from "react"
import { CaretUpDown, Check } from "@phosphor-icons/react"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBusiness } from "@/contexts/business-context"
import Image from "next/image"
import { cn } from "@/lib/utils"

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
  const t = useTranslations()

  const hasMultipleMemberships = memberships.length > 1

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
        {memberships.map((membership) => {
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
