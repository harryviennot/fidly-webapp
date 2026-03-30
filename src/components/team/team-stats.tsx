"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  UserCheck,
  EnvelopeSimple,
  DeviceMobile,
} from "@phosphor-icons/react";
import type { MembershipWithUser, Invitation } from "@/types";
import { StatCard } from "@/components/redesign";
import { useEntitlements } from "@/hooks/useEntitlements";

interface TeamStatsProps {
  members: MembershipWithUser[];
  invitations: Invitation[];
}

export function TeamStats({
  members,
  invitations,
}: TeamStatsProps) {
  const t = useTranslations('team.stats');
  const { getLimit } = useEntitlements();

  // Count members by role
  const roleCounts = members.reduce(
    (acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const scannerCount = roleCounts.scanner || 0;
  const memberLimit = getLimit("team.max_members");

  // Count active scanners (active in last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeScannersCount = members.filter((member) => {
    if (member.role !== "scanner") return false;
    if (!member.last_active_at) return false;
    return new Date(member.last_active_at) >= sevenDaysAgo;
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px]">
      <StatCard
        title={t('teamMembers')}
        value={members.length}
        subtitle={t('activeCount', { count: activeScannersCount })}
        icon={<Users className="w-4 h-4" weight="bold" />}
        iconBg="var(--accent-light)"
        delay={0}
      />

      <StatCard
        title={t('scanners')}
        value={scannerCount}
        suffix={memberLimit ? `/${memberLimit}` : undefined}
        subtitle={
          activeScannersCount > 0
            ? t('activeCount', { count: activeScannersCount })
            : scannerCount > 0
              ? t('noActivity')
              : undefined
        }
        icon={<DeviceMobile className="w-4 h-4" weight="bold" />}
        iconBg="#E4F0F8"
        delay={80}
      />

      <StatCard
        title={t('activeThisWeek')}
        value={activeScannersCount}
        subtitle={
          scannerCount > 0
            ? t('ofScanners', { count: scannerCount })
            : undefined
        }
        icon={<UserCheck className="w-4 h-4" weight="bold" />}
        iconBg="var(--accent-light)"
        delay={160}
      />

      <div className="md:col-span-3 lg:col-span-1 flex">
        <StatCard
          title={t('pendingInvites')}
          value={invitations.length}
          icon={<EnvelopeSimple className="w-4 h-4" weight="bold" />}
          iconBg="#FFF3E0"
          delay={240}
          className="flex-1"
        />
      </div>
    </div>
  );
}

export function TeamStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px]">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-[16px_18px] ${i === 4 ? "md:col-span-3 lg:col-span-1" : ""}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--muted)] animate-pulse" />
            <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse" />
          </div>
          <div className="h-7 w-14 bg-[var(--muted)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
