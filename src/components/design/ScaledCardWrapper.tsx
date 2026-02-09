'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';

interface ScaledCardWrapperProps {
  children: ReactNode;
  /** Width at which content is laid out (before scaling) */
  baseWidth?: number;
  /** Target visual width - if provided, scales content from baseWidth to targetWidth */
  targetWidth?: number;
  aspectRatio?: number;
  minScale?: number;
  /** When true, measures inner content height instead of using baseWidth * aspectRatio */
  dynamicHeight?: boolean;
}

export function ScaledCardWrapper({
  children,
  baseWidth = 280,
  targetWidth,
  aspectRatio = 1.282,
  minScale = 0.6,
  dynamicHeight = false,
}: ScaledCardWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const baseHeight = baseWidth * aspectRatio;

  // Observe container width for scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      const referenceWidth = targetWidth || baseWidth;
      const newScale = Math.max(minScale, width / referenceWidth) * (targetWidth ? targetWidth / baseWidth : 1);
      setScale(newScale);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [baseWidth, targetWidth, minScale]);

  // Observe inner content height for dynamicHeight mode
  useEffect(() => {
    if (!dynamicHeight) return;
    const inner = innerRef.current;
    if (!inner) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height;
      setMeasuredHeight(height);
    });

    observer.observe(inner);
    return () => observer.disconnect();
  }, [dynamicHeight]);

  const innerHeight = dynamicHeight ? undefined : baseHeight;
  const containerHeight = dynamicHeight
    ? (measuredHeight ?? baseHeight) * scale
    : baseHeight * scale;

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: containerHeight }}
    >
      <div
        ref={innerRef}
        style={{
          width: baseWidth,
          height: innerHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}
