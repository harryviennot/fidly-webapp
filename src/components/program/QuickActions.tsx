'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  PencilIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useBusiness } from '@/contexts/business-context';
import { toast } from 'sonner';
import type { CardDesign } from '@/types';

interface QuickActionsProps {
  activeDesign: CardDesign | undefined;
}

export function QuickActions({ activeDesign }: QuickActionsProps) {
  const t = useTranslations('loyaltyProgram.overview');
  const { currentBusiness } = useBusiness();
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success(t('urlCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const actions = [
    ...(activeDesign
      ? [
          {
            key: 'edit',
            label: t('editDesign'),
            icon: <PencilIcon className="h-4 w-4" />,
            href: `/design/${activeDesign.id}`,
          },
        ]
      : []),
    {
      key: 'copy',
      label: t('copySignupUrl'),
      icon: copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <CopyIcon className="h-4 w-4" />,
      onClick: handleCopy,
    },
    {
      key: 'qr',
      label: t('downloadQr'),
      icon: <QrCodeIcon className="h-4 w-4" />,
      disabled: true,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t('quickActions')}
      </p>
      <div className="flex flex-col gap-2">
        {actions.map((action) =>
          'href' in action && action.href ? (
            <Button key={action.key} asChild variant="outline" size="sm" className="justify-start rounded-full">
              <Link href={action.href}>
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </Link>
            </Button>
          ) : (
            <Button
              key={action.key}
              variant="outline"
              size="sm"
              className="justify-start rounded-full"
              onClick={'onClick' in action ? action.onClick : undefined}
              disabled={'disabled' in action ? action.disabled : false}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
