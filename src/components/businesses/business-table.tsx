"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowSquareOutIcon, UserSwitchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BusinessListItem } from "@/api/businesses";

interface BusinessTableProps {
  businesses: BusinessListItem[];
  showOwnerColumn: boolean;
  /** Predicate — return true to render the "Open" action for this row.
   * Defaults to "always" if omitted. */
  isMember?: (business: BusinessListItem) => boolean;
  onOpen: (id: string) => void;
  onImpersonate?: (business: BusinessListItem) => void;
  impersonateDisabled?: boolean;
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
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function BusinessTable({
  businesses,
  showOwnerColumn,
  isMember,
  onOpen,
  onImpersonate,
  impersonateDisabled,
}: BusinessTableProps) {
  const t = useTranslations("businessesPage");
  const tRoles = useTranslations("roles");

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.business")}</TableHead>
            {showOwnerColumn && <TableHead>{t("table.owner")}</TableHead>}
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.plan")}</TableHead>
            <TableHead>{t("table.role")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((b) => {
            const roleBadge = b.role ? ROLE_BADGE[b.role] : null;
            const statusBadge = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
            return (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-md overflow-hidden flex items-center justify-center bg-[var(--muted)]">
                      {b.logo_url ? (
                        <Image
                          src={b.logo_url}
                          alt={b.name}
                          width={64}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                          {getInitials(b.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">/{b.url_slug}</p>
                    </div>
                  </div>
                </TableCell>
                {showOwnerColumn && (
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-xs truncate">{b.owner_name ?? "—"}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">{b.owner_email ?? ""}</p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <span className={cn("text-[10px] py-0.5 px-2 rounded-xl font-semibold", statusBadge.bg, statusBadge.color)}>
                    {t(`status.${b.status}`)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-[var(--muted-foreground)]">{b.subscription_tier}</span>
                </TableCell>
                <TableCell>
                  {roleBadge ? (
                    <span className={cn("text-[10px] py-0.5 px-2 rounded-xl font-semibold", roleBadge.bg, roleBadge.color)}>
                      {tRoles(b.role!)}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    {(!isMember || isMember(b)) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onOpen(b.id)}
                        title={t("openDashboard")}
                      >
                        <ArrowSquareOutIcon size={14} />
                      </Button>
                    )}
                    {onImpersonate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onImpersonate(b)}
                        disabled={impersonateDisabled}
                        title={impersonateDisabled ? t("viewAsComingSoon") : t("viewAs")}
                      >
                        <UserSwitchIcon size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
