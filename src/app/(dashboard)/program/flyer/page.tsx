'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CaretLeftIcon,
  DownloadSimpleIcon,
  FilesIcon,
} from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocations } from '@/hooks/use-locations';
import { syncAchievements } from '@/api/transactions';
import {
  downloadFlyerPdf,
  downloadFlyersPdf,
  type FlyerLocale,
} from '@/api/flyer';
import { FlyerPreview } from '@/components/program/FlyerPreview';
import { PageHeader } from '@/components/redesign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewToggle } from '@/components/ui/view-toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LOCALE_OPTIONS: { value: FlyerLocale; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const FLYER_REWARD_KEY = 'printed_flyer';

/** Filesystem-safe stem for the downloaded filename. */
function fileStem(name: string, location?: string): string {
  const raw = location ? `${name}-${location}` : name;
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || 'stampeo';
}

export default function FlyerPage() {
  const t = useTranslations('loyaltyProgram.overview.flyer');
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const queryClient = useQueryClient();

  const businessId = currentBusiness?.id;
  const businessName = currentBusiness?.name || 'Stampeo';

  const [locale, setLocale] = useState<FlyerLocale>(
    currentBusiness?.primary_locale ?? 'fr'
  );

  const canMultiLocation = hasFeature('locations.multiple');
  const { data: locations } = useLocations(
    canMultiLocation ? businessId : undefined
  );
  const activeLocations = useMemo(
    () =>
      (locations ?? [])
        .filter((l) => !l.deleted_at)
        .sort((a, b) =>
          a.is_primary === b.is_primary
            ? a.name.localeCompare(b.name)
            : a.is_primary
              ? -1
              : 1
        ),
    [locations]
  );
  const hasMultiple = canMultiLocation && activeLocations.length > 1;

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  // Default the selection to the primary location once locations load.
  const effectiveLocationId = hasMultiple
    ? (selectedLocationId ?? activeLocations[0]?.id ?? null)
    : null;

  const [busy, setBusy] = useState(false);
  const rewardedRef = useRef(false);

  const rewardMutation = useMutation({
    mutationFn: () => syncAchievements(businessId!, [FLYER_REWARD_KEY]),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['business-achievements', businessId],
      }),
  });

  const fireReward = () => {
    if (!businessId || rewardedRef.current) return;
    rewardedRef.current = true;
    rewardMutation.mutate();
  };

  const handleDownload = async (mode: 'single' | 'all') => {
    if (!businessId || busy) return;
    setBusy(true);
    try {
      if (mode === 'all') {
        await downloadFlyersPdf(
          businessId,
          { locale },
          `${fileStem(businessName)}-flyers.pdf`
        );
      } else {
        const locName = effectiveLocationId
          ? activeLocations.find((l) => l.id === effectiveLocationId)?.name
          : undefined;
        await downloadFlyerPdf(
          businessId,
          { locale, locationId: effectiveLocationId },
          `${fileStem(businessName, locName)}-flyer.pdf`
        );
      }
      toast.success(t('downloaded'));
      fireReward();
    } catch (err) {
      console.error('Flyer download failed:', err);
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  };

  if (!businessId) return null;

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up">
      <Link
        href="/program"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors w-fit"
      >
        <CaretLeftIcon className="w-3.5 h-3.5" weight="bold" />
        {t('back')}
      </Link>

      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={[
          {
            label: busy ? t('downloading') : t('download'),
            icon: <DownloadSimpleIcon className="w-4 h-4" weight="bold" />,
            onClick: () => handleDownload('single'),
            disabled: busy,
          },
        ]}
      />

      <div className="grid gap-[14px] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Preview */}
        <Card
          flat
          hover={false}
          className="bg-[var(--paper)] p-4 sm:p-6 flex items-center justify-center"
        >
          <FlyerPreview
            businessId={businessId}
            locale={locale}
            locationId={effectiveLocationId}
          />
        </Card>

        {/* Controls */}
        <Card
          hover={false}
          className="p-5 flex flex-col gap-5 lg:sticky lg:top-4"
        >
          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-semibold text-[#1A1A1A]">
              {t('language')}
            </div>
            <ViewToggle
              value={locale}
              onChange={(v) => setLocale(v as FlyerLocale)}
              options={LOCALE_OPTIONS}
              variant="solid"
              fullWidth
            />
          </div>

          {hasMultiple && (
            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold text-[#1A1A1A]">
                {t('location')}
              </div>
              <Select
                value={effectiveLocationId ?? undefined}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="gradient"
              className="rounded-full"
              onClick={() => handleDownload('single')}
              disabled={busy}
            >
              <DownloadSimpleIcon className="w-4 h-4" weight="bold" />
              {busy ? t('downloading') : t('download')}
            </Button>
            {hasMultiple && (
              <Button
                variant="outline"
                className="rounded-full text-[var(--foreground)]"
                onClick={() => handleDownload('all')}
                disabled={busy}
              >
                <FilesIcon className="w-4 h-4" weight="bold" />
                {t('downloadAll')}
              </Button>
            )}
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            {t('helper')}
          </p>
        </Card>
      </div>
    </div>
  );
}
