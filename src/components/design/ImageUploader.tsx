'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  label: string;
  value?: string;
  onUpload: (file: File) => Promise<void>;
  onClear?: () => void;
  accept?: string;
  hint?: string;
}

export default function ImageUploader({
  label,
  value,
  onUpload,
  onClear,
  accept = 'image/png',
  hint,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}

      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt={label || 'Uploaded image'}
            width={96}
            height={96}
            className="w-24 h-24 object-cover rounded-xl border border-[var(--border)]"
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
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
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
        </div>
      )}

      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
