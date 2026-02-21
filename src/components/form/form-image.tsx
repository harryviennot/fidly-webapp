'use client';

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface FormFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
  hint?: string;
  labelClassName?: string;
}

function FormField({ label, error, hint, id, labelClassName, ...inputProps }: FormFieldProps) {
  const autoId = React.useId();
  const fieldId = id || autoId;

  return (
    <div className="space-y-4">
      <Label htmlFor={fieldId} className={labelClassName}>{label}</Label>
      <Input id={fieldId} aria-invalid={!!error} {...inputProps} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { FormField }

import { useRef, useState } from 'react';
import Image from 'next/image';
import { LogoCropper } from './LogoCropper';

interface ImageUploaderProps {
  label: string;
  value?: string;
  onUpload: (file: File) => Promise<void>;
  onClear?: () => void;
  accept?: string;
  hint?: string;
  /** When true, opens a crop dialog before uploading */
  enableCrop?: boolean;
}

export default function FormImage({
  label,
  value,
  onUpload,
  onClear,
  accept = 'image/png',
  hint,
  enableCrop = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
      const url = URL.createObjectURL(file);
      setCropSrc(url);
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = '';
    } else {
      await processUpload(file);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    await processUpload(croppedFile);
  };

  const handleCropClose = (open: boolean) => {
    if (!open && cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  };

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
      {label && <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">{label}</label>}

      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt={label || 'Uploaded image'}
            width={160}
            height={50}
            className="max-w-40 h-auto object-contain rounded-xl border border-[var(--border)]"
            unoptimized
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleClick}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
            >
              Change
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {fileInput}
        </div>
      ) : (
        <div
          className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={handleClick}
        >
          {isUploading ? (
            <span className="text-sm text-[var(--muted-foreground)]">Uploading...</span>
          ) : (
            <>
              <span className="text-2xl text-[var(--muted-foreground)] mb-1">+</span>
              <span className="text-sm text-[var(--muted-foreground)]">Click to upload</span>
              {hint && <span className="text-xs text-[var(--muted-foreground)] mt-1">{hint}</span>}
            </>
          )}
          {fileInput}
        </div>
      )}

      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

      {enableCrop && cropSrc && (
        <LogoCropper
          open={!!cropSrc}
          onOpenChange={handleCropClose}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
