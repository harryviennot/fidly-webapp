'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type MessagePreviewSize = 'default' | 'lg';

interface MessagePreviewProps {
  /** URL to a square icon (29-87 px). Optional — falls back to a generic bell. */
  iconUrl?: string | null;
  /** Full-resolution square original. Preferred over `iconUrl` when available
   *  so dashboard previews aren't upscaling Apple's tiny 29px asset. */
  iconOriginalUrl?: string | null;
  /** Loyalty program name — shown as the banner title if provided. iOS uses
   *  `organizationName` as the push notification title and we fill that
   *  with the program name (see backend/app/services/pass_generator.py). */
  programName?: string | null;
  /** Fallback sender name when the program has no name. */
  businessName: string;
  /** Body text that will appear on the lock screen. */
  body: string;
  /** Optional label under the banner, e.g. "Apple Wallet preview". */
  caption?: string;
  /**
   * `default` (capped at 280px, iOS-realistic) or `lg` (uncapped, fills the
   * container with proportionally larger icon and text). Use `lg` when the
   * preview sits next to a small input column and we want it to fill the
   * available horizontal space (e.g. the onboarding icon step).
   */
  size?: MessagePreviewSize;
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
  iconOriginalUrl,
  programName,
  businessName,
  body,
  caption,
  size = 'default',
  className,
}: MessagePreviewProps) {
  const t = useTranslations('notifications.broadcasts.preview');
  const displayTitle = programName?.trim() || businessName || t('fallbackTitle');
  const displayIconUrl = iconOriginalUrl || iconUrl;
  const isLg = size === 'lg';
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        isLg ? 'w-full' : 'items-center',
        className
      )}
    >
      <div
        className={cn(
          'w-full rounded-2xl bg-neutral-900/90 backdrop-blur-xl text-white shadow-lg',
          isLg ? 'px-4 py-3' : 'max-w-[280px] px-3 py-2.5'
        )}
      >
        <div className={cn('flex items-start', isLg ? 'gap-3' : 'gap-2.5')}>
          {displayIconUrl ? (
            <div
              className={cn(
                'relative shrink-0 overflow-hidden rounded-md bg-white/10',
                isLg ? 'h-10 w-10' : 'h-8 w-8'
              )}
            >
              <Image
                src={displayIconUrl}
                alt={displayTitle}
                width={isLg ? 40 : 32}
                height={isLg ? 40 : 32}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-md bg-white/10',
                isLg ? 'h-10 w-10 text-lg' : 'h-8 w-8 text-base'
              )}
            >
              🔔
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div
                className={cn(
                  'truncate font-semibold text-white/90',
                  isLg ? 'text-[13px]' : 'text-[11px]'
                )}
              >
                {displayTitle}
              </div>
              <div
                className={cn(
                  'text-white/60 shrink-0',
                  isLg ? 'text-[11px]' : 'text-[10px]'
                )}
              >
                {t('now')}
              </div>
            </div>
            <div
              className={cn(
                'mt-0.5 leading-snug text-white break-words',
                isLg ? 'text-[15px]' : 'text-[13px]'
              )}
            >
              {body || (
                <span className="italic text-white/50">
                  {t('placeholder')}
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
