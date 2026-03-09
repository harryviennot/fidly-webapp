'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, GlobeIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
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

  const baseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;

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
          <div className="w-[180px] h-[180px] rounded-xl bg-[var(--paper)] border border-[var(--border)] flex items-center justify-center mb-3.5 relative overflow-hidden">
            <svg width="140" height="140" viewBox="0 0 140 140">
              {Array.from({ length: 14 }, (_, r) =>
                Array.from({ length: 14 }, (_, c) => {
                  const isCorner = (r < 3 && c < 3) || (r < 3 && c > 10) || (r > 10 && c < 3);
                  const isBorder = (r < 4 && c < 4) || (r < 4 && c > 9) || (r > 9 && c < 4);
                  const s = Math.sin(r * 7 + c * 13) * 0.5 + 0.5;
                  const fill = isCorner ? '#1A1A1A' : isBorder ? (s > 0.4 ? '#1A1A1A' : 'none') : (s > 0.55 ? '#1A1A1A' : 'none');
                  return fill !== 'none' ? (
                    <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width="8" height="8" rx="1" fill={fill} />
                  ) : null;
                })
              ).flat()}
              <rect x="50" y="50" width="40" height="40" rx="8" fill="#fff" />
              <rect x="53" y="53" width="34" height="34" rx="6" fill="#4A7C59" />
              <text x="70" y="75" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="inherit">S</text>
            </svg>
          </div>
          <div className="text-[12px] text-[#8A8A8A] mb-3">{t('scanToAdd')}</div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors"
            >
              <DownloadSimpleIcon className="w-3.5 h-3.5" /> {t('downloadPng')}
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-medium)] bg-white text-[12px] font-medium text-[#555] cursor-pointer hover:bg-[var(--paper)] transition-colors">
              <DownloadSimpleIcon className="w-3.5 h-3.5" /> {t('downloadSvg')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
