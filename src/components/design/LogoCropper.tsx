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
import { Label } from '@/components/ui/label';

interface LogoCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
}

// Apple Wallet logo constraints — easy to update
const LOGO_MIN_ASPECT = 1;       // minimum width:height ratio (square)
const LOGO_MAX_ASPECT = 3.2;     // maximum width:height ratio (~480/150)
const LOGO_DEFAULT_ASPECT = 2;   // default crop aspect ratio
const OUTPUT_HEIGHT = 150;       // output height in px (Apple Wallet @3x)

function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  targetAspect: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const srcW = crop.width * scaleX;
  const srcH = crop.height * scaleY;

  const outH = OUTPUT_HEIGHT;
  const outW = Math.round(outH * targetAspect);

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
  const [aspect, setAspect] = useState(LOGO_DEFAULT_ASPECT);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    // Default crop: centered, respecting current aspect ratio
    const cropHeight = Math.min(height * 0.8, (width * 0.8) / aspect);
    const cropWidth = cropHeight * aspect;

    setCrop({
      unit: 'px',
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
  }, [aspect]);

  const handleAspectChange = useCallback((newAspect: number) => {
    setAspect(newAspect);
    // Re-center crop with new aspect ratio
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const cropHeight = Math.min(height * 0.8, (width * 0.8) / newAspect);
      const cropWidth = cropHeight * newAspect;
      const newCrop: Crop = {
        unit: 'px',
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      };
      setCrop(newCrop);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = getCroppedCanvas(imgRef.current, completedCrop, aspect);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'logo-cropped.png', { type: 'image/png' });
      onCropComplete(file);
      onOpenChange(false);
    }, 'image/png');
  }, [completedCrop, aspect, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Logo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adjust the crop area and aspect ratio to fit your card design.
        </p>
        <div className="flex items-center justify-center max-h-[50vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={50}
            minHeight={30}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: '45vh', maxWidth: '100%' }}
            />
          </ReactCrop>
        </div>

        {/* Aspect ratio slider */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Aspect Ratio</Label>
            <span className="text-sm font-medium tabular-nums">{aspect.toFixed(1)}:1</span>
          </div>
          <input
            type="range"
            className="styled-slider w-full"
            min={LOGO_MIN_ASPECT * 100}
            max={LOGO_MAX_ASPECT * 100}
            value={aspect * 100}
            onChange={(e) => handleAspectChange(parseInt(e.target.value) / 100)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Square</span>
            <span>Wide</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={handleConfirm} disabled={!completedCrop}>
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
