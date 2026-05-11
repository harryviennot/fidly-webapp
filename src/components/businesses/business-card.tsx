"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { UserSwitchIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BusinessListItem } from "@/api/businesses";

interface BusinessCardProps {
  business: BusinessListItem;
  /** Primary action — opens the business dashboard. Omit when the viewer
   * isn't a member (e.g. superadmin browsing an unrelated business). */
  onOpen?: () => void;
  /** Secondary action — superadmin "View as…" shortcut. */
  onImpersonate?: () => void;
  impersonateDisabled?: boolean;
  impersonateDisabledReason?: string;
  /** When true, surface the status badge even for "active" rows.
   * Superadmins need it; regular owners do not. */
  showActiveBadge?: boolean;
}

type BadgeVariant = "success" | "warning" | "error" | "info" | "outline";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  pending: "warning",
  suspended: "error",
};

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  owner: "success",
  admin: "warning",
  scanner: "info",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BusinessCard({
  business,
  onOpen,
  onImpersonate,
  impersonateDisabled,
  impersonateDisabledReason,
  showActiveBadge,
}: BusinessCardProps) {
  const t = useTranslations("businessesPage");
  const tRoles = useTranslations("roles");

  const statusVariant = STATUS_VARIANT[business.status] ?? "warning";
  const roleVariant = business.role ? ROLE_VARIANT[business.role] : null;

  // Drop noise: "active" is the default, "owner" is implicit for an owner
  // looking at their own businesses. Surface only meaningful signals.
  const showStatus = business.status !== "active" || !!showActiveBadge;
  const showRole = !!roleVariant && business.role !== "owner";

  const accentColor = business.settings?.accentColor;
  const avatarStyle = accentColor
    ? { backgroundColor: accentColor }
    : undefined;

  // Primary action wraps the whole card: prefer "open" for members,
  // fall back to "impersonate" for superadmins on non-member businesses.
  const primaryAction = onOpen ?? onImpersonate;
  // Show the floating secondary icon only when both actions are available.
  const showSecondary = !!onOpen && !!onImpersonate;

  const cardContent = (
    <>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-12 w-12 shrink-0 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold",
            !accentColor && "bg-[var(--accent)]",
          )}
          style={avatarStyle}
        >
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={business.name}
              width={96}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-sm">{getInitials(business.name)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--foreground)] truncate leading-tight">
            {business.name}
          </h3>
          <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
            /{business.url_slug}
          </p>
          {business.owner_name && (
            <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
              {t("ownedBy", { name: business.owner_name })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
        {showStatus && (
          <Badge variant={statusVariant}>{t(`status.${business.status}`)}</Badge>
        )}
        {showRole && (
          <Badge variant={roleVariant!}>{tRoles(business.role!)}</Badge>
        )}
        <Badge variant="outline" className="capitalize">
          {business.subscription_tier}
        </Badge>
      </div>
    </>
  );

  const baseClasses =
    "relative h-full flex flex-col gap-3 p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--card-shadow)] transition-all duration-200";
  const interactiveClasses =
    "text-left w-full cursor-pointer hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

  if (!primaryAction) {
    return <div className={baseClasses}>{cardContent}</div>;
  }

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={primaryAction}
        className={cn(baseClasses, interactiveClasses)}
      >
        {cardContent}
      </button>
      {showSecondary && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-2.5 right-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          onClick={(e) => {
            e.stopPropagation();
            onImpersonate?.();
          }}
          disabled={impersonateDisabled}
          title={impersonateDisabled ? impersonateDisabledReason ?? t("viewAsComingSoon") : t("viewAs")}
          aria-label={t("viewAs")}
        >
          <UserSwitchIcon size={14} />
        </Button>
      )}
    </div>
  );
}
