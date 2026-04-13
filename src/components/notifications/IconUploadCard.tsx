'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CaretRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { ImageUploader } from '@/components/design';
import { useBusiness } from '@/contexts/business-context';
import {
  useUploadBusinessIcon,
  useDeleteBusinessIcon,
} from '@/hooks/use-notifications';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PlanGatedField } from './PlanGatedField';
import { MessagePreview } from './MessagePreview';

interface IconUploadCardProps {
  /** Compact preview without the upload control — used on the notifications page. */
  readOnly?: boolean;
}

/**
 * Business-level notification icon upload. Canonical location is the business
 * settings page (single source of truth). When rendered with `readOnly`, shows
 * a preview card with a "Change in settings" link — used on /program/notifications.
 */
export function IconUploadCard({ readOnly = false }: Readonly<IconUploadCardProps>) {
  const t = useTranslations('notifications.icon');
  const tToast = useTranslations('notifications.toasts');
  const { currentBusiness, refetch } = useBusiness();
  const { hasFeature } = useEntitlements();
  const uploadMutation = useUploadBusinessIcon(currentBusiness?.id);
  const deleteMutation = useDeleteBusinessIcon(currentBusiness?.id);

  const canCustomize = hasFeature('notifications.custom_icon');
  const iconUrl = currentBusiness?.icon_url ?? null;
  const businessName = currentBusiness?.name ?? '';

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
      await refetch();
      toast.success(tToast('iconUploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('iconUploadFailed'));
      throw err;
    }
  };

  const handleClear = async () => {
    try {
      await deleteMutation.mutateAsync();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('iconUploadFailed'));
    }
  };

  const content = (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
      <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
        {t('title')}
      </div>
      <div className="text-[12px] text-[#A0A0A0] mb-4">{t('description')}</div>

      {readOnly ? (
        <div className="flex items-center gap-4 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt={businessName}
              className="h-14 w-14 rounded-xl border border-[var(--border)] object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-[10px] text-[#A0A0A0] flex-shrink-0">
              {t('default')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#1A1A1A]">
              {iconUrl ? t('custom') : t('default')}
            </div>
            <div className="text-[11px] text-[#8A8A8A] mt-0.5">
              {t('description')}
            </div>
          </div>
          <Link
            href="/settings"
            className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline"
          >
            {t('changeInSettings')}
            <CaretRight className="h-3 w-3" weight="bold" />
          </Link>
        </div>
      ) : (
        <div className="flex gap-6 flex-col sm:flex-row items-start">
          <div className="flex-1 min-w-0">
            <ImageUploader
              label={t('upload')}
              value={iconUrl ?? undefined}
              onUpload={handleUpload}
              onClear={iconUrl ? handleClear : undefined}
              accept="image/png"
              hint={t('uploadHint')}
            />
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">
              {t('preview')}
            </span>
            <MessagePreview
              iconUrl={iconUrl}
              businessName={businessName}
              body="Stamp collected! You have 3 of 10 stamps."
            />
          </div>
        </div>
      )}
    </div>
  );

  if (canCustomize || readOnly) return content;

  return (
    <PlanGatedField requiredTier="growth" upgradeFrom="notifications.icon">
      {content}
    </PlanGatedField>
  );
}
