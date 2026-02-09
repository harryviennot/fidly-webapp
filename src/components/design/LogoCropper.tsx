'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LogoCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
}

// Apple Wallet logo: max 160x50pt @3x = 480x150px
const OUTPUT_HEIGHT = 150;
const MAX_OUTPUT_WIDTH = 480;

function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Source dimensions in natural pixels
  const srcW = crop.width * scaleX;
  const srcH = crop.height * scaleY;

  // Scale to fixed OUTPUT_HEIGHT, maintaining aspect ratio
  let outH = OUTPUT_HEIGHT;
  let outW = Math.round((srcW / srcH) * outH);

  // Cap width at MAX_OUTPUT_WIDTH
  if (outW > MAX_OUTPUT_WIDTH) {
    outW = MAX_OUTPUT_WIDTH;
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

export function LogoCropper({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: LogoCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  // Store the locked crop height in display pixels
  const lockedHeightRef = useRef<number>(0);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    const displayScale = width / naturalWidth;

    // Locked height: OUTPUT_HEIGHT in natural px, converted to display px
    const lockedDisplayHeight = Math.min((OUTPUT_HEIGHT / naturalHeight) * height, height);
    lockedHeightRef.current = lockedDisplayHeight;

    // Default crop: full width (up to MAX_OUTPUT_WIDTH equivalent), locked height, centered
    const maxDisplayWidth = Math.min((MAX_OUTPUT_WIDTH / naturalWidth) * width, width);
    const cropWidth = maxDisplayWidth;

    setCrop({
      unit: 'px',
      x: (width - cropWidth) / 2,
      y: (height - lockedDisplayHeight) / 2,
      width: cropWidth,
      height: lockedDisplayHeight,
    });
  }, []);

  const handleCropChange = useCallback((c: Crop) => {
    if (lockedHeightRef.current > 0) {
      // Lock height — user can only adjust width and position
      c.height = lockedHeightRef.current;
    }
    setCrop(c);
  }, []);

  const handleCropComplete = useCallback((c: PixelCrop) => {
    if (lockedHeightRef.current > 0) {
      c.height = lockedHeightRef.current;
    }
    setCompletedCrop(c);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = getCroppedCanvas(imgRef.current, completedCrop);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'logo-cropped.png', { type: 'image/png' });
      onCropComplete(file);
      onOpenChange(false);
    }, 'image/png');
  }, [completedCrop, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Logo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adjust the width and position. Height is fixed to match Apple Wallet dimensions.
        </p>
        <div className="flex items-center justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={handleCropChange}
            onComplete={handleCropComplete}
            minWidth={50}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: '50vh', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!completedCrop}>
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
