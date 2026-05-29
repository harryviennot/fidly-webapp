'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import {
  CaretDownIcon,
  DownloadSimpleIcon,
  MapPinIcon,
} from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocations, useLocationQR, locationKeys } from '@/hooks/use-locations';
import { getLocationQR } from '@/api/locations';
import {
  downloadAllQrPdf,
  downloadAllQrZip,
  toQrDataUrl,
  type QrSheetItem,
} from '@/lib/qr-download';
import { InfoBox } from '@/components/reusables';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { QrLinkView } from '@/components/program/QrLinkView';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Location } from '@/types/location';

const DOWNLOAD_ALL_BUTTON =
  'flex-1 flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Per-location QR codes, living *inside* the program-link card below the
 * global QR as one big collapsible ("accordion of accordions"). Renders
 * `null` unless the business is on Pro (`locations.multiple`) and has more
 * than one active location.
 *
 * Each location is a collapsible row that, when opened, shows its QR next to
 * its enrollment link (via `QrLinkView`). "Download all" produces one
 * multi-page PDF (a page per location) and one ZIP of PNGs named by slug.
 */
export function LocationQrPanel() {
  const t = useTranslations('loyaltyProgram.overview');
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const queryClient = useQueryClient();

  const businessId = currentBusiness?.id;
  const businessName = currentBusiness?.name || 'business';
  const canMultiLocation = hasFeature('locations.multiple');

  const { data: locations } = useLocations(
    canMultiLocation ? businessId : undefined
  );
  const activeLocations = useMemo(
    () =>
      (locations ?? [])
        .filter((l) => !l.deleted_at)
        // Primary first, then alphabetical — matches the locations grid order.
        .sort((a, b) =>
          a.is_primary === b.is_primary
            ? a.name.localeCompare(b.name)
            : a.is_primary
              ? -1
              : 1
        ),
    [locations]
  );

  const [panelOpen, setPanelOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  if (!canMultiLocation || activeLocations.length <= 1 || !businessId) {
    return null;
  }

  /** Fetch every location's QR (reusing the React Query cache) and hand the
   *  resolved set to a batch downloader. */
  const downloadAll = async (kind: 'pdf' | 'zip') => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      const results = await Promise.all(
        activeLocations.map((loc) =>
          queryClient.fetchQuery({
            queryKey: locationKeys.qr(businessId, loc.id),
            queryFn: () => getLocationQR(businessId, loc.id),
            staleTime: 5 * 60 * 1000,
          })
        )
      );

      const items: QrSheetItem[] = results
        .map((qr, i) => ({ qr, loc: activeLocations[i] }))
        .filter(({ qr }) => !!qr.qr_png_base64)
        .map(({ qr, loc }) => ({
          name: loc.name,
          qr: qr.qr_png_base64 as string,
          fileName: loc.slug,
          url: qr.enrollment_url,
        }));

      if (items.length === 0) {
        toast.error(t('downloadAllError'));
        return;
      }

      const fileName = `${businessName}-locations-qr`;
      if (kind === 'pdf') {
        await downloadAllQrPdf(items, fileName);
      } else {
        await downloadAllQrZip(items, fileName);
      }
    } catch (err) {
      console.error('Bulk QR download failed:', err);
      toast.error(t('downloadAllError'));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="mt-5 pt-5 border-t border-[var(--border)]">
      {/* Always-visible guidance: the global QR above vs the per-location QRs.
          Shown whenever there's more than one location, never tucked away. */}
      <InfoBox
        variant="info"
        title={t('locationsQrInfoTitle')}
        message={t('locationsQrInfoBody')}
        className="mb-4"
      />

      <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 cursor-pointer border-none bg-transparent text-left group"
          >
            <div className="flex-1 min-w-0 text-[13px] font-semibold text-[#1A1A1A]">
              {t('locationsQrTitle')}
            </div>
            <span className="text-[12px] text-[var(--muted-foreground)] flex-shrink-0">
              {t('locationsCount', { count: activeLocations.length })}
            </span>
            <CaretDownIcon
              className={cn(
                'w-3.5 h-3.5 text-[var(--muted-foreground)] transition-transform duration-250 flex-shrink-0',
                panelOpen && 'rotate-180'
              )}
              weight="bold"
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="collapsible-content">
          <div className="pt-3.5">
            {/* Download everything at once — full-width, 50/50, above the list */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => downloadAll('pdf')}
                disabled={bulkBusy}
                className={DOWNLOAD_ALL_BUTTON}
              >
                {t('downloadAllPdf')}
                <DownloadSimpleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
              <button
                onClick={() => downloadAll('zip')}
                disabled={bulkBusy}
                className={DOWNLOAD_ALL_BUTTON}
              >
                {t('downloadAllPng')}
                <DownloadSimpleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              </button>
            </div>

            {/* One collapsible row per location */}
            <div className="flex flex-col gap-2">
              {activeLocations.map((location) => (
                <LocationQrRow
                  key={location.id}
                  businessId={businessId}
                  location={location}
                  isOpen={openId === location.id}
                  onToggle={() =>
                    setOpenId((prev) =>
                      prev === location.id ? null : location.id
                    )
                  }
                  primaryLabel={t('locationsQrPrimary')}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface LocationQrRowProps {
  businessId: string;
  location: Location;
  isOpen: boolean;
  onToggle: () => void;
  primaryLabel: string;
}

/** A single collapsible location row. The QR query only runs once the row is
 *  expanded, so collapsed locations cost nothing. */
function LocationQrRow({
  businessId,
  location,
  isOpen,
  onToggle,
  primaryLabel,
}: LocationQrRowProps) {
  const qrQuery = useLocationQR(businessId, location.id, isOpen);
  const base64 = qrQuery.data?.qr_png_base64 ?? null;
  const qrDataUrl = base64 ? toQrDataUrl(base64) : null;
  const enrollmentUrl = qrQuery.data?.enrollment_url ?? '';

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center gap-2.5 cursor-pointer border-none bg-transparent hover:bg-[var(--paper)] transition-colors text-left"
          >
            <MapPinIcon
              className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0"
              weight="fill"
            />
            <span className="flex-1 min-w-0 text-[13px] font-medium text-[#1A1A1A] truncate">
              {location.name}
            </span>
            {location.is_primary && (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                {primaryLabel}
              </span>
            )}
            <CaretDownIcon
              className={cn(
                'w-3.5 h-3.5 text-[var(--muted-foreground)] transition-transform duration-250 flex-shrink-0',
                isOpen && 'rotate-180'
              )}
              weight="bold"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="collapsible-content">
          <div className="px-4 pb-4 pt-1">
            <QrLinkView
              qrDataUrl={qrDataUrl}
              loading={qrQuery.isLoading}
              url={enrollmentUrl}
              downloadName={location.name}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
