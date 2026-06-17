'use client';

import type { ReactNode } from 'react';
import { ArrowCounterClockwiseIcon, CheckIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SaveBarProps {
  /** Unsaved edits exist. Shows the bar with the primary save CTA. */
  dirty: boolean;
  /** A save is in flight. */
  saving?: boolean;
  /** Last save succeeded; shows a transient confirmation, then the parent hides it. */
  saved?: boolean;
  onSave: () => void;
  /** Discards unsaved edits, restoring the last-saved values. Hidden when not dirty. */
  onRevert?: () => void;
  /** CTA label, e.g. "Save changes". */
  saveLabel: string;
  /** In-flight label, e.g. "Saving...". */
  savingLabel: string;
  /** Success label, e.g. "Saved". */
  savedLabel: string;
  /** Revert label, e.g. "Discard". */
  revertLabel?: string;
  /** Optional left-aligned hint (desktop only), e.g. "Unsaved changes". */
  message?: ReactNode;
  className?: string;
}

/**
 * Sticky bottom save bar for explicit-save forms. Pinned to the bottom of the
 * scroll container so the action is always reachable, including on mobile while
 * editing a field far down the page. Renders nothing until there is something
 * to save or confirm.
 *
 * It does not assume any page padding — pass negative margins via `className`
 * (e.g. `-mx-4 md:-mx-6 -mb-4 md:-mb-6`) to make it bleed flush to the scroll
 * container edges. `pb-[max(env(safe-area-inset-bottom),...)]` keeps the CTA
 * clear of the iPhone home indicator.
 */
export function SaveBar({
  dirty,
  saving = false,
  saved = false,
  onSave,
  onRevert,
  saveLabel,
  savingLabel,
  savedLabel,
  revertLabel,
  message,
  className,
}: SaveBarProps) {
  if (!dirty && !saving && !saved) return null;

  const confirming = saved && !dirty;

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 animate-slide-up border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80',
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 md:px-6 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {/* Desktop hint doubles as the spacer that right-aligns the actions. */}
        <div className="hidden min-[480px]:flex flex-1 items-center text-[12px] text-[#8A8A8A]">
          {message}
        </div>

        {onRevert && dirty && (
          <Button
            variant="ghost"
            onClick={onRevert}
            disabled={saving}
            className="flex-1 min-[480px]:flex-none text-[#666] hover:text-[var(--foreground)] hover:bg-[var(--paper-hover)]"
          >
            <ArrowCounterClockwiseIcon className="w-4 h-4" />
            {revertLabel}
          </Button>
        )}

        <Button
          onClick={onSave}
          disabled={saving || !dirty}
          variant={confirming ? 'outline' : 'gradient'}
          className={cn(
            'flex-1 min-[480px]:flex-none transition-all duration-300',
            confirming &&
              'rounded-full border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-light)]'
          )}
        >
          {confirming ? (
            <>
              <CheckIcon className="w-4 h-4" weight="bold" /> {savedLabel}
            </>
          ) : (
            <>
              <FloppyDiskIcon className="w-4 h-4" /> {saving ? savingLabel : saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
