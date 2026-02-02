'use client';

import { useMemo } from 'react';
import Image from 'next/image';

interface NotificationPreviewProps {
  title: string;
  message: string;
  appName?: string;
  appIconUrl?: string;
  variables?: Record<string, string>;
}

const defaultVariables: Record<string, string> = {
  '{remaining}': '3',
  '{total}': '10',
  '{customer_name}': 'Sarah',
  '{reward_name}': 'Free Coffee',
};

function substituteVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}

export function NotificationPreview({
  title,
  message,
  appName = 'Fidelity',
  appIconUrl,
  variables = defaultVariables,
}: NotificationPreviewProps) {
  const displayTitle = useMemo(() => substituteVariables(title, variables), [title, variables]);
  const displayMessage = useMemo(() => substituteVariables(message, variables), [message, variables]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">
        Preview
      </p>

      {/* iPhone notification mockup */}
      <div className="w-full max-w-[280px]">
        {/* Notification banner */}
        <div
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Header row */}
          <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
            {/* App icon */}
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              {appIconUrl ? (
                <Image
                  src={appIconUrl}
                  alt={appName}
                  width={36}
                  height={36}
                  className="rounded-[10px] object-cover"
                  unoptimized
                />
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </div>

            {/* App name and time */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {appName}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 ml-2 flex-shrink-0">
                  now
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-3.5 pb-3.5">
            <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
              {displayTitle || 'Notification Title'}
            </p>
            <p className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-snug mt-0.5 line-clamp-2">
              {displayMessage || 'Notification message will appear here...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationPreview;
