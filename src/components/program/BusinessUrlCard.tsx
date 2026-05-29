'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useBusiness } from '@/contexts/business-context';
import { getBusinessSignupQR } from '@/api/businesses';
import { QrLinkView } from '@/components/program/QrLinkView';
import { LocationQrPanel } from '@/components/program/LocationQrPanel';

interface BusinessUrlCardProps {
  delay?: number;
}

export function BusinessUrlCard({ delay = 0 }: BusinessUrlCardProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const { currentBusiness } = useBusiness();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;
  const businessName = currentBusiness?.name || 'business';

  useEffect(() => {
    if (!currentBusiness?.id) return;
    // Reset to skeleton while we re-fetch for a different business —
    // legitimate setState-on-input-change, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQrLoading(true);
    // Pass the browser-side URL so the QR encodes exactly what's shown
    // next to it. See InstallStep for the rationale (nip.io divergence).
    getBusinessSignupQR(currentBusiness.id, fullUrl)
      .then((data) => setQrCode(data.qr_code))
      .catch(() => {/* QR will stay null, unavailable state shown */})
      .finally(() => setQrLoading(false));
  }, [currentBusiness?.id, fullUrl]);

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="mb-3.5">
        <div className="text-[15px] font-semibold text-[#1A1A1A] mb-0.5">
          {t('programLink')}
        </div>
        <div className="text-[12px] text-[#A0A0A0]">
          {t('programLinkDescription')}
        </div>
      </div>

      {/* Global program QR + link */}
      <QrLinkView
        qrDataUrl={qrCode}
        loading={qrLoading}
        url={fullUrl}
        downloadName={businessName}
      />

      {/* Per-location QR codes (Pro, >1 location — self-gates to null) */}
      <LocationQrPanel />
    </div>
  );
}
