"use client";

import { useTranslations } from "next-intl";
import {
  MapPinIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Location } from "@/types/location";
import { useLocationMembers } from "@/hooks/use-locations";

interface LocationCardProps {
  businessId: string;
  location: Location;
  onOpen: () => void;
  onEdit: () => void;
  onViewQr: () => void;
  onDelete: () => void;
  /** Used to disable Edit/Delete on non-primary cards for non-Pro users. */
  canManageNonPrimary: boolean;
  /** Used to disable QR on non-Pro users (QR endpoint is Pro-gated). */
  canViewQr: boolean;
}

export function LocationCard({
  businessId,
  location,
  onOpen,
  onEdit,
  onViewQr,
  onDelete,
  canManageNonPrimary,
  canViewQr,
}: LocationCardProps) {
  const t = useTranslations("loyaltyProgram.locations.card");
  const { data: members } = useLocationMembers(businessId, location.id);
  const memberCount = members?.length ?? 0;
  const isPrimary = location.is_primary;
  const canEdit = isPrimary || canManageNonPrimary;
  const canDelete = !isPrimary && canManageNonPrimary;

  return (
    <Card
      hover
      onClick={onOpen}
      className="p-4 cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
          <MapPinIcon className="h-4 w-4 text-[var(--muted-foreground)]" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] truncate">
              {location.name}
            </h3>
            {isPrimary && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {t("primary")}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] truncate">
            {location.address?.trim() || t("noAddress")}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              <DotsThreeIcon className="h-4 w-4" weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} disabled={!canEdit}>
                <PencilSimpleIcon className="h-4 w-4" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewQr} disabled={!canViewQr}>
                <QrCodeIcon className="h-4 w-4" />
                {t("viewQr")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                disabled={!canDelete}
                className="text-red-600 focus:text-red-600"
              >
                <TrashIcon className="h-4 w-4" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] border-t border-[var(--border)] pt-2.5">
        <span>{t("membersCount", { count: memberCount })}</span>
        <span className="font-mono text-[10px]">{location.slug}</span>
      </div>
    </Card>
  );
}
