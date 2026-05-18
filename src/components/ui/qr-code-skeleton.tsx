'use client';

import { cn } from '@/lib/utils';

const QR_PATTERN = [
  [1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 1, 0, 0, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1],
  [0, 1, 0, 0, 1, 1, 0, 0, 0],
  [1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 1, 1, 0, 1, 1, 0, 1],
  [1, 1, 1, 0, 0, 0, 1, 1, 1],
];

interface QRCodeSkeletonProps {
  /** Outer size in px. Squares + gaps auto-size to fit. */
  size?: number;
  className?: string;
}

/**
 * QR-shaped loading skeleton — mirrors the scanner-app's animation so the
 * loading state feels consistent between the wallet-pass install flow on
 * web and the stamp scan flow on mobile. Each square pulses with a wave
 * delay seeded by its diagonal, producing the diagonal sweep.
 */
export function QRCodeSkeleton({ size = 200, className }: QRCodeSkeletonProps) {
  // 9 squares + 8 gaps; gap is ~37.5% of the square so the proportions
  // match the scanner-app values (square 16px, gap 6px at size=200).
  const square = size / 13.2;
  const gap = square * 0.375;

  return (
    <div
      className={cn('inline-flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size, gap }}
      aria-hidden
    >
      {QR_PATTERN.map((row, rowIndex) => (
        <div key={rowIndex} className="flex" style={{ gap }}>
          {row.map((visible, colIndex) =>
            visible ? (
              <span
                key={colIndex}
                className="qr-skeleton-cell"
                style={{
                  width: square,
                  height: square,
                  animationDelay: `${(rowIndex + colIndex) * 60}ms`,
                }}
              />
            ) : (
              <span
                key={colIndex}
                style={{ width: square, height: square }}
              />
            )
          )}
        </div>
      ))}
    </div>
  );
}
