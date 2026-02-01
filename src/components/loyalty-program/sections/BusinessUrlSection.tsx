'use client';

import { useState } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyIcon, CheckIcon, QrCodeIcon } from '@phosphor-icons/react';

interface BusinessUrlSectionProps {
  embedded?: boolean;
}

export function BusinessUrlSection({ embedded = false }: BusinessUrlSectionProps) {
  const { currentBusiness } = useBusiness();
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = (
    <div className="space-y-6">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold">Business URL</h3>
          <p className="text-sm text-muted-foreground">
            Share this link for customers to get your loyalty card
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Your signup link</p>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <CheckIcon className="h-4 w-4 text-green-600" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground break-all">{fullUrl}</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <QrCodeIcon className="h-4 w-4" />
          <span>QR code downloads are available in the scanner app</span>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <Card id="url" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-lg">Business URL</CardTitle>
        <CardDescription>
          Share this link for customers to get your loyalty card
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
