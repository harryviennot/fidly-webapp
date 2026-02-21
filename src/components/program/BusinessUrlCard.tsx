'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyIcon, CheckIcon, QrCodeIcon } from '@phosphor-icons/react';
import { useBusiness } from '@/contexts/business-context';
import { toast } from 'sonner';

export function BusinessUrlCard() {
  const t = useTranslations('loyaltyProgram');
  const { currentBusiness } = useBusiness();
  const [copied, setCopied] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || 'https://stampeo.app';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        // Fallback for non-secure contexts
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
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('businessUrl')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground break-all font-mono flex-1 min-w-0">
            {fullUrl}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="rounded-full flex-shrink-0"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-600" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <QrCodeIcon className="h-3.5 w-3.5" />
          <span>{t('qrCodeHint')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
