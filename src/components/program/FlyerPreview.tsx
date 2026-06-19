'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchFlyerPreviewHtml, type FlyerLocale } from '@/api/flyer';

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
}: FlyerPreviewProps) {
  const t = useTranslations('loyaltyProgram.overview.flyer');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);

  // Fit the A5 page to the available width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / A5_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch the rendered HTML whenever the inputs change; cancel stale requests.
  useEffect(() => {
    if (!businessId) return;
    const ctrl = new AbortController();
    // Reset the error flag while we re-fetch for changed inputs — a legitimate
    // setState-on-input-change, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
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

  return (
    <div ref={wrapRef} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-xl shadow-[0_18px_50px_rgba(40,28,18,0.16)]"
        style={{ width: A5_W * scale, height: A5_H * scale }}
      >
        {html && !error ? (
          <iframe
            title={t('previewAlt')}
            srcDoc={html}
            scrolling="no"
            sandbox=""
            tabIndex={-1}
            style={{
              width: A5_W,
              height: A5_H,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--paper)] text-[13px] text-[var(--muted-foreground)]">
            {error ? t('error') : '…'}
          </div>
        )}
      </div>
    </div>
  );
}
