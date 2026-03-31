"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  Trophy,
  EnvelopeSimple,
  PauseCircle,
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

  const memberLimit = getLimit("team.max_members");
  const pausedCount = members.filter((m) => m.is_paused).length;

  // Count active members (active in last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeCount = members.filter((member) => {
    if (!member.last_active_at) return false;
    return new Date(member.last_active_at) >= sevenDaysAgo;
  }).length;

  // Most active member (highest scans_count)
  const mostActive = members.reduce<MembershipWithUser | null>((best, m) => {
    if ((m.scans_count ?? 0) > (best?.scans_count ?? 0)) return m;
    return best;
  }, null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[14px]">
      <StatCard
        title={t('teamMembers')}
        value={members.length}
        suffix={memberLimit ? `/${memberLimit}` : undefined}
        subtitle={t('activeCount', { count: activeCount })}
        icon={<Users className="w-4 h-4" weight="bold" />}
        iconBg="var(--accent-light)"
        delay={0}
      />

      <StatCard
        title={t('mostActive')}
        value={mostActive?.scans_count ?? 0}
        subtitle={mostActive?.user?.name || mostActive?.user?.email || undefined}
        icon={<Trophy className="w-4 h-4" weight="bold" />}
        iconBg="var(--accent-light)"
        delay={80}
      />

      <StatCard
        title={t('pausedMembers')}
        value={pausedCount}
        subtitle={pausedCount > 0 ? t('pausedSubtitle') : undefined}
        icon={<PauseCircle className="w-4 h-4" weight="bold" />}
        iconBg="var(--warning-light)"
        delay={160}
      />

      <div className="md:col-span-3 lg:col-span-1 flex">
        <StatCard
          title={t('pendingInvites')}
          value={invitations.length}
          icon={<EnvelopeSimple className="w-4 h-4" weight="bold" />}
          iconBg="var(--warning-light)"
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
