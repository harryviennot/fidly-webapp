'use client';

import { ImageCropper } from '@/components/reusables/image-cropper';

interface LogoCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
}

/**
 * Card-design logo cropper — thin wrapper around the reusable `ImageCropper`
 * with Apple Wallet logo constraints baked in (aspect 1–3.2, output height 150).
 */
export function LogoCropper(props: LogoCropperProps) {
  return (
    <ImageCropper
      {...props}
      title="Crop Logo"
      description="Adjust the crop area and aspect ratio to fit your card design."
      filename="logo-cropped.png"
      applyLabel="Apply Crop"
      minAspect={1}
      maxAspect={3.2}
      defaultAspect={2}
      outputHeight={150}
      aspectLabels={{ min: 'Square', max: 'Wide' }}
      minHeight={30}
    />
  );
}
