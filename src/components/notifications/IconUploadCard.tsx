'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CaretRight, WarningIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { ImageUploader } from '@/components/design';
import { useBusiness } from '@/contexts/business-context';
import {
  useUploadBusinessIcon,
  useDeleteBusinessIcon,
} from '@/hooks/use-notifications';
import { MessagePreview } from './MessagePreview';

interface IconUploadCardProps {
  /** Compact preview without the upload control — used on the notifications page. */
  readOnly?: boolean;
}

/**
 * Business-level notification icon upload. Canonical location is the business
 * settings page (single source of truth). When rendered with `readOnly`, shows
 * a preview card with a "Change in settings" link — used on /program/notifications.
 *
 * Every tier can upload a custom icon — the feature is intentionally ungated.
 */
export function IconUploadCard({ readOnly = false }: Readonly<IconUploadCardProps>) {
  const t = useTranslations('notifications.icon');
  const tToast = useTranslations('notifications.toasts');
  const { currentBusiness, refetch } = useBusiness();
  const uploadMutation = useUploadBusinessIcon(currentBusiness?.id);
  const deleteMutation = useDeleteBusinessIcon(currentBusiness?.id);

  const iconUrl = currentBusiness?.icon_url ?? null;
  const iconOriginalUrl = currentBusiness?.icon_original_url ?? null;
  const displayIconUrl = iconOriginalUrl || iconUrl;
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

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
      <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
        {t('title')}
      </div>
      <div className="text-[12px] text-[#A0A0A0] mb-4">{t('description')}</div>

      {readOnly ? (
        <div className="flex items-center gap-4 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]">
          {displayIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayIconUrl}
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
              {iconUrl ? t('customHint') : t('defaultHint')}
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
        <>
          <div className="flex gap-6 flex-col sm:flex-row items-start">
            <div className="flex-1 min-w-0">
              <ImageUploader
                label={t('upload')}
                value={displayIconUrl ?? undefined}
                onUpload={handleUpload}
                onClear={iconUrl ? handleClear : undefined}
                accept="image/png"
                hint={t('uploadHint')}
                enableCrop
                cropProps={{
                  aspect: 1,
                  title: t('crop.title'),
                  description: t('crop.description'),
                  applyLabel: t('crop.apply'),
                  cancelLabel: t('crop.cancel'),
                  filename: 'icon-cropped.png',
                  minWidth: 87,
                  minHeight: 87,
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">
                {t('preview')}
              </span>
              <MessagePreview
                iconUrl={iconUrl}
                iconOriginalUrl={iconOriginalUrl}
                businessName={businessName}
                body="Stamp collected! You have 3 of 10 stamps."
              />
            </div>
          </div>

          {iconUrl && (
            <div className="mt-4 rounded-[10px] border border-amber-200/80 bg-amber-50/70 p-3">
              <div className="flex items-start gap-2">
                <WarningIcon
                  className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0"
                  weight="fill"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-amber-900 mb-0.5">
                    {t('cacheWarning.title')}
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-[1.45]">
                    {t('cacheWarning.body')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
