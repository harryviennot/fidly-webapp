'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, GlobeIcon, DownloadSimpleIcon, FilePdfIcon } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { getBusinessSignupQR } from '@/api/businesses';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BusinessUrlCardProps {
  delay?: number;
}

export function BusinessUrlCard({ delay = 0 }: BusinessUrlCardProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const tProgram = useTranslations('loyaltyProgram');
  const { currentBusiness } = useBusiness();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;
  const businessName = currentBusiness?.name || 'business';

  useEffect(() => {
    if (!currentBusiness?.id) return;
    setQrLoading(true);
    getBusinessSignupQR(currentBusiness.id)
      .then((data) => setQrCode(data.qr_code))
      .catch(() => {/* QR will stay null, skeleton hidden */})
      .finally(() => setQrLoading(false));
  }, [currentBusiness?.id]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success(tProgram('linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownloadPng = () => {
    if (!qrCode) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${businessName}-qr-code.png`;
    link.click();
  };

  const handleDownloadPdf = async () => {
    if (!qrCode) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFontSize(20);
      doc.text(businessName, 105, 40, { align: 'center' });

      // Convert data URL to raw base64 for jsPDF compatibility
      const base64Data = qrCode.includes(',') ? qrCode.split(',')[1] : qrCode;
      doc.addImage(base64Data, 'PNG', 52.5, 60, 100, 100);

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(fullUrl, 105, 175, { align: 'center' });

      doc.save(`${businessName}-qr-code.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div
      className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header with toggle */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <div className="text-[15px] font-semibold text-[#1A1A1A] mb-0.5">
            {t('programLink')}
          </div>
          <div className="text-[12px] text-[#A0A0A0]">
            {t('programLinkDescription')}
          </div>
        </div>

        {/* Link / QR Code toggle */}
        <div className="flex bg-[var(--paper-hover)] rounded-lg p-[3px] flex-shrink-0">
          <button
            onClick={() => setShowQR(false)}
            className={cn(
              'px-3 py-[5px] rounded-md text-[11px] border-none cursor-pointer transition-all duration-150',
              !showQR
                ? 'bg-white font-semibold text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'bg-transparent font-normal text-[#888]'
            )}
          >
            {t('link')}
          </button>
          <button
            onClick={() => setShowQR(true)}
            className={cn(
              'px-3 py-[5px] rounded-md text-[11px] border-none cursor-pointer transition-all duration-150',
              showQR
                ? 'bg-white font-semibold text-[#1A1A1A] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'bg-transparent font-normal text-[#888]'
            )}
          >
            {t('qrCode')}
          </button>
        </div>
      </div>

      {/* Link view */}
      {!showQR ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[var(--border-medium)] bg-[var(--paper)]">
            <GlobeIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            <span className="text-[13px] font-medium text-[#1A1A1A] flex-1 truncate">
              {fullUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              'px-4 py-2.5 rounded-lg border text-[12px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap',
              copied
                ? 'bg-[var(--accent-light)] border-[var(--accent-light)] text-[var(--accent)]'
                : 'bg-white border-[var(--border-medium)] text-[#555] hover:bg-[var(--paper)]'
            )}
          >
            {copied ? (
              <><CheckIcon className="w-3.5 h-3.5" /> {t('copied')}</>
            ) : (
              t('copy')
            )}
          </button>
        </div>
      ) : (
        /* QR Code view */
        <div className="flex flex-col items-center py-4">
          <div className="w-[180px] h-[180px] rounded-xl bg-white border border-[var(--border)] flex items-center justify-center mb-3.5 relative overflow-hidden">
            {qrLoading ? (
              <div className="w-[140px] h-[140px] rounded-lg bg-[var(--paper)] animate-pulse" />
            ) : qrCode ? (
              /* eslint-disable-next-line @next/next/no-img-element -- base64 data URL */
              <img src={qrCode} alt="QR Code" className="w-[150px] h-[150px]" />
            ) : (
              <div className="text-[12px] text-[#8A8A8A] text-center px-4">
                QR code unavailable
              </div>
            )}
          </div>
          <div className="text-[12px] text-[#8A8A8A] mb-3">{t('scanToAdd')}</div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={!qrCode}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadSimpleIcon className="w-3.5 h-3.5" /> {t('downloadPng')}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!qrCode}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FilePdfIcon className="w-3.5 h-3.5" /> {t('downloadPdf')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
