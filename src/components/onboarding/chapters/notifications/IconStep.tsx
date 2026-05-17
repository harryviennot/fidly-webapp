'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, SpinnerGap } from '@phosphor-icons/react';
import { MessagePreview } from '@/components/notifications/MessagePreview';
import { ImageCropper } from '@/components/reusables/image-cropper';
import { useBusiness } from '@/contexts/business-context';
import {
  useUploadBusinessIcon,
  useDeleteBusinessIcon,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { useWizardStep } from '../../wizard-context';

// Any browser-decodable image is fair game. The cropper re-encodes to PNG
// via `canvas.toBlob('image/png')` and the backend's icon service runs the
// bytes through PIL anyway, so HEIC / GIF / SVG / AVIF (when supported by
// the browser) all land as a normalised RGBA PNG on storage.
const ACCEPTED_TYPES = 'image/*';

/**
 * Notification icon step — required.
 *
 * The owner picks a file, crops it to 1:1 in the shared `ImageCropper`,
 * and the cropped PNG is uploaded as the business's notification icon.
 * No auto-prefill from the business logo: the user has explicitly asked
 * for the upload to be deliberate, so the dropzone starts empty even
 * when a logo exists.
 *
 * UX notes:
 *  - Mobile (<640px) stacks "Your icon" above "Preview" so neither
 *    column gets squeezed. Desktop keeps the side-by-side layout.
 *  - Manual uploads show a pulsing dropzone the moment the user
 *    confirms the crop — the picked file's blob URL feeds the
 *    preview instantly, with `animate-pulse` running until the
 *    server roundtrip + refetch finish.
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

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // Blob URL of the freshly-cropped file, kept around for the brief window
  // between the cropper closing and the upload roundtrip completing so the
  // dropzone shows the new image instantly with a pulsing overlay (rather
  // than the previous icon or an empty box).
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Latest picked-but-not-yet-uploaded file URL, retained so the cropper
  // can reopen against it without re-reading the file.
  const pickedBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    ctx.setCanSkip(false);
  }, [ctx]);

  // Continue blocked until an icon is saved server-side.
  useEffect(() => {
    ctx.setCanProceed(!!iconUrl);
  }, [ctx, iconUrl]);

  const uploadAndRefresh = async (
    file: File,
    { silent = false }: { silent?: boolean } = {}
  ) => {
    try {
      await uploadMutation.mutateAsync(file);
      // `refetchQueries` (unlike `invalidateQueries`) awaits the actual
      // refetch, so the next render sees the new `icon_url` and the
      // `<Image>` remounts via the `key={src}` below.
      await queryClient.refetchQueries({ queryKey: ['business'] });
      await refetch();
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
    // Priority: freshly picked file → uploaded icon's original (for
    // recropping) → current icon URL. First match wins.
    const src = pickedBlobUrlRef.current ?? iconOriginalUrl ?? iconUrl;
    if (src) setCropSrc(src);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropSrc(null);
    // Show the cropped image immediately in the dropzone (with a pulse
    // animation while the upload roundtrip + refetch run). Revoking the
    // blob URL after the refetch finishes means the dropzone seamlessly
    // hands off to the server-rendered icon URL.
    const blob = URL.createObjectURL(croppedFile);
    setPendingPreviewUrl(blob);
    try {
      await uploadAndRefresh(croppedFile);
    } finally {
      URL.revokeObjectURL(blob);
      setPendingPreviewUrl(null);
    }
  };

  const handleCropClose = (open: boolean) => {
    if (!open) setCropSrc(null);
  };

  // Image source for the dropzone preview. After upload, prefer the
  // uncropped original so recrops have the full resolution to work with.
  const displayIconUrl = iconOriginalUrl || iconUrl;
  const previewSrc = pendingPreviewUrl ?? displayIconUrl ?? null;
  const isUploading = uploadMutation.isPending;
  const canRemove = !!iconUrl && !isUploading;
  const canRecrop = !!previewSrc && !isUploading;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="wiz-h font-semibold text-[var(--foreground)]">
          {t('title')}
        </h2>
        <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
      </header>

      {/* Card matches the ImageUploader container in the business Identity
          step: same border, light surface, padding. Mobile stacks icon on
          top of preview so neither column gets squeezed; desktop keeps the
          side-by-side layout. */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-4 sm:items-start">
          {/* Icon section */}
          <div className="flex flex-col gap-2 sm:w-[96px] sm:shrink-0">
            <span className="text-[15px] font-medium text-[var(--foreground)]">
              {t('uploadSectionTitle')}
              <span aria-hidden="true" className="ml-0.5 text-[var(--accent)]">
                *
              </span>
            </span>
            <IconDropzone
              src={previewSrc}
              uploadLabel={t('uploadCta')}
              hintLabel={t('uploadHint')}
              isLoading={isUploading}
              onClick={handlePick}
            />
          </div>

          {/* Preview section */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="text-[15px] font-medium text-[var(--foreground)]">
              {t('previewLabel')}
            </span>
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
            interaction. */}
        {previewSrc && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePick}
              disabled={isUploading}
              className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
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
  isLoading?: boolean;
  onClick: () => void;
}

/**
 * Square 96px dropzone. Empty → dashed border + plus icon + CTA + hint
 * stacked inside the box. With an image → solid border, image fills via
 * object-cover, no hint inside (it'd overlap the icon).
 *
 * When `isLoading` is true (server-side icon upload in flight) the
 * dropzone pulses and a translucent overlay with a spinning glyph sits
 * on top of the preview so the owner gets immediate "we're working on
 * it" feedback without losing sight of the cropped image.
 *
 * `key={src}` forces `<Image>` to remount when the URL changes, so newly
 * uploaded icons replace the prior one immediately (Next.js Image with
 * `unoptimized` would otherwise sometimes hold on to the previous src).
 */
function IconDropzone({
  src,
  uploadLabel,
  hintLabel,
  isLoading = false,
  onClick,
}: IconDropzoneProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'relative aspect-square w-[96px] shrink-0 rounded-xl overflow-hidden transition-colors',
        src
          ? 'border border-[var(--border)] bg-white hover:border-[var(--accent)]'
          : 'border-2 border-dashed border-[var(--border)] bg-white/50 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5',
        isLoading && 'animate-pulse cursor-progress'
      )}
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

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-[2px]">
          <SpinnerGap
            className="h-6 w-6 text-white animate-spin drop-shadow-md"
            weight="bold"
          />
        </div>
      )}
    </button>
  );
}
