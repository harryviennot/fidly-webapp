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
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

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

  const steps = [
    {
      id: 1,
      done: !!program?.name && !!program?.config?.total_stamps,
      title: t('steps.configureProgram'),
      description: t('steps.configureDescription'),
      cta: t('steps.configureCta'),
      href: '/program/settings',
    },
    {
      id: 2,
      done: designs.length > 0,
      title: t('steps.createDesign'),
      description: t('steps.createDescription'),
      cta: t('steps.createCta'),
      href: '/design/new',
    },
    {
      id: 3,
      done: !!activeDesign,
      title: t('steps.activateCard'),
      description: t('steps.activateDescription'),
      cta: t('steps.activateCta'),
      href: '/program/templates',
    },
    {
      id: 4,
      done: false,
      title: t('steps.customizeNotifications'),
      description: t('steps.customizeDescription'),
      cta: t('steps.customizeCta'),
      href: '/program/notifications',
    },
    {
      id: 5,
      done: totalCustomers > 0,
      title: t('steps.firstCustomer'),
      description: t('steps.firstCustomerDescription'),
      cta: t('steps.firstCustomerCta'),
      action: handleCopy,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progressPercent = (completedCount / steps.length) * 100;
  const nextStepIndex = steps.findIndex((s) => !s.done);
  const selectedStep = activeStep ?? (nextStepIndex >= 0 ? steps[nextStepIndex].id : steps[0].id);

  if (dismissed || allDone) return null;

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
      <div className="px-4 pt-5 pb-3 min-[1080px]:px-6 min-[1080px]:pt-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] min-[1080px]:text-[17px] font-bold text-[#1A1A1A]">
              {t('getStarted')}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--success-light)] text-[var(--accent)]">
              {completedCount}/{steps.length}
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-[#BBB] hover:text-[#888] p-1 rounded-md transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop: Horizontal row */}
      <div className="hidden min-[1080px]:flex px-6 pb-5">
        {steps.map((step) => {
          const isActive = step.id === selectedStep;
          const isCurrent = nextStepIndex >= 0 && steps[nextStepIndex].id === step.id;
          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                'flex-1 flex flex-col items-center px-2 py-3 pb-4 rounded-xl cursor-pointer transition-all duration-200',
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
                  'flex-shrink-0 w-20 h-20 flex items-center justify-center mb-1 transition-all duration-300',
                  (!step.done && !isCurrent) && 'opacity-60 scale-95 grayscale-[30%]'
                )}
              >
                <StepIllustration step={step.id} done={step.done} active={isCurrent} className="w-full h-full" />
              </div>

              <div className="text-center min-w-0">
                {/* Status badge */}
                <div className="mb-1">
                  {step.done ? (
                    <span className="text-[10px] font-bold px-[7px] py-px rounded-lg bg-[var(--success-light)] text-[var(--accent)]">
                      ✓ Done
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-bold px-[7px] py-px rounded-lg bg-[var(--warning-light)] text-[var(--warning)]">
                      Next
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#CCC]">
                      Step {step.id}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div
                  className={cn(
                    'text-[12.5px] font-semibold mb-0.5',
                    step.done ? 'text-[var(--accent)]' : isCurrent ? 'text-[#1A1A1A]' : 'text-[#AAA]'
                  )}
                >
                  {step.title}
                </div>

                {/* Description (only when active) */}
                {isActive && (
                  <div className="text-[11px] text-[#8A8A8A] leading-[1.4] mb-2">
                    {step.description}
                  </div>
                )}

                {/* CTA button (only when active and not done) */}
                {isActive && !step.done && (
                  step.action ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); step.action?.(); }}
                      className={cn(
                        'px-[18px] py-[7px] rounded-[7px] border-none text-[12px] font-semibold cursor-pointer transition-all duration-150',
                        isCurrent
                          ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                          : 'bg-[var(--paper-hover)] text-[#555] hover:bg-[var(--background-subtle)]'
                      )}
                    >
                      {step.id === 5 && copied ? (
                        <span className="flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Copied</span>
                      ) : step.id === 5 ? (
                        <span className="flex items-center gap-1"><CopyIcon className="w-3 h-3" /> {step.cta}</span>
                      ) : (
                        <>{step.cta} →</>
                      )}
                    </button>
                  ) : step.href ? (
                    <Link
                      href={step.href}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-block px-[18px] py-[7px] rounded-[7px] text-[12px] font-semibold transition-all duration-150 no-underline',
                        isCurrent
                          ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                          : 'bg-[var(--paper-hover)] text-[#555] hover:bg-[var(--background-subtle)]'
                      )}
                    >
                      {step.cta} →
                    </Link>
                  ) : null
                )}

                {/* Completed label */}
                {isActive && step.done && (
                  <span className="text-[11px] text-[var(--accent-300)] font-medium">Completed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile/Tablet: Vertical accordion */}
      <div className="flex flex-col gap-1 px-4 pb-4 min-[1080px]:hidden">
        {steps.map((step) => {
          const isActive = step.id === selectedStep;
          const isCurrent = nextStepIndex >= 0 && steps[nextStepIndex].id === step.id;
          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                'flex items-center gap-3 rounded-[10px] cursor-pointer transition-all duration-200',
                isActive ? 'py-2.5 px-3' : 'py-2 px-3',
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
                  isActive ? 'w-16 h-16' : 'w-12 h-12',
                  (!step.done && !isCurrent) && 'opacity-60 scale-95 grayscale-[30%]'
                )}
              >
                <StepIllustration step={step.id} done={step.done} active={isCurrent} className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-px">
                  <span
                    className={cn(
                      'text-[13px] font-semibold',
                      step.done ? 'text-[var(--accent)]' : isCurrent ? 'text-[#1A1A1A]' : 'text-[#AAA]'
                    )}
                  >
                    {step.title}
                  </span>
                  {step.done && (
                    <span className="text-[9px] font-bold px-1.5 py-px rounded-lg bg-[var(--success-light)] text-[var(--accent)]">✓</span>
                  )}
                  {isCurrent && !step.done && (
                    <span className="text-[9px] font-bold px-1.5 py-px rounded-lg bg-[var(--warning-light)] text-[var(--warning)]">Next</span>
                  )}
                </div>
                {isActive && (
                  <div className="text-[11.5px] text-[#8A8A8A] leading-[1.4]">
                    {step.description}
                  </div>
                )}
              </div>

              {isActive && !step.done && (
                step.action ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); step.action?.(); }}
                    className={cn(
                      'flex-shrink-0 px-3.5 py-[7px] rounded-[7px] border-none text-[12px] font-semibold cursor-pointer',
                      isCurrent
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--paper-hover)] text-[#555]'
                    )}
                  >
                    {step.id === 5 && copied ? '✓' : step.cta}
                  </button>
                ) : step.href ? (
                  <Link
                    href={step.href}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'flex-shrink-0 px-3.5 py-[7px] rounded-[7px] text-[12px] font-semibold no-underline',
                      isCurrent
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--paper-hover)] text-[#555]'
                    )}
                  >
                    {step.cta} →
                  </Link>
                ) : null
              )}

              {isActive && step.done && (
                <span className="flex-shrink-0 text-[11px] text-[var(--accent-300)] font-medium">Completed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
