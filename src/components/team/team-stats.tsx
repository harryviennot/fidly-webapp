"use client";

import { useTranslations } from "next-intl";
import {
  UsersIcon,
  UserCheckIcon,
  EnvelopeSimpleIcon,
  DeviceMobileIcon,
} from "@phosphor-icons/react";
import type { MembershipWithUser, Invitation } from "@/types";
import { StatCardSmall } from "@/components/reusables/stats/StatCardSmall";

interface TeamStatsProps {
  members: MembershipWithUser[];
  invitations: Invitation[];
  subscriptionTier?: "pay" | "pro";
}

export function TeamStats({
  members,
  invitations,
  subscriptionTier = "pro",
}: TeamStatsProps) {
  const t = useTranslations('team.stats');

  // Count members by role
  const roleCounts = members.reduce(
    (acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const scannerCount = roleCounts.scanner || 0;

  // Pay tier has scanner limit
  const scannerLimit = subscriptionTier === "pay" ? 3 : null;
  const isNearLimit = scannerLimit ? scannerCount >= scannerLimit - 1 : false;

  // Count active scanners (active in last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeScannersCount = members.filter((member) => {
    if (member.role !== "scanner") return false;
    if (!member.last_active_at) return false;
    return new Date(member.last_active_at) >= sevenDaysAgo;
  }).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCardSmall
        icon={<UsersIcon size={20} weight="duotone" />}
        label={t('teamMembers')}
        value={members.length}
      />

      <StatCardSmall
        icon={<DeviceMobileIcon size={20} weight="duotone" />}
        label={t('scanners')}
        value={
          scannerLimit ? `${scannerCount}/${scannerLimit}` : scannerCount
        }
        subtext={
          activeScannersCount > 0
            ? t('activeCount', { count: activeScannersCount })
            : scannerCount > 0
              ? t('noActivity')
              : undefined
        }
        highlight={isNearLimit}
      />

      <StatCardSmall
        icon={<UserCheckIcon size={20} weight="duotone" />}
        label={t('activeThisWeek')}
        value={activeScannersCount}
        subtext={
          scannerCount > 0
            ? t('ofScanners', { count: scannerCount })
            : undefined
        }
      />

      <StatCardSmall
        icon={<EnvelopeSimpleIcon size={20} weight="duotone" />}
        label={t('pendingInvites')}
        value={invitations.length}
        highlight={invitations.length > 0}
      />
    </div>
  );
}

export function TeamStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--cream)]"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--muted)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-12 bg-[var(--muted)] rounded animate-pulse" />
            <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
