'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Animates its height whenever the content's natural height changes
 * (children mounting/unmounting, lists growing). Extracted from the
 * dashboard's RecentScans widget — use this for any expand/collapse
 * that should feel smooth instead of snapping.
 */
export function SmoothHeight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const prevHeight = useRef<number | 'auto'>('auto');
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const newH = entry.contentRect.height;
      if (prevHeight.current !== 'auto' && prevHeight.current !== newH) {
        setTransitioning(true);
      }
      prevHeight.current = newH;
      setHeight(newH);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'transition-[height] duration-300 ease-out',
        transitioning ? 'overflow-hidden' : 'overflow-visible',
        className
      )}
      style={{ height: height === 'auto' ? 'auto' : height }}
      onTransitionEnd={() => setTransitioning(false)}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}
