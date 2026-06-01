"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MapPinIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useLocationMembers } from "@/hooks/use-locations";
import { LocationStatsRow } from "./location-stats-row";
import { getInitials } from "./_initials";
import type { Location, LocationStatsBatchRow } from "@/types/location";

interface LocationCardProps {
  businessId: string;
  location: Location;
  /** 7d stats from the batch endpoint, when available. Drives the footer
   *  stats row and the activity chip. */
  stats?: LocationStatsBatchRow;
  /** When true, the stats row renders a skeleton. */
  statsLoading?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onViewQr: () => void;
  onDelete: () => void;
  /** Used to disable Edit/Delete on non-primary cards for non-Pro users. */
  canManageNonPrimary: boolean;
  /** Used to disable QR on non-Pro users (QR endpoint is Pro-gated). */
  canViewQr: boolean;
}

const MAX_AVATARS = 4;

export function LocationCard({
  businessId,
  location,
  stats,
  statsLoading,
  onOpen,
  onEdit,
  onViewQr,
  onDelete,
  canManageNonPrimary,
  canViewQr,
}: LocationCardProps) {
  const t = useTranslations("loyaltyProgram.locations.card");
  const isMobile = useIsMobile();
  const [actionsOpen, setActionsOpen] = useState(false);
  const { data: members } = useLocationMembers(businessId, location.id);
  const memberCount = members?.length ?? 0;
  const isPrimary = location.is_primary;
  const canEdit = isPrimary || canManageNonPrimary;
  const canDelete = !isPrimary && canManageNonPrimary;

  const visibleAvatars = (members ?? []).slice(0, MAX_AVATARS);
  const overflow = Math.max(0, memberCount - MAX_AVATARS);

  // The menu surface (items list) is shared between the desktop dropdown and
  // the mobile bottom sheet, so we declare it once.
  const menuItems = (handleClick: (action: () => void) => void) => (
    <>
      <ActionItem
        icon={<PencilSimpleIcon className="h-4 w-4" weight="bold" />}
        label={t("edit")}
        disabled={!canEdit}
        onClick={() => handleClick(onEdit)}
        mobile={isMobile}
      />
      <ActionItem
        icon={<QrCodeIcon className="h-4 w-4" weight="bold" />}
        label={t("viewQr")}
        disabled={!canViewQr}
        onClick={() => handleClick(onViewQr)}
        mobile={isMobile}
      />
      <ActionItem
        icon={<TrashIcon className="h-4 w-4" weight="bold" />}
        label={t("delete")}
        disabled={!canDelete}
        onClick={() => handleClick(onDelete)}
        mobile={isMobile}
        destructive
      />
    </>
  );

  return (
    <>
      <Card
        flat
        hover={false}
        onClick={onOpen}
        className="p-0 cursor-pointer overflow-hidden hover:border-[var(--border-dark)] transition-colors flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              isPrimary
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                : "bg-[var(--muted)]"
            )}
          >
            <MapPinIcon
              className={cn(
                "h-5 w-5",
                isPrimary
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted-foreground)]"
              )}
              weight="fill"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <h3 className="text-[14px] font-semibold text-[#1A1A1A] truncate">
                {location.name}
              </h3>
              {isPrimary && (
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 shrink-0"
                >
                  {t("primary")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
              <MapPinIcon className="h-3 w-3 shrink-0" weight="bold" />
              <span
                className={cn(
                  "truncate",
                  !location.address?.trim() && "italic"
                )}
              >
                {location.address?.trim() || t("noAddress")}
              </span>
            </div>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 -mr-1 -mt-1"
          >
            {isMobile ? (
              <button
                type="button"
                onClick={() => setActionsOpen(true)}
                className="p-2 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                aria-label={t("actions")}
              >
                <DotsThreeIcon className="h-5 w-5" weight="bold" />
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="p-2 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  aria-label={t("actions")}
                >
                  <DotsThreeIcon className="h-5 w-5" weight="bold" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuItems((fn) => fn())}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Scanners row — min-h matches the avatar-row height so empty
            state doesn't shrink the card relative to populated siblings. */}
        <div className="flex items-center gap-2 px-4 pb-3 min-h-[36px]">
          {memberCount > 0 ? (
            <>
              <div className="flex -space-x-1.5">
                {visibleAvatars.map((m) => (
                  <Avatar
                    key={m.membership_id}
                    className="h-6 w-6 ring-2 ring-[var(--card)]"
                  >
                    <AvatarImage src={m.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(m.name, m.email)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {overflow > 0 && (
                  <span className="h-6 min-w-[24px] px-1 rounded-full bg-[var(--muted)] ring-2 ring-[var(--card)] flex items-center justify-center text-[10px] font-semibold text-[var(--muted-foreground)]">
                    +{overflow}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {t("membersCount", { count: memberCount })}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--warning)]">
              <UsersIcon className="h-3.5 w-3.5" weight="bold" />
              {t("membersCount", { count: 0 })}
            </div>
          )}
        </div>

        {/* Stats footer — mt-auto pins it to the bottom when the grid
            stretches the card to match siblings of different heights. */}
        <div className="border-t border-[var(--border)] bg-[var(--muted)]/30 px-2 py-2 mt-auto">
          <LocationStatsRow stats={stats} loading={statsLoading} />
        </div>
      </Card>

      {/* Mobile action sheet */}
      {isMobile && (
        <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
          <SheetContent
            side="bottom"
            className="flex flex-col gap-0 p-0 rounded-t-2xl border-t-0"
          >
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-[var(--border-dark)] opacity-60" />
            </div>
            <SheetTitle className="px-5 pt-2 pb-1 text-[16px] font-bold text-[#1A1A1A] text-left">
              {location.name}
            </SheetTitle>
            <SheetDescription className="px-5 pb-3 text-[12px] text-[var(--muted-foreground)] text-left">
              {t("actionsHint")}
            </SheetDescription>
            <div className="border-t border-[var(--border)] py-2">
              {menuItems((fn) => {
                setActionsOpen(false);
                // Defer to next tick so the sheet close animation doesn't
                // race the action's UI (which may open another sheet/dialog).
                setTimeout(fn, 50);
              })}
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function ActionItem({
  icon,
  label,
  onClick,
  disabled,
  mobile,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  mobile?: boolean;
  destructive?: boolean;
}) {
  if (mobile) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors",
          "active:bg-[var(--muted)]",
          disabled && "opacity-40 pointer-events-none",
          destructive
            ? "text-red-600"
            : "text-[var(--foreground)] hover:bg-[var(--muted)]"
        )}
      >
        {icon}
        <span className="text-[14px] font-medium">{label}</span>
      </button>
    );
  }
  return (
    <DropdownMenuItem
      onClick={onClick}
      disabled={disabled}
      className={destructive ? "text-red-600 focus:text-red-600" : undefined}
    >
      {icon}
      {label}
    </DropdownMenuItem>
  );
}
