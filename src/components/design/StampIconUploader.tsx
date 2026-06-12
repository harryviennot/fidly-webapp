"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Spinner, X, ArrowsClockwise } from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { uploadStampIcon, deleteStampIcon } from "@/api";
import type { ProcessedIconAsset } from "@/types";
import { cn } from "@/lib/utils";

interface StampIconUploaderProps {
  /** Currently uploaded asset for this slot, if any. */
  readonly asset: ProcessedIconAsset | null | undefined;
  /** Called with the server-processed asset after a successful upload. */
  readonly onUploaded: (asset: ProcessedIconAsset) => void;
  /** Called when the user removes the asset. Omit to hide the remove button. */
  readonly onRemove?: () => void;
  /** Whether the next upload requests server-side background removal. */
  readonly removeBg: boolean;
  /** Saved design id — uploads are processed and stored per-design. */
  readonly designId: string;
  /** Tile size in px (default 64). */
  readonly size?: number;
  /** Accessible label for the empty tile. */
  readonly label?: string;
}

/**
 * Square upload tile for custom stamp icons.
 *
 * Unlike ImageUploader (deferred blob preview + crop), this uploads
 * IMMEDIATELY on file pick: the preview needs the server-processed output
 * (background removal, trim, derived empty variants), and the returned
 * URLs are exactly what the strip generator will composite. An uploaded
 * but never-saved asset is inert and gets swept by the backend later.
 */
export function StampIconUploader({
  asset,
  onUploaded,
  onRemove,
  removeBg,
  designId,
  size = 64,
  label,
}: StampIconUploaderProps) {
  const t = useTranslations("designEditor.customStamps");
  const { currentBusiness } = useBusiness();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!currentBusiness?.id) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadStampIcon(currentBusiness.id, designId, file, removeBg);
      onUploaded(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (asset && currentBusiness?.id) {
      // Best-effort eager cleanup; the save-time GC is the real one.
      void deleteStampIcon(currentBusiness.id, designId, asset.id);
    }
    onRemove?.();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={label ?? t("uploadLabel")}
          title={asset ? t("replace") : (label ?? t("uploadLabel"))}
          className={cn(
            "w-full h-full rounded-xl border flex items-center justify-center overflow-hidden transition-colors",
            asset
              ? "border-border bg-[repeating-conic-gradient(#f3f3f1_0%_25%,#ffffff_0%_50%)] bg-[length:12px_12px]"
              : "border-dashed border-border bg-muted/40 hover:bg-muted text-muted-foreground"
          )}
        >
          {uploading ? (
            <Spinner className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : asset ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.processed_url}
                alt=""
                className="w-full h-full object-contain p-1"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 opacity-0 hover:opacity-100 transition-opacity">
                <ArrowsClockwise className="w-4 h-4 text-white" weight="bold" />
              </span>
            </>
          ) : (
            <Plus className="w-5 h-5" weight="bold" />
          )}
        </button>

        {asset && onRemove && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label={t("remove")}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            <X className="w-3 h-3" weight="bold" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive max-w-[180px]">{error}</p>
      )}
    </div>
  );
}
