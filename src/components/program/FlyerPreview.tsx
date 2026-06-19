'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchFlyerPreviewHtml, type FlyerLocale } from '@/api/flyer';
import { QRCodeSkeleton } from '@/components/ui/qr-code-skeleton';
import { cn } from '@/lib/utils';

// A5 in CSS pixels (148mm x 210mm at 96dpi) — the natural size the backend
// template renders at. We scale this down to fit the container width.
const A5_W = 559;
const A5_H = 794;

interface FlyerPreviewProps {
  businessId: string;
  locale: FlyerLocale;
  locationId?: string | null;
  showDecor?: boolean;
  showBadges?: boolean;
  /**
   * Cap the rendered width (CSS px). The flyer is an A5 page, so left
   * uncapped it renders huge on wide columns; callers pass a sane max and the
   * preview centers within whatever space it's given.
   */
  maxWidth?: number;
}

/** A shimmering bar placeholder, sized in px. */
function Bar({
  w,
  h,
  className,
}: {
  w: number;
  h: number;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-full bg-[#e8e6e1] animate-pulse', className)}
      style={{ width: w, height: h }}
    />
  );
}

/**
 * Flyer-shaped loading skeleton sized to the scaled preview width `w`. Mirrors
 * the real flyer's silhouette — eyebrow + title, the QR (reusing the app's
 * QR-wave skeleton), the three steps, then the wallet badges — so the load
 * reads as "the flyer is coming" rather than a blank box.
 */
function FlyerSkeleton({ w }: { w: number }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between bg-[var(--paper)]"
      style={{ padding: `${w * 0.11}px ${w * 0.1}px` }}
      aria-hidden
    >
      {/* Eyebrow + title + lede */}
      <div className="flex flex-col items-center" style={{ gap: w * 0.024 }}>
        <Bar w={w * 0.26} h={Math.max(5, w * 0.016)} />
        <Bar w={w * 0.6} h={Math.max(13, w * 0.058)} className="rounded-lg" />
        <Bar w={w * 0.5} h={Math.max(5, w * 0.015)} className="mt-1" />
        <Bar w={w * 0.4} h={Math.max(5, w * 0.015)} />
      </div>

      {/* QR — the hero, reusing the shared QR-wave skeleton */}
      <div
        className="rounded-xl bg-white border border-[var(--border)]"
        style={{ padding: w * 0.022 }}
      >
        <QRCodeSkeleton size={Math.round(w * 0.33)} />
      </div>

      {/* Three steps */}
      <div className="flex items-start justify-center" style={{ gap: w * 0.07 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ gap: w * 0.018 }}
          >
            <div
              className="rounded-full bg-[#e8e6e1] animate-pulse"
              style={{ width: w * 0.078, height: w * 0.078 }}
            />
            <Bar w={w * 0.12} h={Math.max(4, w * 0.013)} />
          </div>
        ))}
      </div>

      {/* Wallet badges */}
      <div className="flex items-center justify-center" style={{ gap: w * 0.03 }}>
        <Bar w={w * 0.27} h={Math.max(16, w * 0.052)} className="rounded-md" />
        <Bar w={w * 0.27} h={Math.max(16, w * 0.052)} className="rounded-md" />
      </div>
    </div>
  );
}

/**
 * On-screen flyer preview. Renders the EXACT HTML the PDF is built from
 * (fetched authenticated from the backend) inside a scaled, non-interactive
 * iframe, so the preview always matches the downloaded PDF.
 */
export function FlyerPreview({
  businessId,
  locale,
  locationId,
  showDecor = true,
  showBadges = true,
  maxWidth,
}: FlyerPreviewProps) {
  const t = useTranslations('loyaltyProgram.overview.flyer');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Tracks the iframe's own load event, so the skeleton stays up through both
  // the fetch AND the iframe's render — not just until the HTML arrives.
  const [iframeReady, setIframeReady] = useState(false);
  const [scale, setScale] = useState(() =>
    maxWidth ? Math.min(1, maxWidth / A5_W) : 1
  );

  // Fit the A5 page to the available width (never wider than `maxWidth`, never
  // upscaled past its natural size). A ResizeObserver keeps it responsive as
  // the column / viewport changes.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const target = maxWidth ? Math.min(w, maxWidth) : w;
      setScale(Math.min(1, target / A5_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  // Fetch the rendered HTML whenever the inputs change; cancel stale requests.
  useEffect(() => {
    if (!businessId) return;
    const ctrl = new AbortController();
    // Reset error + readiness while we re-fetch for changed inputs — a
    // legitimate setState-on-input-change, not a cascading render. Resetting
    // `iframeReady` re-arms the skeleton over the incoming locale/location.
    /* eslint-disable react-hooks/set-state-in-effect */
    setError(false);
    setIframeReady(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchFlyerPreviewHtml(
      businessId,
      { locale, locationId, showDecor, showBadges },
      ctrl.signal
    )
      .then((h) => setHtml(h))
      .catch((e) => {
        if (e?.name !== 'AbortError') {
          setError(true);
          setHtml(null);
        }
      });
    return () => ctrl.abort();
  }, [businessId, locale, locationId, showDecor, showBadges]);

  const w = A5_W * scale;
  const loaded = !!html && iframeReady;

  return (
    <div
      ref={wrapRef}
      className="w-full mx-auto"
      style={maxWidth ? { maxWidth } : undefined}
    >
      <div
        className="relative mx-auto overflow-hidden rounded-xl shadow-[0_18px_50px_rgba(40,28,18,0.16)]"
        style={{ width: w, height: A5_H * scale }}
      >
        {html && !error && (
          <iframe
            title={t('previewAlt')}
            srcDoc={html}
            scrolling="no"
            sandbox=""
            tabIndex={-1}
            onLoad={() => setIframeReady(true)}
            style={{
              width: A5_W,
              height: A5_H,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          />
        )}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--paper)] px-4 text-center text-[13px] text-[var(--muted-foreground)]">
            {t('error')}
          </div>
        ) : (
          // Skeleton overlay: covers the fetch and the iframe render, then
          // fades out to reveal the flyer underneath.
          <div
            className={cn(
              'transition-opacity duration-300',
              loaded && 'pointer-events-none opacity-0'
            )}
          >
            <FlyerSkeleton w={w} />
          </div>
        )}
      </div>
    </div>
  );
}
