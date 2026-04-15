'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MegaphoneIcon,
  PlusIcon,
  LightningIcon,
  WarningIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
  GoogleLogoIcon,
} from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  EmptyState,
  InfoBox,
  InfoCard,
  NoteBlock,
  NumberedSteps,
  DividerNote,
  UpsellHero,
  UpsellInline,
} from '@/components/reusables';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  useInfiniteBroadcasts,
  useBroadcastStats,
} from '@/hooks/use-notifications';
import { isEditable } from '@/lib/broadcast-filters';
import {
  BroadcastListRow,
  BroadcastListSkeleton,
  BroadcastDetailSheet,
  LastBroadcastResultsWidget,
} from '@/components/notifications';
import type {
  Broadcast,
  BroadcastStatusFilter,
} from '@/types/notification';

type FilterKey = 'all' | 'scheduled' | 'sent' | 'drafts';

const FILTER_ORDER: FilterKey[] = ['all', 'scheduled', 'sent', 'drafts'];

function filterKeyToStatus(
  filter: FilterKey
): BroadcastStatusFilter | undefined {
  if (filter === 'all') return undefined;
  return filter;
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

  const activeFilter = (searchParams.get('filter') as FilterKey) || 'all';

  const businessIdForQuery = canBroadcast ? currentBusiness?.id : undefined;

  const {
    data: infiniteData,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteBroadcasts(businessIdForQuery, {
    limit: 20,
    status: filterKeyToStatus(activeFilter),
  });

  const { data: statsData } = useBroadcastStats(businessIdForQuery);

  const visibleBroadcasts = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.items) ?? [],
    [infiniteData]
  );
  const quotaUsed = statsData?.month_quota_used ?? 0;
  const hasMonthlyLimit = typeof monthlyLimit === 'number' && monthlyLimit > 0;
  const isQuotaReached = hasMonthlyLimit && quotaUsed >= monthlyLimit;

  const [detailBroadcast, setDetailBroadcast] = useState<Broadcast | null>(null);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRowClick = (broadcast: Broadcast) => {
    if (isEditable(broadcast.status)) {
      router.push(`/program/broadcasts/${broadcast.id}/edit`);
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
        <UpsellHero
          icon={<MegaphoneIcon className="w-7 h-7" weight="fill" />}
          title={t('starter.headline')}
          description={t('starter.description')}
          features={[
            t('starter.features.segment'),
            t('starter.features.schedule'),
            t('starter.features.tracking'),
          ]}
          ctaLabel={t('starter.cta')}
          upgradeFrom="broadcasts"
        />
      </div>
    );
  }

  // Body of the "How it works" card — captured once so desktop and mobile
  // placements stay in sync.
  const howItWorksIcon = (
    <LightningIcon className="h-3.5 w-3.5" weight="fill" />
  );
  const howItWorksTitle = t('starter.headline');
  const howItWorksBody = (
    <>
      <NumberedSteps
        items={[
          t('howItWorks.steps.compose'),
          t('howItWorks.steps.audience'),
          t('howItWorks.steps.send'),
        ]}
      />
      <DividerNote>{t('howItWorks.delivery')}</DividerNote>
      <div className="mt-3">
        <NoteBlock
          variant="amber"
          icon={<WarningIcon className="h-3.5 w-3.5" weight="fill" />}
          title={t('howItWorks.appleNote.title')}
          link={{
            href: 'https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html',
            label: t('howItWorks.appleNote.link'),
            external: true,
          }}
        >
          {t('howItWorks.appleNote.body')}
        </NoteBlock>
      </div>
      <div className="mt-2">
        <NoteBlock
          variant="blue"
          icon={<GoogleLogoIcon className="h-3.5 w-3.5" weight="fill" />}
          title={t('howItWorks.googleNote.title')}
        >
          {t('howItWorks.googleNote.body')}
        </NoteBlock>
      </div>
    </>
  );

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

          {/* Mobile-only: side widgets above the list. */}
          <div className="min-[1080px]:hidden flex flex-col gap-[14px]">
            {statsData?.last_sent && (
              <LastBroadcastResultsWidget
                lastSent={statsData.last_sent}
                onOpen={setDetailBroadcast}
              />
            )}
            <InfoCard
              icon={howItWorksIcon}
              title={howItWorksTitle}
              subtitle={t('howItWorks.delivery')}
              collapsible
            >
              {howItWorksBody}
            </InfoCard>
          </div>

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

            {!isLoading &&
              !error &&
              visibleBroadcasts.length === 0 &&
              activeFilter === 'all' && (
                <EmptyState
                  size="md"
                  icon={<MegaphoneIcon className="h-8 w-8" />}
                  title={t('empty.title')}
                  description={t('empty.description')}
                  cta={
                    <Button
                      variant="gradient"
                      asChild
                      className="rounded-full"
                    >
                      <Link href="/program/broadcasts/new">
                        <PlusIcon className="h-4 w-4" weight="bold" />
                        {t('empty.cta')}
                      </Link>
                    </Button>
                  }
                />
              )}

            {!isLoading &&
              !error &&
              visibleBroadcasts.length === 0 &&
              activeFilter !== 'all' && (
                <FilterEmptyState filter={activeFilter} />
              )}

            {!isLoading && !error && visibleBroadcasts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {visibleBroadcasts.map((broadcast, i) => (
                  <div
                    key={broadcast.id}
                    className="animate-slide-up"
                    style={{
                      animationDelay: `${Math.min(i, 10) * 60}ms`,
                    }}
                  >
                    <BroadcastListRow
                      broadcast={broadcast}
                      onClick={handleRowClick}
                    />
                  </div>
                ))}
                <div ref={sentinelRef} className="h-1" />
                {isFetchingNextPage && (
                  <div className="pt-2">
                    <BroadcastListSkeleton />
                  </div>
                )}
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
            <InfoCard icon={howItWorksIcon} title={howItWorksTitle}>
              {howItWorksBody}
            </InfoCard>

            {/* Last broadcast results — hidden until the first sent broadcast exists */}
            <LastBroadcastResultsWidget
              lastSent={statsData?.last_sent ?? null}
              onOpen={setDetailBroadcast}
            />

            {/* Pro upsell (Growth only) */}
            {tier === 'growth' && (
              <UpsellInline
                title={t('proUpsell.title')}
                description={t('proUpsell.description')}
                features={[
                  t('proUpsell.features.schedule'),
                  t('proUpsell.features.unlimited'),
                ]}
                ctaLabel={t('proUpsell.cta')}
                ctaHref="/billing?from=broadcasts"
              />
            )}
          </div>
        </div>
      </div>

      <BroadcastDetailSheet
        broadcast={detailBroadcast}
        onClose={() => setDetailBroadcast(null)}
      />
    </div>
  );
}

// ─── Filter empty states ─────────────────────────────────────────────

function FilterEmptyState({ filter }: Readonly<{ filter: FilterKey }>) {
  const t = useTranslations('notifications.broadcasts');

  if (filter === 'all') return null;

  const ICONS: Record<Exclude<FilterKey, 'all'>, React.ReactNode> = {
    drafts: <MegaphoneIcon className="h-7 w-7" />,
    scheduled: <ClockIcon className="h-7 w-7" />,
    sent: <PaperPlaneTiltIcon className="h-7 w-7" />,
  };

  const hasCta = filter === 'drafts' || filter === 'scheduled';

  return (
    <EmptyState
      icon={ICONS[filter]}
      title={t(`empty.filters.${filter}.title`)}
      description={t(`empty.filters.${filter}.description`)}
      cta={
        hasCta ? (
          <Button variant="outline" size="sm" asChild className="rounded-full">
            <Link href="/program/broadcasts/new">
              <PlusIcon className="h-3.5 w-3.5" weight="bold" />
              {t(`empty.filters.${filter}.cta`)}
            </Link>
          </Button>
        ) : null
      }
    />
  );
}
