'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CheckCircleIcon,
  GearIcon,
  PaletteIcon,
  RocketLaunchIcon,
  BellIcon,
  UsersIcon,
  XIcon,
  ArrowRightIcon,
  CopyIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useBusiness } from '@/contexts/business-context';
import { toast } from 'sonner';
import type { LoyaltyProgram, CardDesign } from '@/types';

interface SetupChecklistProps {
  program: LoyaltyProgram | undefined;
  activeDesign: CardDesign | undefined;
  designs: CardDesign[];
  totalCustomers: number;
}

export function SetupChecklist({ program, activeDesign, designs, totalCustomers }: SetupChecklistProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const tProgram = useTranslations('loyaltyProgram');
  const { currentBusiness } = useBusiness();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

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
      key: 'configure',
      done: !!program?.name && !!program?.config?.total_stamps,
      icon: GearIcon,
      color: 'text-blue-600 bg-blue-100',
      doneColor: 'text-green-600 bg-green-100',
      title: t('steps.configureProgram'),
      description: t('steps.configureDescription'),
      cta: t('steps.configureCta'),
      href: '/program/settings',
    },
    {
      key: 'design',
      done: designs.length > 0,
      icon: PaletteIcon,
      color: 'text-violet-600 bg-violet-100',
      doneColor: 'text-green-600 bg-green-100',
      title: t('steps.createDesign'),
      description: t('steps.createDescription'),
      cta: t('steps.createCta'),
      href: '/design/new',
    },
    {
      key: 'activate',
      done: !!activeDesign,
      icon: RocketLaunchIcon,
      color: 'text-orange-600 bg-orange-100',
      doneColor: 'text-green-600 bg-green-100',
      title: t('steps.activateCard'),
      description: t('steps.activateDescription'),
      cta: t('steps.activateCta'),
      href: '/program/templates',
    },
    {
      key: 'notifications',
      done: false,
      icon: BellIcon,
      color: 'text-pink-600 bg-pink-100',
      doneColor: 'text-green-600 bg-green-100',
      title: t('steps.customizeNotifications'),
      description: t('steps.customizeDescription'),
      cta: t('steps.customizeCta'),
      href: '/program/notifications',
    },
    {
      key: 'customer',
      done: totalCustomers > 0,
      icon: UsersIcon,
      color: 'text-teal-600 bg-teal-100',
      doneColor: 'text-green-600 bg-green-100',
      title: t('steps.firstCustomer'),
      description: t('steps.firstCustomerDescription'),
      cta: t('steps.firstCustomerCta'),
      action: handleCopy,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progressPercent = (completedCount / steps.length) * 100;

  // Find first incomplete step to highlight
  const nextStepIndex = steps.findIndex((s) => !s.done);

  if (dismissed || allDone) return null;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-[var(--cream)] to-background overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">{t('setupChecklist')}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('setupSubtitle', { completed: completedCount, total: steps.length })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground -mt-1 -mr-1"
            onClick={() => setDismissed(true)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {completedCount}/{steps.length}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((step, index) => {
            const Icon = step.done ? CheckCircleIcon : step.icon;
            const isNext = index === nextStepIndex;
            const colorClass = step.done ? step.doneColor : step.color;

            return (
              <div
                key={step.key}
                className={`
                  relative rounded-lg border p-4 transition-all duration-200
                  ${step.done
                    ? 'bg-background/50 border-green-200/50'
                    : isNext
                      ? 'bg-background border-[var(--accent)]/30 shadow-sm ring-1 ring-[var(--accent)]/10'
                      : 'bg-background/50 border-border/50'
                  }
                `}
              >
                {/* Step number badge */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-4 h-4" weight={step.done ? 'fill' : 'duotone'} />
                  </div>
                  {isNext && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded-full">
                      Next
                    </span>
                  )}
                </div>

                {/* Content */}
                <h4 className={`text-sm font-medium mb-1 ${step.done ? 'text-muted-foreground' : ''}`}>
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                  {step.description}
                </p>

                {/* CTA */}
                {step.done ? (
                  <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" weight="fill" />
                    Done
                  </p>
                ) : step.action ? (
                  <Button
                    variant={isNext ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-full"
                    onClick={step.action}
                  >
                    {step.key === 'customer' && copied ? (
                      <CheckIcon className="w-3 h-3 mr-1" />
                    ) : step.key === 'customer' ? (
                      <CopyIcon className="w-3 h-3 mr-1" />
                    ) : null}
                    {step.cta}
                  </Button>
                ) : step.href ? (
                  <Button
                    asChild
                    variant={isNext ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-full"
                  >
                    <Link href={step.href}>
                      {step.cta}
                      <ArrowRightIcon className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
