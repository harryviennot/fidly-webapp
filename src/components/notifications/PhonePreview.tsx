'use client';

import { MessagePreview } from './MessagePreview';
import { cn } from '@/lib/utils';

interface PhonePreviewProps {
  iconUrl?: string | null;
  businessName: string;
  body: string;
  className?: string;
}

/**
 * Large iPhone-style lock-screen mockup for the notifications feature.
 *
 * Renders a phone silhouette with a dark wallpaper gradient and the
 * notification banner (via `MessagePreview`) floating near the top.
 * Reused across: transactional preview pane, broadcast wizard review step.
 */
export function PhonePreview({
  iconUrl,
  businessName,
  body,
  className,
}: Readonly<PhonePreviewProps>) {
  const time = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[230px] rounded-[36px] p-1.5 shadow-xl',
        'bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
        className
      )}
      style={{
        aspectRatio: '9 / 19.5',
      }}
    >
      {/* Inner screen */}
      <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-gradient-to-b from-[#2c3e50] via-[#34495e] to-[#1a1a2e]">
        {/* Notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-5 w-20 rounded-full bg-black" />

        {/* Status bar time */}
        <div className="absolute top-[14px] left-5 text-[10px] font-semibold text-white z-10">
          {time}
        </div>

        {/* Lock screen clock */}
        <div className="pt-12 text-center">
          <div className="text-[11px] font-medium text-white/80 uppercase tracking-wide">
            {date}
          </div>
          <div className="text-5xl font-light text-white mt-0.5 tabular-nums">
            {time}
          </div>
        </div>

        {/* Notification banner */}
        <div className="absolute top-[140px] left-0 right-0 px-3">
          <MessagePreview
            iconUrl={iconUrl}
            businessName={businessName}
            body={body}
          />
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
