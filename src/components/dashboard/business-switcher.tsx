"use client"

import * as React from "react"
import { CaretUpDown, ArrowRight, Plus } from "@phosphor-icons/react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function BusinessAvatar({
  name,
  logoUrl,
  accentColor,
  size = "md",
  stretchToWidth,
  onLogoLoad,
}: {
  name: string;
  logoUrl?: string | null;
  accentColor?: string;
  size?: "sm" | "md";
  /** When set, the avatar slot is at least this wide. Logos sit at their
   * natural size inside; initials chips stretch to fill the width. */
  stretchToWidth?: number;
  onLogoLoad?: () => void;
}) {
  const height = size === "sm" ? "h-7" : "h-9";
  const naturalChipWidth = size === "sm" ? 28 : 36;

  if (logoUrl) {
    const img = (
      <Image
        src={logoUrl}
        alt={name}
        width={120}
        height={36}
        className={cn("w-auto object-contain", height)}
        unoptimized
        onLoad={onLogoLoad}
      />
    );
    // When we have a target width, wrap the logo so smaller images leave
    // empty space to their right — keeping text aligned across rows.
    if (stretchToWidth) {
      return (
        <div
          className={cn("shrink-0 flex items-center", height)}
          style={{ minWidth: stretchToWidth }}
        >
          {img}
        </div>
      );
    }
    return img;
  }

  return (
    <div
      className={cn(
        "rounded-lg shrink-0 flex items-center justify-center text-white font-bold",
        !accentColor && "bg-[var(--accent)]",
        height,
        size === "sm" ? "text-xs" : "text-sm",
      )}
      style={{
        width: stretchToWidth ?? naturalChipWidth,
        ...(accentColor ? { backgroundColor: accentColor } : {}),
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export function BusinessSwitcher() {
  const { memberships, currentBusiness, setCurrentBusiness, startNewBusiness } = useBusiness()
  const isSuperadmin = useIsSuperadmin()
  const router = useRouter()
  const t = useTranslations()

  // Superadmins always get the dropdown (even with 0/1 memberships) so they
  // can reach /businesses via "View all". Regular users only get a dropdown
  // when they have more than one membership.
  const hasMultipleMemberships = memberships.length > 1 || isSuperadmin
  const shouldShowViewAll = isSuperadmin || memberships.length > DROPDOWN_LIMIT

  // Memberships arrive already sorted by recent access from BusinessProvider.
  // Hide the currently selected business — it's already in the trigger row.
  const otherMemberships = React.useMemo(
    () => memberships.filter((m) => m.business.id !== currentBusiness?.id),
    [memberships, currentBusiness?.id],
  )

  const visibleMemberships = otherMemberships.slice(0, DROPDOWN_LIMIT)

  // Align text across rows: measure each row's avatar, take the widest, and
  // stretch all rows to that width. Logos load asynchronously, so we also
  // remeasure when an image finishes loading.
  const slotRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const [maxSlotWidth, setMaxSlotWidth] = React.useState<number | null>(null)

  const remeasure = React.useCallback(() => {
    let max = 0
    slotRefs.current.forEach((el) => {
      max = Math.max(max, el.getBoundingClientRect().width)
    })
    if (max > 0) {
      setMaxSlotWidth((prev) => (prev === max ? prev : max))
    }
  }, [])

  const measuredKey = visibleMemberships.map((m) => m.business.id).join("|")
  React.useLayoutEffect(() => {
    remeasure()
  }, [measuredKey, remeasure])

  const formatRole = (role: string) => {
    const key = `roles.${role}` as const;
    return t(key);
  }

  const triggerContent = (
    <div className="flex items-center gap-3 w-full min-w-0">
      <BusinessAvatar
        name={currentBusiness?.name || "S"}
        logoUrl={currentBusiness?.logo_url}
        accentColor={currentBusiness?.settings?.accentColor}
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
        {visibleMemberships.length > 0 && (
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {t("businessSwitcher.switchTo")}
          </DropdownMenuLabel>
        )}
        {visibleMemberships.map((membership) => (
          <DropdownMenuItem
            key={membership.id}
            onClick={() => setCurrentBusiness(membership.business)}
            className="gap-2 p-2"
          >
            <div
              ref={(el) => {
                if (el) slotRefs.current.set(membership.business.id, el)
                else slotRefs.current.delete(membership.business.id)
              }}
              className="shrink-0 flex items-center"
            >
              <BusinessAvatar
                name={membership.business.name}
                logoUrl={membership.business.logo_url}
                accentColor={membership.business.settings?.accentColor}
                size="sm"
                stretchToWidth={maxSlotWidth ?? undefined}
                onLogoLoad={remeasure}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate font-medium text-sm">
                {membership.business.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRole(membership.role)}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        {visibleMemberships.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            startNewBusiness()
            router.push("/onboarding/business/welcome")
          }}
          className="flex items-center gap-2 p-2 text-sm cursor-pointer"
        >
          <Plus className="size-4 text-[var(--accent)]" weight="bold" />
          <span className="text-[var(--accent)] font-medium">
            {t("businessSwitcher.createNew")}
          </span>
        </DropdownMenuItem>
        {shouldShowViewAll && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              router.push("/businesses")
            }}
            className="flex items-center justify-between gap-2 p-2 text-sm cursor-pointer"
          >
            <span className="text-[var(--accent)] font-medium">
              {t("businessSwitcher.viewAll", { count: memberships.length })}
            </span>
            <ArrowRight className="size-3.5 text-[var(--accent)]" weight="bold" />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
