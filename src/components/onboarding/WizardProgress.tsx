'use client';

interface WizardProgressProps {
  chapterIndex: number;
  chapterCount: number;
  chapterTitle: string;
  subStepIndex?: number;
  subStepCount?: number;
  subStepTitle?: string;
}

/**
 * Top progress indicator for the launch wizard. Two-level layout so users see
 * both the high-level chapter and the local sub-step without feeling overwhelmed
 * by ~17 total sub-steps. The numeric counters are intentionally subtle.
 */
export function WizardProgress({
  chapterIndex,
  chapterCount,
  chapterTitle,
  subStepIndex,
  subStepCount,
  subStepTitle,
}: WizardProgressProps) {
  const hasSubSteps = typeof subStepIndex === 'number' && typeof subStepCount === 'number' && subStepCount > 1;
  // Progress percent across the whole wizard (chapters), with sub-step granularity inside the current chapter.
  const chapterProgress = chapterIndex / chapterCount;
  const subProgress = hasSubSteps ? (subStepIndex! + 1) / subStepCount! / chapterCount : 0;
  const percent = Math.min(100, Math.max(0, (chapterProgress + subProgress) * 100));

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      {/* Progress bar */}
      <div
        className="h-[3px] bg-[var(--accent)] transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
      <div className="px-4 py-3 min-[768px]:px-6 min-[768px]:py-4">
        <p className="wiz-helper font-medium uppercase tracking-wider text-[#999]">
          {`Chapter ${chapterIndex + 1} of ${chapterCount}`}
        </p>
        <h1 className="mt-1 wiz-h2 font-semibold leading-snug text-[var(--foreground)]">
          {chapterTitle}
        </h1>
        {hasSubSteps && subStepTitle ? (
          <p className="mt-1 wiz-helper text-[#7A7A7A] hidden min-[768px]:block">
            {`Step ${subStepIndex! + 1} of ${subStepCount} — ${subStepTitle}`}
          </p>
        ) : null}
      </div>
    </header>
  );
}
