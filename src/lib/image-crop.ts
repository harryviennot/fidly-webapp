/**
 * Canvas-based image cropping helpers.
 *
 * The interactive flow lives in `components/reusables/image-cropper.tsx`. This
 * module gives non-interactive callers (e.g. the wizard's notification-icon
 * prefill from the business logo) the same underlying canvas op so the output
 * format is identical.
 */

export interface CropToAspectOptions {
  /** Target aspect ratio (width / height). */
  aspect: number;
  /** If set, pin the output width and derive height from `aspect`. */
  outputWidth?: number;
  /** If set, pin the output height and derive width from `aspect`. */
  outputHeight?: number;
  /** Filename for the produced File. Defaults to `cropped.png`. */
  filename?: string;
  /** MIME type. Defaults to `image/png`. */
  mimeType?: string;
}

/**
 * Force high-quality resampling on a canvas context before an image is drawn.
 *
 * The 2D context defaults to `imageSmoothingQuality: 'low'`, so downscaling a
 * large logo to the crop's output size (e.g. 2000px → 150px) uses a cheap
 * filter and looks soft. High quality is a lossless win for any downscale.
 */
export function applyHighQualitySmoothing(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Allow drawing cross-origin images that have CORS headers set.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = src;
  });
}

function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(new File([blob], filename, { type: mimeType }));
      },
      mimeType,
      0.92
    );
  });
}

/**
 * Center-crop a blob to a target aspect ratio + size, returning a File.
 *
 * Cropping algorithm: the source rectangle is the largest centered rectangle
 * inside the source image whose ratio equals `aspect`. The output is then
 * scaled to `outputWidth`/`outputHeight` if either is given (the other side is
 * derived from `aspect`); otherwise the output keeps the source pixel size.
 */
export async function cropToAspect(
  blob: Blob,
  options: CropToAspectOptions
): Promise<File> {
  const {
    aspect,
    outputWidth,
    outputHeight,
    filename = 'cropped.png',
    mimeType = 'image/png',
  } = options;

  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    const sourceAspect = img.naturalWidth / img.naturalHeight;

    let srcW: number;
    let srcH: number;
    if (sourceAspect > aspect) {
      // Source is wider than target — keep height, shrink width.
      srcH = img.naturalHeight;
      srcW = Math.round(srcH * aspect);
    } else {
      // Source is taller than (or equal to) target — keep width, shrink height.
      srcW = img.naturalWidth;
      srcH = Math.round(srcW / aspect);
    }
    const srcX = Math.round((img.naturalWidth - srcW) / 2);
    const srcY = Math.round((img.naturalHeight - srcH) / 2);

    let outW: number;
    let outH: number;
    if (outputHeight) {
      outH = outputHeight;
      outW = Math.round(outH * aspect);
    } else if (outputWidth) {
      outW = outputWidth;
      outH = Math.round(outW / aspect);
    } else {
      outW = srcW;
      outH = srcH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    applyHighQualitySmoothing(ctx);

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    return await canvasToFile(canvas, filename, mimeType);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Fetch a remote image URL, then center-crop it. Convenience wrapper around
 * `cropToAspect` for the common "I have a `businesses.logo_url`" case.
 */
export async function cropUrlToAspect(
  url: string,
  options: CropToAspectOptions
): Promise<File> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  return cropToAspect(blob, options);
}

/**
 * Read an image's natural aspect ratio without rendering. Useful for deciding
 * whether to open the interactive cropper.
 */
export async function getImageAspect(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    return img.naturalWidth / img.naturalHeight;
  } finally {
    URL.revokeObjectURL(url);
  }
}
