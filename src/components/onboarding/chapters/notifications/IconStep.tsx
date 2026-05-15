'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Warning, Plus, Crop } from '@phosphor-icons/react';
import { MessagePreview } from '@/components/notifications/MessagePreview';
import { ImageCropper } from '@/components/reusables/image-cropper';
import { useBusiness } from '@/contexts/business-context';
import {
  useUploadBusinessIcon,
  useDeleteBusinessIcon,
} from '@/hooks/use-notifications';
import { cropToAspect, getImageAspect } from '@/lib/image-crop';
import { useWizardStep } from '../../wizard-context';

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/jpg,image/webp';

/**
 * Notification icon step — required.
 *
 *  - Logo is square (within 2%) → auto-upload as the icon. No friction.
 *  - Logo is off-square → show the logo as a cover-cropped placeholder + a
 *    warning banner. Continue is blocked until the owner crops or imports.
 *  - No logo → empty dropzone. Continue blocked until they upload.
 *
 * Layout follows the sketch the user provided:
 *
 *   Your Icon          Preview
 *   [ square box ]     [ notification banner ]
 *   [ Modifier ] [ Recadrer ] [ Supprimer ]
 *
 * Action buttons share the same style as the ImageUploader in the business
 * Identity step (first chapter), so the upload affordance is consistent
 * across the wizard.
 */
export function IconStep() {
  const t = useTranslations('onboardingBusiness.chapters.notifications.steps.icon');
  const tToast = useTranslations('notifications.toasts');
  const ctx = useWizardStep();
  const queryClient = useQueryClient();
  const { currentBusiness, refetch } = useBusiness();
  const uploadMutation = useUploadBusinessIcon(currentBusiness?.id);
  const deleteMutation = useDeleteBusinessIcon(currentBusiness?.id);

  const iconUrl = currentBusiness?.icon_url ?? null;
  const iconOriginalUrl = currentBusiness?.icon_original_url ?? null;
  const businessName = currentBusiness?.name ?? '';

  const [needsCropping, setNeedsCropping] = useState(false);
  // Kept around as a fallback source for the cropper if a future code path
  // needs to re-open the auto-cropped logo. Today the auto-crop completes
  // synchronously inside the effect and we never stash the raw blob.
  const [logoBlobUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Latest picked-but-not-yet-uploaded file URL, retained so the cropper
  // can reopen against it without re-reading the file.
  const pickedBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    ctx.setCanSkip(false);
  }, [ctx]);

  // Continue blocked until an icon is saved AND the off-square warning is gone.
  useEffect(() => {
    ctx.setCanProceed(!!iconUrl && !needsCropping);
  }, [ctx, iconUrl, needsCropping]);

  // First-visit prefill: center-crop the business logo to 1:1 and upload it
  // as the notification icon. No manual cropping step — the user can always
  // hit "Recadrer" if they want to fine-tune. Off-square logos get the
  // largest centred square; already-square logos pass through.
  //
  // We gate by `icon_url` (already set → user/server has an icon, don't
  // touch it) and by `aspectCheckedRef` (once per business per mount, so
  // remounts and React StrictMode double-effects don't re-upload). We
  // deliberately do NOT gate by step-seen — `_seen` is for "stop seeding
  // form defaults," and stale draft entries from prior onboarding sessions
  // would otherwise wedge this auto-upload off entirely.
  const aspectCheckedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBusiness) return;
    if (currentBusiness.icon_url) return;
    if (!currentBusiness.logo_url) return;
    if (aspectCheckedRef.current === currentBusiness.id) return;
    aspectCheckedRef.current = currentBusiness.id;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(currentBusiness.logo_url!, { cache: 'no-cache' });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        const aspect = await getImageAspect(blob);
        if (cancelled) return;
        if (Math.abs(aspect - 1) < 0.02) {
          // Already square — upload as-is.
          const file = new File([blob], 'icon-from-logo.png', {
            type: blob.type || 'image/png',
          });
          await uploadAndRefresh(file, { silent: true });
        } else {
          // Center-crop to 1:1 and upload silently. No warning, no manual
          // step — the largest centred square is a sensible default and
          // the user can always recrop from the action row.
          const cropped = await cropToAspect(blob, {
            aspect: 1,
            outputWidth: 512,
            filename: 'icon-from-logo.png',
            mimeType: blob.type || 'image/png',
          });
          if (cancelled) return;
          await uploadAndRefresh(cropped, { silent: true });
        }
      } catch {
        // CORS / network — owner can import manually.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, currentBusiness?.icon_url, currentBusiness?.logo_url]);

  // `refetchQueries` (unlike `invalidateQueries`) awaits the actual refetch, so
  // the next render sees the new `icon_url` and the `<Image>` remounts via
  // the `key={src}` below.
  const uploadAndRefresh = async (
    file: File,
    { silent = false }: { silent?: boolean } = {}
  ) => {
    try {
      await uploadMutation.mutateAsync(file);
      await queryClient.refetchQueries({ queryKey: ['business'] });
      await refetch();
      setNeedsCropping(false);
      if (!silent) toast.success(tToast('iconUploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('iconUploadFailed'));
      throw err;
    }
  };

  const handleRemove = async () => {
    try {
      await deleteMutation.mutateAsync();
      await queryClient.refetchQueries({ queryKey: ['business'] });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tToast('iconUploadFailed'));
    }
  };

  const handlePick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (pickedBlobUrlRef.current) URL.revokeObjectURL(pickedBlobUrlRef.current);
    const url = URL.createObjectURL(file);
    pickedBlobUrlRef.current = url;
    setCropSrc(url);
  };

  const handleOpenCrop = () => {
    // Priority order: a freshly picked file → the off-square logo blob →
    // the uploaded icon's original (for recropping). First match wins.
    const src =
      pickedBlobUrlRef.current ?? logoBlobUrl ?? iconOriginalUrl ?? iconUrl;
    if (src) setCropSrc(src);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropSrc(null);
    await uploadAndRefresh(croppedFile);
  };

  const handleCropClose = (open: boolean) => {
    if (!open) setCropSrc(null);
  };

  // Image source for the dropzone preview. After upload, prefer the
  // uncropped original so recrops have the full resolution to work with.
  const displayIconUrl = iconOriginalUrl || iconUrl;
  const previewSrc = displayIconUrl ?? logoBlobUrl ?? null;
  const canRemove = !!iconUrl;
  const canRecrop = !!previewSrc;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {needsCropping && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <Warning
            className="h-5 w-5 text-amber-600 shrink-0"
            weight="fill"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {t('cropWarning.title')}
            </p>
            <p className="text-xs text-amber-900/80 leading-snug mt-0.5">
              {t('cropWarning.body')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCrop}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
          >
            <Crop className="h-3.5 w-3.5" weight="bold" />
            {t('cropWarning.cta')}
          </button>
        </div>
      )}

      {/* Card matches the ImageUploader container in the business Identity
          step: same border, light surface, and padding. Wraps the column
          headers, dropzone + preview row, and the action buttons in one
          coherent panel. */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-4">
        {/* Two-column header — section labels aligned with the columns below. */}
        <div className="flex gap-3 sm:gap-4">
          <span className="w-[96px] shrink-0 text-[15px] font-medium text-[var(--foreground)]">
            {t('uploadSectionTitle')}
          </span>
          <span className="flex-1 text-[15px] font-medium text-[var(--foreground)]">
            {t('previewLabel')}
          </span>
        </div>

        {/* Two-column content — square icon dropzone next to preview banner.
            Preview uses `size="lg"` so it expands to fill the column instead
            of being pinned at iOS-realistic 280px. */}
        <div className="flex gap-3 sm:gap-4 items-start">
          <IconDropzone
            src={previewSrc}
            uploadLabel={t('uploadCta')}
            hintLabel={t('uploadHint')}
            onClick={handlePick}
          />
          <div className="flex-1 min-w-0">
            <MessagePreview
              iconUrl={iconUrl}
              iconOriginalUrl={iconOriginalUrl}
              businessName={businessName}
              body={t('previewBody')}
              size="lg"
            />
          </div>
        </div>

        {/* Action buttons — only when there's something to act on. Hidden in
            the totally-empty state where clicking the dropzone is the only
            interaction. Matches the button row used by ImageUploader in the
            business Identity step so the styling stays consistent across the
            wizard. */}
        {previewSrc && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePick}
              className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors min-h-[40px]"
            >
              {t('actions.change')}
            </button>
            {canRecrop && (
              <button
                type="button"
                onClick={handleOpenCrop}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--paper)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--paper-hover)] transition-colors min-h-[40px]"
              >
                {t('actions.recrop')}
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors min-h-[40px]"
              >
                {t('actions.remove')}
              </button>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      {cropSrc && (
        <ImageCropper
          open={!!cropSrc}
          onOpenChange={handleCropClose}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
          aspect={1}
          filename="icon-cropped.png"
          minWidth={87}
          minHeight={87}
        />
      )}
    </div>
  );
}

interface IconDropzoneProps {
  src: string | null;
  uploadLabel: string;
  hintLabel: string;
  onClick: () => void;
}

/**
 * Square 96px dropzone. Empty → dashed border + plus icon + CTA + hint
 * stacked inside the box. With an image → solid border, image fills via
 * object-cover, no hint inside (it'd overlap the icon).
 *
 * `key={src}` forces `<Image>` to remount when the URL changes, so newly
 * uploaded icons replace the prior one immediately (Next.js Image with
 * `unoptimized` would otherwise sometimes hold on to the previous src).
 */
function IconDropzone({ src, uploadLabel, hintLabel, onClick }: IconDropzoneProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square w-[96px] shrink-0 rounded-xl overflow-hidden transition-colors ${
        src
          ? 'border border-[var(--border)] bg-white hover:border-[var(--accent)]'
          : 'border-2 border-dashed border-[var(--border)] bg-white/50 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'
      }`}
    >
      {src ? (
        <Image
          key={src}
          src={src}
          alt=""
          width={96}
          height={96}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-2">
          <Plus
            className="h-5 w-5 text-[var(--muted-foreground)]"
            weight="bold"
          />
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] text-center leading-tight">
            {uploadLabel}
          </span>
          <span className="mt-auto text-[9px] text-[var(--muted-foreground)]/70 text-center leading-tight">
            {hintLabel}
          </span>
        </div>
      )}
    </button>
  );
}

