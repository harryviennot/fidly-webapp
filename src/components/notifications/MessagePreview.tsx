'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface MessagePreviewProps {
  /** URL to a square icon (29-87 px). Optional — falls back to a generic bell. */
  iconUrl?: string | null;
  /** Sender name shown at the top of the banner (usually the business name). */
  businessName: string;
  /** Body text that will appear on the lock screen. */
  body: string;
  /** Optional label under the banner, e.g. "Apple Wallet preview". */
  caption?: string;
  className?: string;
}

/**
 * Stylized iOS lock-screen notification banner.
 *
 * Used across the notifications feature to preview what a customer will see
 * on their device when a transactional or broadcast message fires.
 */
export function MessagePreview({
  iconUrl,
  businessName,
  body,
  caption,
  className,
}: MessagePreviewProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="w-full max-w-[280px] rounded-2xl bg-neutral-900/90 backdrop-blur-xl text-white px-3 py-2.5 shadow-lg">
        <div className="flex items-start gap-2.5">
          {iconUrl ? (
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-white/10">
              <Image
                src={iconUrl}
                alt={businessName}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-base">
              🔔
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/90">
                {businessName || 'Your business'}
              </div>
              <div className="text-[10px] text-white/60 shrink-0">now</div>
            </div>
            <div className="mt-0.5 text-[13px] leading-snug text-white break-words">
              {body || (
                <span className="italic text-white/50">
                  Your message will appear here
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {caption && (
        <div className="text-[11px] text-muted-foreground">{caption}</div>
      )}
    </div>
  );
}
