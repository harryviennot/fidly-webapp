"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowSquareOutIcon, UserSwitchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BusinessListItem } from "@/api/businesses";

interface BusinessCardProps {
  business: BusinessListItem;
  onOpen: () => void;
  onImpersonate?: () => void;       // shown only for superadmins; disabled until Phase 5
  impersonateDisabled?: boolean;
  impersonateDisabledReason?: string;
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  owner:   { bg: "bg-green-50 dark:bg-green-950/30",   color: "text-green-700 dark:text-green-400" },
  admin:   { bg: "bg-orange-50 dark:bg-orange-950/30", color: "text-orange-700 dark:text-orange-400" },
  scanner: { bg: "bg-blue-50 dark:bg-blue-950/30",     color: "text-blue-700 dark:text-blue-400" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:    { bg: "bg-green-50 dark:bg-green-950/30",  color: "text-green-700 dark:text-green-400" },
  pending:   { bg: "bg-amber-50 dark:bg-amber-950/30",  color: "text-amber-700 dark:text-amber-400" },
  suspended: { bg: "bg-red-50 dark:bg-red-950/30",      color: "text-red-700 dark:text-red-400" },
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
}: BusinessCardProps) {
  const t = useTranslations("businessesPage");
  const tRoles = useTranslations("roles");

  const roleBadge = business.role ? ROLE_BADGE[business.role] : null;
  const statusBadge = STATUS_BADGE[business.status] || STATUS_BADGE.pending;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-200 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-[var(--muted)]">
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={business.name}
              width={88}
              height={44}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-sm font-bold text-[var(--muted-foreground)]">
              {getInitials(business.name)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
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

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn("text-[10px] py-0.5 px-2 rounded-xl font-semibold", statusBadge.bg, statusBadge.color)}>
          {t(`status.${business.status}`)}
        </span>
        {roleBadge && (
          <span className={cn("text-[10px] py-0.5 px-2 rounded-xl font-semibold", roleBadge.bg, roleBadge.color)}>
            {tRoles(business.role!)}
          </span>
        )}
        <span className="text-[10px] py-0.5 px-2 rounded-xl font-semibold bg-[var(--muted)] text-[var(--muted-foreground)]">
          {business.subscription_tier}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-8"
          onClick={onOpen}
        >
          <ArrowSquareOutIcon size={14} className="mr-1" />
          {t("openDashboard")}
        </Button>
        {onImpersonate && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8"
            onClick={onImpersonate}
            disabled={impersonateDisabled}
            title={impersonateDisabledReason}
          >
            <UserSwitchIcon size={14} className="mr-1" />
            {t("viewAs")}
          </Button>
        )}
      </div>
    </div>
  );
}
