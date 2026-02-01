'use client';

import { useState } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyIcon, CheckIcon, PencilIcon, Crown, WarningIcon } from '@phosphor-icons/react';

interface BusinessUrlSectionProps {
  embedded?: boolean;
}

export function BusinessUrlSection({ embedded = false }: BusinessUrlSectionProps) {
  const { currentBusiness } = useBusiness();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const isProPlan = currentBusiness?.subscription_tier === 'pro';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.stampeo.com';
  const fullUrl = `${baseUrl}/${currentBusiness?.url_slug || ''}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditClick = () => {
    setNewSlug(currentBusiness?.url_slug || '');
    setShowWarning(true);
  };

  const handleConfirmEdit = () => {
    setShowWarning(false);
    setIsEditing(true);
  };

  const handleSaveSlug = async () => {
    // TODO: Implement API call to update slug
    // await updateBusiness(currentBusiness.id, { url_slug: newSlug });
    // await refetch();
    setIsEditing(false);
  };

  const content = (
    <div className="space-y-4">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold">Business URL</h3>
          <p className="text-sm text-muted-foreground">
            This is the link your customers use to get their loyalty card
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label>Your loyalty card page</Label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-0 bg-muted rounded-lg overflow-hidden border">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted-foreground/5 border-r">
              {baseUrl.replace('https://', '').replace('http://', '')}/
            </span>
            {isEditing ? (
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="border-0 rounded-none focus-visible:ring-0 bg-transparent"
                placeholder="your-business"
              />
            ) : (
              <span className="px-3 py-2 text-sm font-medium flex-1">
                {currentBusiness?.url_slug || 'your-business'}
              </span>
            )}
          </div>
          {isEditing ? (
            <>
              <Button onClick={handleSaveSlug} size="sm">
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCopy} variant="outline" size="icon" className="shrink-0">
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
              {isProPlan && (
                <Button onClick={handleEditClick} variant="outline" size="icon" className="shrink-0">
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
        {!isProPlan && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Crown className="h-3 w-3 text-amber-500" />
            Upgrade to Pro to customize your URL
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {embedded ? (
        <div className="p-6">{content}</div>
      ) : (
        <Card id="business-url" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-lg">Business URL</CardTitle>
            <CardDescription>
              This is the link your customers use to get their loyalty card
            </CardDescription>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      )}

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarningIcon className="h-5 w-5 text-amber-500" />
              Change Business URL?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                Changing your URL will affect any existing QR codes you&apos;ve printed or shared.
              </p>
              <p>
                <strong>What happens:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Old QR codes will stop working</li>
                <li>You&apos;ll need to print new QR codes with the updated URL</li>
                <li>Existing customer passes will continue to work normally</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarning(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEdit}>
              I understand, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
