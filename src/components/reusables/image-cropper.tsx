'use client';

import { useCallback, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;

  title?: string;
  description?: string;
  filename?: string;
  applyLabel?: string;
  cancelLabel?: string;

  /** Fixed aspect ratio. When set, the slider is hidden and the crop is locked. */
  aspect?: number;
  /** Slider min (ignored when `aspect` is set). */
  minAspect?: number;
  /** Slider max (ignored when `aspect` is set). */
  maxAspect?: number;
  /** Slider starting value (ignored when `aspect` is set). */
  defaultAspect?: number;
  /** Optional labels shown under the slider ends. */
  aspectLabels?: { min: string; max: string };
  /**
   * Suppress the aspect-ratio slider UI while still clamping the dragged
   * crop to [minAspect, maxAspect]. Use when the corner handles are enough.
   */
  hideAspectSlider?: boolean;

  /**
   * Output sizing rules:
   * - Pass `outputHeight` to fix the height (width = height × aspect).
   * - Pass `outputWidth` to fix the width (height = width ÷ aspect).
   * - Pass neither to keep the raw source pixels of the crop (no downscale) —
   *   use this when you want to preserve the full upload quality.
   */
  outputHeight?: number;
  outputWidth?: number;

  minWidth?: number;
  minHeight?: number;
}

function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  aspect: number,
  outputWidth?: number,
  outputHeight?: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const srcW = crop.width * scaleX;
  const srcH = crop.height * scaleY;

  let outW: number;
  let outH: number;
  if (outputHeight) {
    outH = outputHeight;
    outW = Math.round(outH * aspect);
  } else if (outputWidth) {
    outW = outputWidth;
    outH = Math.round(outW / aspect);
  } else {
    outW = Math.round(srcW);
    outH = Math.round(srcH);
  }

  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    srcW,
    srcH,
    0,
    0,
    outW,
    outH
  );

  return canvas;
}

/**
 * Reusable image crop dialog built on `react-image-crop`.
 *
 * Two modes:
 * - Fixed aspect: pass `aspect={N}` — slider is hidden, crop locked.
 * - Variable aspect: pass `minAspect`/`maxAspect`/`defaultAspect` for a slider.
 *
 * Output sizing is controlled by `outputWidth` / `outputHeight`. Pass neither
 * to preserve the source pixel dimensions of the crop (full-quality original).
 */
export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  title = 'Crop image',
  description,
  filename = 'cropped.png',
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  aspect: fixedAspect,
  minAspect,
  maxAspect,
  defaultAspect,
  aspectLabels,
  hideAspectSlider = false,
  outputHeight,
  outputWidth,
  minWidth = 50,
  minHeight = 50,
}: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // Variable-aspect mode (clamps the drag to [minAspect, maxAspect]).
  const hasVariableAspect =
    fixedAspect === undefined &&
    minAspect !== undefined &&
    maxAspect !== undefined;
  // The slider UI is independent of the clamping — hide it when the caller
  // wants corner-drag-only.
  const showAspectSlider = hasVariableAspect && !hideAspectSlider;
  const initialSliderAspect =
    defaultAspect ?? (minAspect !== undefined && maxAspect !== undefined
      ? (minAspect + maxAspect) / 2
      : 1);
  const [sliderAspect, setSliderAspect] = useState<number>(initialSliderAspect);
  const aspect = fixedAspect ?? sliderAspect;

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;

      // Start with the largest crop the constraints allow. The previous 0.9
      // multiplier left a visible gap even when the whole image was usable;
      // here we go edge-to-edge whenever possible.
      let cropWidth: number;
      let cropHeight: number;

      if (fixedAspect !== undefined) {
        const sourceAspect = width / height;
        if (sourceAspect >= fixedAspect) {
          cropHeight = height;
          cropWidth = height * fixedAspect;
        } else {
          cropWidth = width;
          cropHeight = width / fixedAspect;
        }
      } else if (
        minAspect !== undefined &&
        maxAspect !== undefined
      ) {
        const sourceAspect = width / height;
        if (sourceAspect > maxAspect) {
          cropHeight = height;
          cropWidth = height * maxAspect;
        } else if (sourceAspect < minAspect) {
          cropWidth = width;
          cropHeight = width / minAspect;
        } else {
          cropWidth = width;
          cropHeight = height;
        }
        // Keep the slider value in sync with the actual crop so the clamp
        // logic doesn't immediately try to reshape it.
        const initialAspect = cropWidth / cropHeight;
        if (Math.abs(initialAspect - sliderAspect) > 0.01) {
          setSliderAspect(initialAspect);
        }
      } else {
        cropWidth = width;
        cropHeight = height;
      }

      setCrop({
        unit: 'px',
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    },
    // sliderAspect intentionally omitted — we only want to read its current
    // value on first load; re-running this on every slider tick would fight
    // the user's drags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixedAspect, minAspect, maxAspect]
  );

  const handleAspectChange = useCallback((newAspect: number) => {
    setSliderAspect(newAspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const cropHeight = Math.min(height * 0.9, (width * 0.9) / newAspect);
      const cropWidth = cropHeight * newAspect;
      setCrop({
        unit: 'px',
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current || !completedCrop) return;
    // In variable-aspect mode the user can drag freely, so the source
    // crop may have a different ratio than `aspect` (which tracks the
    // slider). Use the actual dragged ratio to keep the output faithful.
    const effectiveAspect =
      hasVariableAspect && completedCrop.width > 0 && completedCrop.height > 0
        ? completedCrop.width / completedCrop.height
        : aspect;
    const canvas = getCroppedCanvas(
      imgRef.current,
      completedCrop,
      effectiveAspect,
      outputWidth,
      outputHeight
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], filename, { type: 'image/png' });
      onCropComplete(file);
      onOpenChange(false);
    }, 'image/png');
  }, [
    completedCrop,
    aspect,
    hasVariableAspect,
    onCropComplete,
    onOpenChange,
    filename,
    outputHeight,
    outputWidth,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * Mobile-safe layout: a flex column capped at viewport height so the
       * footer buttons stay visible even on small phones. The scrollable
       * region is the image wrapper — if the crop area overflows, the
       * dialog itself never scrolls past the Apply/Cancel row.
       */}
      <DialogContent className="sm:max-w-lg flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center -mx-1 px-1">
          <ReactCrop
            crop={crop}
            onChange={(c) => {
              // In variable-aspect mode, clamp the crop live so the user
              // can't drag a ratio outside [minAspect, maxAspect]. We shrink
              // the long side whenever the requested shape exceeds a bound.
              if (
                hasVariableAspect &&
                minAspect !== undefined &&
                maxAspect !== undefined &&
                c.width > 0 &&
                c.height > 0
              ) {
                const ratio = c.width / c.height;
                let next = c;
                if (ratio > maxAspect) {
                  next = { ...c, width: c.height * maxAspect };
                } else if (ratio < minAspect) {
                  next = { ...c, height: c.width / minAspect };
                }
                setCrop(next);
                return;
              }
              setCrop(c);
            }}
            onComplete={(c) => {
              // Same clamping on the completed crop — react-image-crop hands
              // us the pixel crop that `handleConfirm` renders from, so we
              // must not store an out-of-range shape.
              let clamped = c;
              if (
                hasVariableAspect &&
                minAspect !== undefined &&
                maxAspect !== undefined &&
                c.width > 0 &&
                c.height > 0
              ) {
                const ratio = c.width / c.height;
                if (ratio > maxAspect) {
                  clamped = { ...c, width: c.height * maxAspect };
                } else if (ratio < minAspect) {
                  clamped = { ...c, height: c.width / minAspect };
                }
                const nextAspect = clamped.width / clamped.height;
                if (Math.abs(nextAspect - sliderAspect) > 0.01) {
                  setSliderAspect(nextAspect);
                }
              }
              setCompletedCrop(clamped);
            }}
            // Fixed-aspect mode locks the ratio. Variable-aspect mode lets
            // users drag freely so resizing also reshapes the crop.
            aspect={hasVariableAspect ? undefined : aspect}
            minWidth={minWidth}
            minHeight={minHeight}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[45vh] sm:max-h-[55vh] max-w-full w-auto h-auto object-contain"
            />
          </ReactCrop>
        </div>

        {showAspectSlider && minAspect !== undefined && maxAspect !== undefined && (
          <div className="space-y-2 px-1 shrink-0">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">
                Aspect Ratio
              </Label>
              <span className="text-sm font-medium tabular-nums">
                {sliderAspect.toFixed(1)}:1
              </span>
            </div>
            <input
              type="range"
              className="styled-slider w-full"
              min={minAspect * 100}
              max={maxAspect * 100}
              value={sliderAspect * 100}
              onChange={(e) =>
                handleAspectChange(parseInt(e.target.value) / 100)
              }
            />
            {aspectLabels && (
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{aspectLabels.min}</span>
                <span>{aspectLabels.max}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            className="rounded-full"
            onClick={handleConfirm}
            disabled={!completedCrop}
          >
            {applyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
