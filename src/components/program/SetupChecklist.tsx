'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  XIcon,
  CopyIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { StepIllustration } from './StepIllustration';
import Link from 'next/link';
import { useBusiness } from '@/contexts/business-context';
import { useUpdateBusiness } from '@/hooks/use-business-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LoyaltyProgram, CardDesign } from '@/types';

interface SetupChecklistProps {
  program: LoyaltyProgram | undefined;
  activeDesign: CardDesign | undefined;
  designs: CardDesign[];
  totalCustomers: number;
  delay?: number;
}

export function SetupChecklist({ program, activeDesign, designs, totalCustomers, delay = 0 }: SetupChecklistProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const tProgram = useTranslations('loyaltyProgram');
  const { currentBusiness } = useBusiness();
  const { mutate: doUpdateBusiness } = useUpdateBusiness(currentBusiness?.id);

  const [dismissed, setDismissed] = useState(
    currentBusiness?.settings?.setup_checklist_dismissed === true
  );
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);

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

  const handleDismiss = () => {
    setDismissed(true);
    if (currentBusiness?.id) {
      doUpdateBusiness({
        settings: {
          ...(currentBusiness.settings || {}),
          setup_checklist_dismissed: true,
        },
      });
    }
  };

  const handleSkip = (stepId: number) => {
    setSkippedSteps((prev) => [...prev, stepId]);
    setActiveStep(null); // reset so the next undone step is auto-selected
  };

  const steps = [
    {
      id: 1,
      optional: false,
      done: !!program?.config?.user_configured,
      title: t('steps.configureProgram'),
      description: t('steps.configureDescription'),
      cta: t('steps.configureCta'),
      href: '/program/settings',
      action: undefined as (() => void) | undefined,
    },
    {
      id: 2,
      optional: true,
      done: (currentBusiness?.settings?.business_info?.length ?? 0) > 0,
      title: t('steps.backFields'),
      description: t('steps.backFieldsDescription'),
      cta: t('steps.backFieldsCta'),
      href: '/settings',
      action: undefined as (() => void) | undefined,
    },
    {
      id: 3,
      optional: false,
      done: designs.length > 0 && currentBusiness?.settings?.design_reviewed === true,
      title: designs.length > 0 ? t('steps.reviewDesign') : t('steps.createDesign'),
      description: designs.length > 0 ? t('steps.reviewDescription') : t('steps.createDescription'),
      cta: designs.length > 0 ? t('steps.reviewCta') : t('steps.createCta'),
      href: designs.length > 0 ? `/design/${designs[0].id}` : '/design/new',
      action: undefined as (() => void) | undefined,
    },
    {
      id: 4,
      optional: false,
      done: !!activeDesign,
      title: t('steps.activateCard'),
      description: t('steps.activateDescription'),
      cta: t('steps.activateCta'),
      href: '/program/templates',
      action: undefined as (() => void) | undefined,
    },
    {
      id: 5,
      optional: false,
      done: totalCustomers > 0,
      title: t('steps.firstCustomer'),
      description: t('steps.firstCustomerDescription'),
      cta: t('steps.firstCustomerCta'),
      href: undefined as string | undefined,
      action: handleCopy,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = steps.filter((s) => !s.optional).every((s) => s.done);
  const progressPercent = (completedCount / steps.length) * 100;
  // Include optional steps in "next" flow unless explicitly skipped
  const nextStepIndex = steps.findIndex((s) => !s.done && !skippedSteps.includes(s.id));
  const selectedStep = activeStep ?? (nextStepIndex >= 0 ? steps[nextStepIndex].id : steps[0].id);
  const selectedStepData = steps.find((s) => s.id === selectedStep) ?? steps[0];
  const isSelectedCurrent = nextStepIndex >= 0 && steps[nextStepIndex].id === selectedStep;
  const isSelectedSkipped = skippedSteps.includes(selectedStep);

  if (dismissed || allDone) return null;

  // Shared button styles for the detail panel CTA
  const ctaClass = (isCurrent: boolean) => cn(
    'inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[8px] text-[12.5px] font-semibold transition-all duration-150 no-underline border-none cursor-pointer',
    isCurrent
      ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
      : 'bg-[var(--paper-hover)] text-[#555] hover:bg-[var(--border-light)]'
  );

  return (
    <div
      className="bg-[var(--card)] rounded-[14px] border border-[var(--border)] overflow-hidden relative animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top progress bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, var(--accent) ${progressPercent}%, var(--border) ${progressPercent}%)`,
        }}
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-3 min-[1080px]:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] min-[1080px]:text-[16px] font-bold text-[var(--foreground)]">
              {t('getStarted')}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
              {completedCount}/{steps.length}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#BBB] hover:text-[#888] p-1 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop: Fixed-height tile row */}
      <div className="hidden min-[1080px]:flex px-4 pb-1 gap-1">
        {steps.map((step) => {
          const isActive = step.id === selectedStep;
          const isCurrent = nextStepIndex >= 0 && steps[nextStepIndex].id === step.id;
          const isSkipped = skippedSteps.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                'flex-1 flex flex-col items-center px-2 py-3 rounded-xl cursor-pointer transition-all duration-200 border-[1.5px]',
                isActive
                  ? step.done
                    ? 'bg-[var(--accent-light)] border-[var(--accent-200)]'
                    : isCurrent
                      ? 'bg-[#FFFBF5] border-[#F0DFC0]'
                      : 'bg-[#FAFAFA] border-[var(--border)]'
                  : 'border-transparent hover:bg-[var(--paper-hover)]'
              )}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-[60px] h-[60px] flex items-center justify-center mb-1.5 transition-all duration-300',
                  !step.done && !isCurrent && 'opacity-50 scale-95 grayscale-[40%]'
                )}
              >
                <StepIllustration step={step.id} done={step.done} active={isCurrent} className="w-full h-full" />
              </div>
              <div className="text-center min-w-0 w-full">
                <div className="mb-1">
                  {step.done ? (
                    <span className="text-[10px] font-bold px-[7px] py-px rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
                      ✓ {t('steps.done')}
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-bold px-[7px] py-px rounded-lg bg-[var(--warning-light)] text-[var(--warning)]">
                      {t('steps.next')}
                    </span>
                  ) : isSkipped || step.optional ? (
                    <span className="text-[10px] font-semibold text-[#CCC]">{t('steps.optional')}</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#CCC]">{t('steps.stepN', { n: step.id })}</span>
                  )}
                </div>
                <div
                  className={cn(
                    'text-[12px] font-semibold leading-tight line-clamp-2',
                    step.done ? 'text-[var(--accent)]' : isCurrent ? 'text-[var(--foreground)]' : 'text-[#AAA]'
                  )}
                >
                  {step.title}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop: Detail panel */}
      <div className="hidden min-[1080px]:flex items-center justify-between gap-4 px-4 py-3 mx-4 mb-4 mt-1 rounded-xl bg-[#FAFAFA] border border-[var(--border)]">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-[var(--foreground)] mb-0.5 flex items-center gap-2">
            {selectedStepData.title}
            {selectedStepData.optional && (
              <span className="text-[10px] font-medium text-[#AAA] normal-case">{t('steps.optional')}</span>
            )}
          </p>
          <p className="text-[12px] text-[#7A7A7A] leading-[1.45]">
            {selectedStepData.description}
          </p>
        </div>
        {/* Right-side slot — always button-height so panel doesn't resize */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          {selectedStepData.done ? (
            <span className={cn(ctaClass(false), 'bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent-light)] cursor-default pointer-events-none')}>
              <CheckIcon className="w-3 h-3" weight="bold" /> {t('steps.completed')}
            </span>
          ) : selectedStepData.action ? (
            <button onClick={selectedStepData.action} className={ctaClass(isSelectedCurrent)}>
              {copied ? (
                <><CheckIcon className="w-3 h-3" /> Copied</>
              ) : (
                <><CopyIcon className="w-3 h-3" /> {selectedStepData.cta}</>
              )}
            </button>
          ) : selectedStepData.href ? (
            <Link href={selectedStepData.href} className={ctaClass(isSelectedCurrent)}>
              {selectedStepData.cta} →
            </Link>
          ) : null}
          {/* Skip link for optional steps that haven't been skipped yet */}
          {selectedStepData.optional && !isSelectedSkipped && !selectedStepData.done && (
            <button
              onClick={() => handleSkip(selectedStepData.id)}
              className="text-[11px] text-[#BBB] hover:text-[#888] cursor-pointer border-none bg-transparent transition-colors"
            >
              {t('steps.backFieldsSkip')}
            </button>
          )}
        </div>
      </div>

      {/* Mobile/Tablet: Vertical accordion */}
      <div className="flex flex-col gap-1 px-4 pb-4 min-[1080px]:hidden">
        {steps.map((step) => {
          const isActive = step.id === selectedStep;
          const isCurrent = nextStepIndex >= 0 && steps[nextStepIndex].id === step.id;
          const isSkipped = skippedSteps.includes(step.id);
          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                'flex items-center gap-3 rounded-[10px] cursor-pointer transition-all duration-200 px-3',
                isActive ? 'py-2.5' : 'py-2',
                isActive
                  ? step.done
                    ? 'bg-[var(--accent-light)] border-[1.5px] border-[var(--accent-200)]'
                    : isCurrent
                      ? 'bg-[#FFFBF5] border-[1.5px] border-[#F0DFC0]'
                      : 'bg-[#FAFAFA] border-[1.5px] border-[var(--border)]'
                  : 'border-[1.5px] border-transparent'
              )}
            >
              <div
                className={cn(
                  'flex-shrink-0 flex items-center justify-center transition-all duration-300',
                  isActive ? 'w-14 h-14' : 'w-11 h-11',
                  !step.done && !isCurrent && 'opacity-50 scale-95 grayscale-[40%]'
                )}
              >
                <StepIllustration step={step.id} done={step.done} active={isCurrent} className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-px flex-wrap">
                  <span
                    className={cn(
                      'text-[13px] font-semibold',
                      step.done ? 'text-[var(--accent)]' : isCurrent ? 'text-[var(--foreground)]' : 'text-[#AAA]'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.done && (
                    <span className="text-[9px] font-bold px-1.5 py-px rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">✓</span>
                  )}
                  {isCurrent && !step.done && (
                    <span className="text-[9px] font-bold px-1.5 py-px rounded-lg bg-[var(--warning-light)] text-[var(--warning)]">{t('steps.next')}</span>
                  )}
                  {!step.done && !isCurrent && (step.optional || isSkipped) && (
                    <span className="text-[9px] font-semibold text-[#CCC]">{t('steps.optional')}</span>
                  )}
                </div>
                {isActive && (
                  <div className="text-[11.5px] text-[#7A7A7A] leading-[1.4]">
                    {step.description}
                  </div>
                )}
              </div>

              {isActive && !step.done && (
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {step.action ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); step.action?.(); }}
                      className={cn(
                        'px-3.5 py-[7px] rounded-[7px] border-none text-[12px] font-semibold cursor-pointer',
                        isCurrent ? 'bg-[var(--accent)] text-white' : 'bg-[var(--paper-hover)] text-[#555]'
                      )}
                    >
                      {copied ? '✓' : step.cta}
                    </button>
                  ) : step.href ? (
                    <Link
                      href={step.href}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'px-3.5 py-[7px] rounded-[7px] text-[12px] font-semibold no-underline',
                        isCurrent ? 'bg-[var(--accent)] text-white' : 'bg-[var(--paper-hover)] text-[#555]'
                      )}
                    >
                      {step.cta} →
                    </Link>
                  ) : null}
                  {step.optional && !isSkipped && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSkip(step.id); }}
                      className="text-[10px] text-[#BBB] hover:text-[#888] border-none bg-transparent cursor-pointer transition-colors"
                    >
                      {t('steps.backFieldsSkip')}
                    </button>
                  )}
                </div>
              )}

              {isActive && step.done && (
                <span className="flex-shrink-0 text-[11px] text-[var(--accent)] font-medium">
                  {t('steps.completed')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
