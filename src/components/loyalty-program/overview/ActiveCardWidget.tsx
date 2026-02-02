'use client';

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
  return (
    <CardWrapper
      isEmpty={!design}
      emptyState={{
        title: 'No card design yet',
        description: 'Create your first loyalty card.',
        actionLabel: 'Create Card',
        actionHref: '/design/new',
      }}
      href={design ? `/design/${design.id}` : undefined}
      title="Active Card"
      badge={{ label: 'Live', variant: 'success' }}
      showEditOverlay
      actions={
        design
          ? [
              {
                label: 'Edit Design',
                icon: <PencilIcon className="h-4 w-4" />,
                href: `/design/${design.id}`,
              },
              ...(isProPlan
                ? [
                    {
                      label: 'Switch Card',
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
          showQR={false}
          showSecondaryFields={false}
        />
      )}
    </CardWrapper>
  );
}
