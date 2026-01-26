'use client';

import { useRef, useState } from 'react';

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
    <div className="image-uploader">
      <label className="uploader-label">{label}</label>

      {value ? (
        <div className="image-preview">
          <img src={value} alt={label} />
          <div className="image-actions">
            <button type="button" onClick={handleClick} className="btn-change">
              Change
            </button>
            {onClear && (
              <button type="button" onClick={onClear} className="btn-remove-image">
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`upload-dropzone ${isUploading ? 'uploading' : ''}`}
          onClick={handleClick}
        >
          {isUploading ? (
            <span className="uploading-text">Uploading...</span>
          ) : (
            <>
              <span className="upload-icon">+</span>
              <span className="upload-text">Click to upload</span>
              {hint && <span className="upload-hint">{hint}</span>}
            </>
          )}
        </div>
      )}

      {error && <div className="upload-error">{error}</div>}

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
