"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowSquareOutIcon, UserSwitchIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
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
    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
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
            const statusVariant = STATUS_VARIANT[b.status] ?? "warning";
            const roleVariant = b.role ? ROLE_VARIANT[b.role] : null;
            const canOpen = !isMember || isMember(b);
            const rowAction = canOpen
              ? () => onOpen(b.id)
              : onImpersonate
                ? () => onImpersonate(b)
                : undefined;

            return (
              <TableRow
                key={b.id}
                onClick={rowAction}
                className={cn(rowAction && "cursor-pointer")}
              >
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
                  <Badge variant={statusVariant}>{t(`status.${b.status}`)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {b.subscription_tier}
                  </Badge>
                </TableCell>
                <TableCell>
                  {roleVariant ? (
                    <Badge variant={roleVariant}>{tRoles(b.role!)}</Badge>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    {canOpen && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(b.id);
                        }}
                        title={t("openDashboard")}
                        aria-label={t("openDashboard")}
                      >
                        <ArrowSquareOutIcon size={14} />
                      </Button>
                    )}
                    {onImpersonate && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImpersonate(b);
                        }}
                        disabled={impersonateDisabled}
                        title={impersonateDisabled ? t("viewAsComingSoon") : t("viewAs")}
                        aria-label={t("viewAs")}
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
