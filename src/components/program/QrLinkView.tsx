'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckIcon,
  GlobeIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
} from '@phosphor-icons/react';
import { downloadQrPng, downloadQrPdf } from '@/lib/qr-download';
import { copyToClipboard } from '@/lib/clipboard';
import { QRCodeSkeleton } from '@/components/ui/qr-code-skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QrLinkViewProps {
  /** Full PNG data URL, or null while loading / unavailable. */
  qrDataUrl: string | null;
  loading?: boolean;
  /** Public enrollment/signup URL shown next to the QR and printed on the PDF. */
  url: string;
  /** Stem used for the downloaded PNG/PDF file names. */
  downloadName: string;
  className?: string;
}

/**
 * QR code and its public link shown together: QR on the left, the link (with
 * copy) and PNG/PDF downloads on the right. Stacks on narrow screens. Shared
 * by the global program card and each per-location row so both read the same.
 */
export function QrLinkView({
  qrDataUrl,
  loading = false,
  url,
  downloadName,
  className,
}: QrLinkViewProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    downloadQrPng(qrDataUrl, downloadName);
  };

  const handleDownloadPdf = async () => {
    if (!qrDataUrl) return;
    try {
      await downloadQrPdf(qrDataUrl, downloadName, url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error(t('downloadPdfError'));
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 sm:flex-row sm:items-stretch',
        className
      )}
    >
      {/* QR */}
      <div className="w-[140px] h-[140px] shrink-0 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center overflow-hidden">
        {loading ? (
          <QRCodeSkeleton size={116} />
        ) : qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- base64 data URL */
          <img src={qrDataUrl} alt="QR code" className="w-[120px] h-[120px]" />
        ) : (
          <div className="text-[12px] text-[#8A8A8A] text-center px-4">
            {t('qrUnavailable')}
          </div>
        )}
      </div>

      {/* Link + downloads */}
      <div className="flex-1 min-w-0 w-full flex flex-col justify-center gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--border-medium)] bg-[var(--paper)]">
            <GlobeIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            <span className="text-[13px] font-medium text-[#1A1A1A] flex-1 min-w-0 truncate">
              {url}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              'flex-shrink-0 px-4 py-2.5 rounded-lg border text-[12px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap',
              copied
                ? 'bg-[var(--accent-light)] border-[var(--accent-light)] text-[var(--accent)]'
                : 'bg-white border-[var(--border-medium)] text-[#555] hover:bg-[var(--paper)]'
            )}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" /> {t('copied')}
              </>
            ) : (
              t('copy')
            )}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={!qrDataUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadSimpleIcon className="w-3.5 h-3.5" /> {t('downloadPng')}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={!qrDataUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FilePdfIcon className="w-3.5 h-3.5" /> {t('downloadPdf')}
          </button>
        </div>
      </div>
    </div>
  );
}
