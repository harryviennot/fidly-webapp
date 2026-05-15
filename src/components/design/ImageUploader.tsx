'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ImageCropper,
  type ImageCropperProps,
} from '@/components/reusables/image-cropper';

type CropPropsPassthrough = Omit<
  ImageCropperProps,
  'open' | 'onOpenChange' | 'imageSrc' | 'onCropComplete'
>;

/**
 * Default crop configuration used when `enableCrop` is set without explicit
 * `cropProps`. Targets a card-design logo: variable aspect from 1:1 up to
 * 3.2:1, fixed output height (150px) so the wallet pass renders sharp. The
 * title + description come from the shared `imageCropper` namespace so the
 * whole cropper UI ships one cohesive set of strings.
 */
function buildLogoCropProps(t: ReturnType<typeof useTranslations>): CropPropsPassthrough {
  return {
    title: t('logoTitle'),
    description: t('logoDescription'),
    filename: 'logo-cropped.png',
    minAspect: 1,
    maxAspect: 3.2,
    outputHeight: 150,
    hideAspectSlider: true,
    minHeight: 30,
  };
}

interface ImageUploaderProps {
  label: string;
  value?: string;
  onUpload: (file: File) => Promise<void>;
  onClear?: () => void;
  accept?: string;
  hint?: string;
  /** When true, opens a crop dialog before uploading. */
  enableCrop?: boolean;
  /**
   * Optional crop configuration. When provided, overrides the default
   * logo-style crop (1:1 to 3.2:1, output height 150) — pass `aspect={1}`
   * for a square-locked crop (e.g. notification icon).
   */
  cropProps?: CropPropsPassthrough;
}

export default function ImageUploader({
  label,
  value,
  onUpload,
  onClear,
  accept = 'image/png',
  hint,
  enableCrop = false,
  cropProps,
}: ImageUploaderProps) {
  const t = useTranslations('designEditor.imageUploader');
  const tCropper = useTranslations('imageCropper');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Source URL currently fed to the cropper dialog. Null when the dialog is
  // closed.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // Blob URL of the *original* uploaded file (pre-crop). Kept around after the
  // first crop so "Adjust crop" can reopen the cropper with the full image
  // instead of the already-cropped result. Server-loaded `value` URLs aren't
  // tracked here — those fall back to the displayed `value` when recropping.
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const originalSrcRef = useRef<string | null>(null);

  useEffect(() => {
    originalSrcRef.current = originalSrc;
  }, [originalSrc]);

  // Clean up any retained blob URL on unmount so we don't leak object URLs
  // across hot reloads or long sessions.
  useEffect(() => {
    return () => {
      if (originalSrcRef.current) URL.revokeObjectURL(originalSrcRef.current);
    };
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const processUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (enableCrop) {
      // A fresh upload replaces any prior original.
      if (originalSrc) URL.revokeObjectURL(originalSrc);
      const url = URL.createObjectURL(file);
      setOriginalSrc(url);
      setCropSrc(url);
      if (inputRef.current) inputRef.current.value = '';
    } else {
      await processUpload(file);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    // Close the dialog but keep `originalSrc` alive — re-cropping should
    // start from the full original image, not the cropped result.
    setCropSrc(null);
    await processUpload(croppedFile);
  };

  const handleCropClose = (open: boolean) => {
    if (!open) setCropSrc(null);
  };

  const handleRecrop = () => {
    // Prefer the stored original; fall back to the displayed value for
    // images loaded from the server (where we never had a local blob).
    const src = originalSrc ?? value ?? null;
    if (src) setCropSrc(src);
  };

  const handleRemove = () => {
    if (originalSrc) URL.revokeObjectURL(originalSrc);
    setOriginalSrc(null);
    onClear?.();
  };

  const canRecrop = enableCrop && (originalSrc !== null || !!value);

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      onChange={handleChange}
      className="hidden"
    />
  );

  return (
    <div>
      {label && (
        <label className="wiz-body-sm font-medium text-[var(--foreground)] mb-3 block">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative w-full flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-white/50 dark:bg-white/5 p-4">
          <Image
            src={value}
            alt={label || 'Uploaded image'}
            width={240}
            height={120}
            className="max-h-[120px] w-auto max-w-full h-auto object-contain"
            unoptimized
          />
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={handleClick}
              className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors min-h-[40px]"
            >
              {t('change')}
            </button>
            {canRecrop && (
              <button
                type="button"
                onClick={handleRecrop}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--paper)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--paper-hover)] transition-colors min-h-[40px]"
              >
                {t('recrop')}
              </button>
            )}
            {onClear && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors min-h-[40px]"
              >
                {t('remove')}
              </button>
            )}
          </div>
          {fileInput}
        </div>
      ) : (
        <div
          className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] bg-white/50 dark:bg-white/5 rounded-xl cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={handleClick}
        >
          {isUploading ? (
            <span className="text-sm text-[var(--muted-foreground)]">
              {t('uploading')}
            </span>
          ) : (
            <>
              <span className="text-2xl text-[var(--muted-foreground)] mb-1">
                +
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">
                {t('clickToUpload')}
              </span>
              {hint && (
                <span className="text-xs text-[var(--muted-foreground)] mt-1">
                  {hint}
                </span>
              )}
            </>
          )}
          {fileInput}
        </div>
      )}

      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

      {enableCrop && cropSrc && (
        <ImageCropper
          open={!!cropSrc}
          onOpenChange={handleCropClose}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
          {...(cropProps ?? buildLogoCropProps(tCropper))}
        />
      )}
    </div>
  );
}
