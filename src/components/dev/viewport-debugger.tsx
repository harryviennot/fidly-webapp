"use client";

import { useEffect, useRef, useState } from "react";
import { CopyIcon, CheckIcon } from "@phosphor-icons/react";

const VIEWPORT_BREAKPOINTS = [
  { name: "sm", min: 640 },
  { name: "md", min: 768 },
  { name: "lg", min: 1024 },
  { name: "xl", min: 1280 },
  { name: "2xl", min: 1536 },
];

const CONTAINER_BREAKPOINTS = [
  { name: "@3xs", min: 256 },
  { name: "@2xs", min: 288 },
  { name: "@xs", min: 320 },
  { name: "@sm", min: 384 },
  { name: "@md", min: 448 },
  { name: "@lg", min: 512 },
  { name: "@xl", min: 576 },
  { name: "@2xl", min: 672 },
  { name: "@3xl", min: 768 },
  { name: "@4xl", min: 896 },
  { name: "@5xl", min: 1024 },
  { name: "@6xl", min: 1152 },
  { name: "@7xl", min: 1280 },
];

function activeBreakpoint(
  width: number,
  table: ReadonlyArray<{ name: string; min: number }>
) {
  let current = "base";
  for (const bp of table) {
    if (width >= bp.min) current = bp.name;
  }
  return current;
}

interface ViewportDebuggerProps {
  /** Optional label so multiple debuggers can coexist without confusion. */
  label?: string;
}

/**
 * Dev-only floating chip that prints the current viewport size, the nearest
 * @container parent's content width, and the active Tailwind / container
 * breakpoint at each. Mount it inside a `@container` element to also read
 * the container width — otherwise only the viewport readout is meaningful.
 *
 * Returns `null` in production so it can't accidentally ship to users.
 */
export function ViewportDebugger({ label }: ViewportDebuggerProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  // Lazy init from the window so we don't have to setState inside the effect
  // (purity rule). SSR-safe via the typeof guard.
  const [vw, setVw] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const [vh, setVh] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerHeight
  );
  const [cw, setCw] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleViewport = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", handleViewport);

    // ResizeObserver fires once on observe() with the current size, so we
    // don't need a manual setCw — that initial callback seeds the value
    // without violating the no-setState-in-effect rule.
    const parent = measureRef.current?.parentElement;
    let observer: ResizeObserver | null = null;
    if (parent) {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setCw(Math.round(entry.contentRect.width));
        }
      });
      observer.observe(parent);
    }

    return () => {
      window.removeEventListener("resize", handleViewport);
      observer?.disconnect();
    };
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  const vwBp = activeBreakpoint(vw, VIEWPORT_BREAKPOINTS);
  const cwBp = activeBreakpoint(cw, CONTAINER_BREAKPOINTS);

  const clipboardText = [
    label && `[${label}]`,
    `vw ${vw}×${vh} (${vwBp})`,
    cw > 0 && `cw ${cw} (${cwBp})`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be denied in non-HTTPS / iframe contexts. Silent
      // failure is fine for a dev affordance.
    }
  };

  return (
    <>
      {/* Hidden measure element — its parent's width is what we observe. */}
      <div ref={measureRef} className="hidden" aria-hidden />

      {/* Floating chip — fixed so it follows the viewport regardless of
          where it's mounted in the tree. */}
      <div
        className="fixed bottom-3 right-3 z-[100] flex flex-col gap-1 px-3 py-2 rounded-lg bg-black/85 text-white text-[11px] font-mono shadow-lg select-none backdrop-blur-sm"
        aria-hidden
      >
        <div className="flex items-center gap-2">
          {label && (
            <span className="text-[9px] uppercase tracking-wider text-white/60">
              {label}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="ml-auto rounded p-1 hover:bg-white/15 transition-colors text-white/70 hover:text-white"
            aria-label={copied ? "Copied" : "Copy viewport info"}
            title={copied ? "Copied" : "Copy viewport info"}
          >
            {copied ? (
              <CheckIcon className="h-3 w-3" weight="bold" />
            ) : (
              <CopyIcon className="h-3 w-3" weight="bold" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 w-5">vw</span>
          <span className="tabular-nums">
            {vw}
            <span className="text-white/40">×</span>
            {vh}
          </span>
          <span className="ml-auto px-1.5 py-0.5 rounded bg-white/15 text-[10px]">
            {vwBp}
          </span>
        </div>
        {cw > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-white/60 w-5">cw</span>
            <span className="tabular-nums">{cw}</span>
            <span className="ml-auto px-1.5 py-0.5 rounded bg-white/15 text-[10px]">
              {cwBp}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
