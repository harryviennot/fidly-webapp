'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MegaphoneIcon,
  PlusIcon,
  LightningIcon,
  CrownIcon,
  WarningIcon,
  ArrowSquareOutIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
} from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import { InfoBox } from '@/components/reusables/info-box';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useBroadcasts } from '@/hooks/use-notifications';
import { computeThisMonthQuota, isEditable } from '@/lib/broadcast-filters';
import {
  BroadcastListRow,
  BroadcastListSkeleton,
  BroadcastDetailSheet,
  LastBroadcastResultsWidget,
  UpgradeCTA,
} from '@/components/notifications';
import type { Broadcast, BroadcastStatus } from '@/types/notification';

type FilterKey = 'all' | 'scheduled' | 'sent' | 'drafts';

const FILTER_ORDER: FilterKey[] = ['all', 'scheduled', 'sent', 'drafts'];

function matchesFilter(status: BroadcastStatus, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'scheduled') return status === 'scheduled';
  if (filter === 'sent') return status === 'sent' || status === 'sending';
  if (filter === 'drafts') return status === 'draft';
  return true;
}

export default function ProgramBroadcastsPage() {
  const t = useTranslations('notifications.broadcasts');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBusiness } = useBusiness();
  const { tier, hasFeature, getLimit } = useEntitlements();

  const canBroadcast = hasFeature('notifications.broadcast');
  const monthlyLimit = getLimit('notifications.broadcast_limit');
  const isStarter = !canBroadcast;

  const businessTimezone =
    (currentBusiness as unknown as { timezone?: string })?.timezone ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC');

  const activeFilter = (searchParams.get('filter') as FilterKey) || 'all';

  const { data, isLoading, error } = useBroadcasts(
    canBroadcast ? currentBusiness?.id : undefined,
    { limit: 100 }
  );

  const allBroadcasts = useMemo(() => data?.items ?? [], [data]);
  const visibleBroadcasts = useMemo(
    () => allBroadcasts.filter((b) => matchesFilter(b.status, activeFilter)),
    [allBroadcasts, activeFilter]
  );

  const quotaUsed = useMemo(
    () => computeThisMonthQuota(allBroadcasts),
    [allBroadcasts]
  );
  const hasMonthlyLimit = typeof monthlyLimit === 'number' && monthlyLimit > 0;
  const isQuotaReached = hasMonthlyLimit && quotaUsed >= monthlyLimit;

  const [detailBroadcast, setDetailBroadcast] = useState<Broadcast | null>(null);

  const handleRowClick = (broadcast: Broadcast) => {
    if (isEditable(broadcast.status)) {
      router.push(`/program/broadcasts/new?edit=${broadcast.id}`);
    } else {
      setDetailBroadcast(broadcast);
    }
  };

  const handleFilterChange = (next: FilterKey) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    router.replace(`/program/broadcasts${params.toString() ? `?${params}` : ''}`);
  };

  // ─── Starter — locked landing ──────────────────────────────────────
  if (isStarter) {
    return (
      <div
        className="flex flex-col gap-[14px] animate-slide-up"
        style={{ animationDelay: '150ms' }}
      >
        <PageHeader title={t('page.title')} subtitle={t('page.subtitle')} />
        <UpgradeCTA
          icon={<MegaphoneIcon className="w-7 h-7" weight="fill" />}
          title={t('starter.headline')}
          description={t('starter.description')}
          features={[
            t('starter.features.segment'),
            t('starter.features.schedule'),
            t('starter.features.localized'),
          ]}
          ctaLabel={t('starter.cta')}
          upgradeFrom="broadcasts"
        />
      </div>
    );
  }

  // ─── Growth / Pro — list view ──────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-[14px] animate-slide-up"
      style={{ animationDelay: '150ms' }}
    >
      <PageHeader
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        action={
          <Button
            variant="gradient"
            asChild
            disabled={isQuotaReached}
            className="rounded-full"
          >
            <Link href="/program/broadcasts/new">
              <PlusIcon className="h-4 w-4" weight="bold" />
              {t('new')}
            </Link>
          </Button>
        }
      />

      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* ─── Left column ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Quota counter (Growth only) */}
          {hasMonthlyLimit && (
            <div
              className="bg-[var(--card)] rounded-xl border border-[var(--border)] px-5 py-4 animate-slide-up"
              style={{ animationDelay: '60ms' }}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-[13px] font-semibold text-[#1A1A1A]">
                  {t('quota.used', { count: quotaUsed, max: monthlyLimit })}
                </div>
                {isQuotaReached && (
                  <span className="text-[11px] text-[var(--warning)] font-medium">
                    {t('quota.reached')}
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-[var(--paper-hover)] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isQuotaReached
                      ? 'bg-[var(--warning)]'
                      : 'bg-[var(--accent)]'
                  )}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((quotaUsed / monthlyLimit) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Filter chips + list */}
          <div
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {FILTER_ORDER.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => handleFilterChange(filter)}
                    className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--paper)] text-[#555] hover:bg-[var(--paper-hover)]'
                    )}
                  >
                    {t(`filters.${filter}`)}
                  </button>
                );
              })}
            </div>

            {isLoading && <BroadcastListSkeleton />}

            {error && (
              <InfoBox
                variant="error"
                message={
                  error instanceof Error
                    ? error.message
                    : 'Failed to load broadcasts'
                }
              />
            )}

            {!isLoading && !error && visibleBroadcasts.length === 0 && allBroadcasts.length === 0 && (
              <div className="rounded-[10px] border border-dashed border-[var(--border-light)] px-5 py-10 text-center">
                <MegaphoneIcon className="mx-auto h-8 w-8 text-[#A0A0A0] mb-3" />
                <div className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                  {t('empty.title')}
                </div>
                <p className="text-[12px] text-[#8A8A8A] mb-4 max-w-xs mx-auto leading-[1.45]">
                  {t('empty.description')}
                </p>
                <Button variant="gradient" asChild className="rounded-full">
                  <Link href="/program/broadcasts/new">
                    <PlusIcon className="h-4 w-4" weight="bold" />
                    {t('empty.cta')}
                  </Link>
                </Button>
              </div>
            )}

            {!isLoading &&
              !error &&
              visibleBroadcasts.length === 0 &&
              allBroadcasts.length > 0 && (
                <FilterEmptyState filter={activeFilter} />
              )}

            {!isLoading && !error && visibleBroadcasts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {visibleBroadcasts.map((broadcast, i) => (
                  <div
                    key={broadcast.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <BroadcastListRow
                      broadcast={broadcast}
                      onClick={handleRowClick}
                      businessTimezone={businessTimezone}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column — side widgets ─────────────────── */}
        <div
          className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col animate-slide-up"
          style={{ animationDelay: '350ms' }}
        >
          <div className="min-[1080px]:sticky min-[1080px]:top-5 flex flex-col gap-[14px]">
            {/* How it works */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-light)] flex items-center justify-center">
                  <LightningIcon
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    weight="fill"
                  />
                </div>
                <div className="text-[13px] font-semibold text-[#1A1A1A]">
                  {t('starter.headline')}
                </div>
              </div>

              <ol className="space-y-2">
                {(
                  [
                    { key: 'compose', text: t('howItWorks.steps.compose') },
                    { key: 'audience', text: t('howItWorks.steps.audience') },
                    { key: 'send', text: t('howItWorks.steps.send') },
                  ] as const
                ).map((step, i) => (
                  <li key={step.key} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--paper)] border border-[var(--border-light)] flex items-center justify-center text-[10px] font-bold text-[#8A8A8A] mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[12px] text-[#555] leading-[1.45]">
                      {step.text}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-3.5 pt-3 border-t border-[var(--border-light)]">
                <p className="text-[11px] text-[#8A8A8A] leading-[1.45]">
                  {t('howItWorks.delivery')}
                </p>
              </div>

              <div className="mt-3 rounded-[10px] border border-amber-200/80 bg-amber-50/70 p-3">
                <div className="flex items-start gap-2">
                  <WarningIcon
                    className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0"
                    weight="fill"
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-amber-900 mb-0.5">
                      {t('howItWorks.appleNote.title')}
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-[1.45]">
                      {t('howItWorks.appleNote.body')}
                    </p>
                    <a
                      href="https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-800 hover:text-amber-900 underline-offset-2 hover:underline"
                    >
                      {t('howItWorks.appleNote.link')}
                      <ArrowSquareOutIcon className="h-3 w-3" weight="bold" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Last broadcast results — hidden until the first sent broadcast exists */}
            <LastBroadcastResultsWidget
              broadcasts={allBroadcasts}
              onOpen={setDetailBroadcast}
            />

            {/* Pro upsell (Growth only) */}
            {tier === 'growth' && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 p-[18px]">
                <div className="flex items-center gap-2 mb-2">
                  <CrownIcon
                    className="h-4 w-4 text-amber-600"
                    weight="fill"
                  />
                  <div className="text-[13px] font-semibold text-amber-900">
                    {t('starter.features.schedule')}
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 leading-[1.45] mb-3">
                  {t('starter.description')}
                </p>
                <Button asChild size="sm" className="w-full rounded-full">
                  <Link href="/billing?from=broadcasts">
                    {t('starter.cta').replace('Growth', 'Pro')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BroadcastDetailSheet
        broadcast={detailBroadcast}
        onClose={() => setDetailBroadcast(null)}
        businessTimezone={businessTimezone}
      />
    </div>
  );
}

// ─── Filter empty states ─────────────────────────────────────────────

function FilterEmptyState({ filter }: Readonly<{ filter: FilterKey }>) {
  const t = useTranslations('notifications.broadcasts');

  if (filter === 'all') return null;

  const ICONS: Record<Exclude<FilterKey, 'all'>, React.ReactNode> = {
    drafts: <MegaphoneIcon className="mx-auto h-7 w-7 text-[#A0A0A0] mb-2.5" />,
    scheduled: <ClockIcon className="mx-auto h-7 w-7 text-[#A0A0A0] mb-2.5" />,
    sent: <PaperPlaneTiltIcon className="mx-auto h-7 w-7 text-[#A0A0A0] mb-2.5" />,
  };
  const icon = ICONS[filter];

  const hasCta = filter === 'drafts' || filter === 'scheduled';

  return (
    <div className="rounded-[10px] border border-dashed border-[var(--border-light)] px-5 py-9 text-center">
      {icon}
      <div className="text-[13px] font-semibold text-[#1A1A1A] mb-1">
        {t(`empty.filters.${filter}.title`)}
      </div>
      <p className="text-[12px] text-[#8A8A8A] max-w-xs mx-auto leading-[1.45]">
        {t(`empty.filters.${filter}.description`)}
      </p>
      {hasCta && (
        <div className="mt-3.5">
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link href="/program/broadcasts/new">
              <PlusIcon className="h-3.5 w-3.5" weight="bold" />
              {t(`empty.filters.${filter}.cta`)}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
