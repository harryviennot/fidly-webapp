'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PrinterIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CounterFlyerCardProps {
  delay?: number;
}

/**
 * "Share & grow" entry point for the printable counter flyer. Sits beside
 * `BusinessUrlCard` on /program and opens the dedicated flyer screen.
 */
export function CounterFlyerCard({ delay = 0 }: CounterFlyerCardProps) {
  const t = useTranslations('loyaltyProgram.overview.flyer');

  return (
    <Card
      hover={false}
      className="p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#FFF4EC] flex items-center justify-center">
          <PrinterIcon className="w-5 h-5 text-[#F97316]" weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[#1A1A1A] mb-0.5">
            {t('cardTitle')}
          </div>
          <div className="text-[12px] text-[#A0A0A0]">{t('cardDescription')}</div>
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        className="mt-3.5 w-full rounded-full text-[var(--foreground)]"
      >
        <Link href="/program/flyer">{t('cardCta')}</Link>
      </Button>
    </Card>
  );
}
