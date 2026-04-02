"use client";

import { useTranslations } from "next-intl";
import { TrashIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TeamRow } from "./team-table";

interface TeamMemberCardProps {
  row: TeamRow;
  loading: boolean;
  onRemove: () => void;
  onResend?: () => void;
}

const ROLE_CONFIG: Record<string, { bg: string; color: string }> = {
  owner: { bg: "bg-green-50 dark:bg-green-950/30", color: "text-green-700 dark:text-green-400" },
  admin: { bg: "bg-orange-50 dark:bg-orange-950/30", color: "text-orange-700 dark:text-orange-400" },
  scanner: { bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-700 dark:text-blue-400" },
};

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  invited: "bg-amber-500",
  offline: "bg-gray-400",
  paused: "bg-[#C4883D]",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamMemberCard({
  row,
  loading,
  onRemove,
  onResend,
}: TeamMemberCardProps) {
  const t = useTranslations('team.memberCard');
  const tRoles = useTranslations('roles');
  const rc = ROLE_CONFIG[row.role] || ROLE_CONFIG.scanner;

  return (
    <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-200 hover:shadow-sm">
      {/* Top row: avatar, name, role, delete */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="relative flex-shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.avatarUrl} className="object-cover" />
            <AvatarFallback className="bg-[var(--muted)] text-xs font-semibold">
              {row.initials || getInitials(row.name || row.email)}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--card)] ${STATUS_COLORS[row.status]}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--foreground)] truncate">
              {row.name || t('unnamed')}
            </span>
            {row.isCurrentUser && (
              <span className="text-[9px] py-0.5 px-1.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] font-semibold flex-shrink-0">
                YOU
              </span>
            )}
            <span className={`text-[10px] py-0.5 px-2 rounded-xl font-semibold flex-shrink-0 ${rc.bg} ${rc.color}`}>
              {tRoles(row.role)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">{row.email}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {row.type === "invitation" && onResend && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={onResend}
              disabled={loading}
            >
              Resend
            </Button>
          )}
          {row.canModify && (
            <button
              onClick={onRemove}
              disabled={loading}
              className="p-1.5 rounded-md text-[var(--muted-foreground)] opacity-40 hover:opacity-100 hover:text-red-500 transition-all duration-150 disabled:opacity-20"
            >
              <TrashIcon size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: stamps + status */}
      <div className="flex justify-between items-center text-[11px] text-[var(--muted-foreground)]">
        <span>{t('stampsGiven', { count: row.stampsGiven })}</span>
        <span className={`font-medium ${
          row.status === "online" ? "text-green-600 dark:text-green-400" :
          row.status === "invited" ? "text-amber-600 dark:text-amber-400" :
          "text-[var(--muted-foreground)]"
        }`}>
          {row.statusLabel}
        </span>
      </div>
    </div>
  );
}

export function TeamMemberCardSkeleton() {
  return (
    <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full bg-[var(--muted)] animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-32 bg-[var(--muted)] rounded animate-pulse mb-1.5" />
          <div className="h-3 w-40 bg-[var(--muted)] rounded animate-pulse" />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-16 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-3 w-12 bg-[var(--muted)] rounded animate-pulse" />
      </div>
    </div>
  );
}
