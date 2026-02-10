'use client';

import { useTranslations } from 'next-intl';
import { CardDesign } from '@/types';
import {
  PencilIcon,
  ArrowsLeftRightIcon,
} from '@phosphor-icons/react';
import { WalletCard, CardWrapper } from '@/components/card';

interface ActiveCardWidgetProps {
  design: CardDesign | undefined;
  isProPlan: boolean;
}

export function ActiveCardWidget({ design, isProPlan }: ActiveCardWidgetProps) {
  const t = useTranslations('designEditor');

  return (
    <CardWrapper
      isEmpty={!design}
      emptyState={{
        title: t('noCardYet'),
        description: t('createFirst'),
        actionLabel: t('createCard'),
        actionHref: '/design/new',
      }}
      href={design ? `/design/${design.id}` : undefined}
      title={t('activeCard')}
      badge={{ label: t('live'), variant: 'success' }}
      showEditOverlay
      actions={
        design
          ? [
            {
              label: t('editDesign'),
              icon: <PencilIcon className="h-4 w-4" />,
              href: `/design/${design.id}`,
            },
            ...(isProPlan
              ? [
                {
                  label: t('switchCard'),
                  icon: <ArrowsLeftRightIcon className="h-4 w-4" />,
                  href: '/loyalty-program/templates',
                },
              ]
              : []),
          ]
          : undefined
      }
    >
      {design && (
        <WalletCard
          design={design}
          showQR={true}
          showSecondaryFields={true}
        />
      )}
    </CardWrapper>
  );
}
