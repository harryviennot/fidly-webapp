'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { QrCodeIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StampeoLogo } from '@/components/ui/stampeo-logo';

interface CounterFlyerCardProps {
  delay?: number;
}

/**
 * "Share & grow" entry point for the printable counter flyer. Sits beside
 * `BusinessUrlCard` on /program and mirrors its anatomy: a visual on the left
 * (here a small A5 flyer mock, the print-side counterpart to that card's QR
 * thumbnail), with the title, description and CTA on the right.
 */
export function CounterFlyerCard({ delay = 0 }: CounterFlyerCardProps) {
  const t = useTranslations('loyaltyProgram.overview.flyer');

  return (
    <Card
      flat
      hover={false}
      className="p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Compact header: flyer mock + title/description, centered together */}
      <div className="flex items-center gap-4">
        {/* Flyer mock — a tiny stand-in for the printed A5 sheet */}
        <div
          className="relative shrink-0 w-[64px] rounded-md bg-white border border-[var(--border-medium)] shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col items-center"
          style={{ aspectRatio: '148 / 210' }}
        >
          <div className="w-full h-1 bg-[var(--accent)]" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-1.5">
            <StampeoLogo className="w-3 h-3 text-[var(--accent)]" />
            <div className="w-7 h-7 rounded bg-[var(--paper)] border border-[var(--border)] flex items-center justify-center">
              <QrCodeIcon
                className="w-[18px] h-[18px] text-[var(--foreground)]"
                weight="regular"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-[3px] rounded-full bg-[var(--border-medium)]" />
              <div className="w-5 h-[3px] rounded-full bg-[var(--border-medium)]" />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[#1A1A1A] mb-0.5">
            {t('cardTitle')}
          </div>
          <div className="text-[12px] leading-relaxed text-[#A0A0A0]">
            {t('cardDescription')}
          </div>
        </div>
      </div>

      <Button
        asChild
        variant="outline"
        className="mt-4 w-full rounded-full text-[var(--foreground)]"
      >
        <Link href="/program/flyer">{t('cardCta')}</Link>
      </Button>
    </Card>
  );
}
