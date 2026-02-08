"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { CardDesign } from "@/types";
import {
  StampIconSvg,
  StampIconType,
} from "@/components/design/StampIconPicker";
import {
  computeCardColors,
  getInitials,
  calculateStampLayout,
} from "@/lib/card-utils";

// ============================================================================
// Types
// ============================================================================

export interface GoogleWalletCardProps {
  /** Card design configuration */
  design: Partial<CardDesign>;
  /** Number of filled stamps (default: 3 for preview) */
  stamps?: number;
  /** Override organization name from design */
  organizationName?: string;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function FakeQRCode({ size = 80 }: { size?: number }) {
  const modules = 21;
  const moduleSize = size / modules;

  const isFinderPattern = (row: number, col: number) => {
    if (row < 7 && col < 7) return true;
    if (row < 7 && col >= modules - 7) return true;
    if (row >= modules - 7 && col < 7) return true;
    return false;
  };

  const isFinderInner = (row: number, col: number) => {
    const checkInner = (
      r: number,
      c: number,
      startR: number,
      startC: number
    ) => {
      const relR = r - startR;
      const relC = c - startC;
      if (relR >= 1 && relR <= 5 && relC >= 1 && relC <= 5) {
        if (relR >= 2 && relR <= 4 && relC >= 2 && relC <= 4) {
          return "black";
        }
        return "white";
      }
      return "black";
    };

    if (row < 7 && col < 7) return checkInner(row, col, 0, 0);
    if (row < 7 && col >= modules - 7)
      return checkInner(row, col, 0, modules - 7);
    if (row >= modules - 7 && col < 7)
      return checkInner(row, col, modules - 7, 0);
    return null;
  };

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  const getModuleColor = (row: number, col: number) => {
    if (row === 6 && col >= 8 && col <= modules - 9) {
      return col % 2 === 0 ? "#000" : "#fff";
    }
    if (col === 6 && row >= 8 && row <= modules - 9) {
      return row % 2 === 0 ? "#000" : "#fff";
    }

    if (isFinderPattern(row, col)) {
      const inner = isFinderInner(row, col);
      return inner === "white" ? "#fff" : "#000";
    }

    if (
      (row === 7 && col < 8) ||
      (col === 7 && row < 8) ||
      (row === 7 && col >= modules - 8) ||
      (col === modules - 8 && row < 8) ||
      (row === modules - 8 && col < 8) ||
      (col === 7 && row >= modules - 8)
    ) {
      return "#fff";
    }

    const seed = row * modules + col;
    return seededRandom(seed) > 0.5 ? "#000" : "#fff";
  };

  const rects = [];
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const color = getModuleColor(row, col);
      if (color === "#000") {
        rects.push(
          <rect
            key={`${row}-${col}`}
            x={col * moduleSize}
            y={row * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill="#000"
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#fff" />
      {rects}
    </svg>
  );
}

// Stamp grid for Google Wallet hero image area
function GoogleStampGrid({
  totalStamps,
  filledCount,
  colors,
  stampIcon,
  rewardIcon,
  containerWidth,
  containerHeight,
}: {
  totalStamps: number;
  filledCount: number;
  colors: ReturnType<typeof computeCardColors>;
  stampIcon: StampIconType;
  rewardIcon: StampIconType;
  containerWidth: number;
  containerHeight: number;
}) {
  const layout = useMemo(() => {
    return calculateStampLayout(
      totalStamps,
      containerWidth,
      containerHeight,
      8,
      11
    );
  }, [totalStamps, containerWidth, containerHeight]);

  const iconSize = Math.max(layout.radius * 1.2, 12);

  return (
    <div className="relative w-full" style={{ height: containerHeight }}>
      {layout.positions.map((pos) => {
        const isFilled = pos.globalIndex < filledCount;
        const isLast = pos.globalIndex === totalStamps - 1;

        return (
          <div
            key={`stamp-${pos.globalIndex}`}
            className="absolute flex items-center justify-center rounded-full transition-all duration-300"
            style={{
              width: layout.diameter,
              height: layout.diameter,
              left: pos.centerX - pos.radius,
              top: pos.centerY - pos.radius,
              backgroundColor: isFilled ? colors.accentHex : colors.emptyStampBg,
              border: isFilled ? "none" : `1px solid ${colors.emptyStampBorder}`,
              boxShadow: isFilled ? `0 4px 12px ${colors.accentHex}40` : "none",
            }}
          >
            {isFilled && (
              <div style={{ width: iconSize, height: iconSize }}>
                <StampIconSvg
                  icon={isLast ? rewardIcon : stampIcon}
                  className="w-full h-full"
                  color={colors.iconColorHex}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Google Wallet Card Preview
 *
 * Google Wallet uses a single scrollable layout instead of Apple's two-sided card.
 * Key differences:
 * - Header with logo and program name at top
 * - Hero image (stamp strip equivalent) prominently displayed
 * - Loyalty points shown as a large number
 * - Text modules for additional info
 * - QR code at bottom
 * - Single continuous scroll, no flip
 */
export function GoogleWalletCard({
  design,
  stamps = 3,
  organizationName,
  className = "",
}: GoogleWalletCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heroWidth, setHeroWidth] = useState(0);

  const displayName =
    organizationName || design.organization_name || "Your Business";
  const initials = getInitials(displayName);
  const totalStamps = design.total_stamps ?? 10;
  const colors = computeCardColors(design);

  const stampIcon = (design.stamp_icon || "checkmark") as StampIconType;
  const rewardIcon = (design.reward_icon || "gift") as StampIconType;

  const secondaryFields = design.secondary_fields || [];

  // Hero image aspect ratio (Google recommends 1032x336)
  const HERO_ASPECT_RATIO = 1032 / 336;
  const heroHeight = heroWidth / HERO_ASPECT_RATIO;

  useEffect(() => {
    if (containerRef.current) {
      const updateWidth = () => {
        if (containerRef.current) {
          setHeroWidth(containerRef.current.offsetWidth);
        }
      };

      const resizeObserver = new ResizeObserver(updateWidth);
      resizeObserver.observe(containerRef.current);
      updateWidth();

      return () => resizeObserver.disconnect();
    }
  }, []);

  const auxiliaryFields = design.auxiliary_fields || [];

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colors.bgGradientFrom}, ${colors.bgGradientTo})`,
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      {/* Header Section - Round Logo + Business Name */}
      <div className="px-4 py-4 flex items-center gap-3">
        {design.logo_url ? (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: colors.accentHex }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.logo_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.accentHex }}
          >
            <span className="text-white font-bold text-base">{initials}</span>
          </div>
        )}
        <h3
          className="font-medium text-base"
          style={{ color: colors.textColor }}
        >
          {displayName}
        </h3>
      </div>

      {/* Header Title - Description (Large) */}
      <div className="px-4 pb-3">
        <h2
          className="text-3xl font-medium text-wrap"
          style={{ color: colors.textColor }}
        >
          {design.description || "Loyalty Card"}
        </h2>
      </div>

      {/* Stamps Row */}
      <div className="px-4 py-2">
        <p
          className="text-xs uppercase tracking-wider font-medium mb-1"
          style={{ color: colors.mutedTextColor }}
        >
          Stamps
        </p>
        <p
          className="text-base font-normal"
          style={{ color: colors.textColor }}
        >
          {stamps} / {totalStamps}
        </p>
      </div>

      {/* Secondary Fields Row - 2 Column Grid */}
      {secondaryFields.length > 0 && (
        <div
          className="px-4 py-3 grid grid-cols-2 gap-4"
          style={{ borderColor: `${colors.textColor}15` }}
        >
          {secondaryFields.slice(0, 4).map((field, i) => (
            <div key={field.key || i}>
              <p
                className="text-xs uppercase tracking-wider font-medium mb-0.5"
                style={{ color: colors.mutedTextColor }}
              >
                {field.label}
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: colors.textColor }}
              >
                {field.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Auxiliary Fields Row - 2 Column Grid */}
      {auxiliaryFields.length > 0 && (
        <div
          className="px-4 py-3 grid grid-cols-2 gap-4"
          style={{ borderColor: `${colors.textColor}15` }}
        >
          {auxiliaryFields.slice(0, 4).map((field, i) => (
            <div key={field.key || i}>
              <p
                className="text-xs uppercase tracking-wider font-medium mb-0.5"
                style={{ color: colors.mutedTextColor }}
              >
                {field.label}
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: colors.textColor }}
              >
                {field.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Section - Large, Centered */}
      <div
        className="px-4 pt-4 pb-2 flex flex-col items-center"
        style={{ borderColor: `${colors.textColor}15` }}
      >
        <div className="bg-white p-3 rounded-xl">
          <FakeQRCode size={120} />
        </div>
      </div>

      {/* Stamp Grid at Bottom */}
      <div
        className="relative pb-1"
        style={{ borderColor: `${colors.textColor}15` }}
      >
        {/* Strip background layer */}
        {design.strip_background_url && (
          <div className="absolute inset-0 overflow-hidden rounded-b-[28px]">
            <Image
              src={design.strip_background_url}
              alt=""
              fill
              className="object-cover opacity-30"
              unoptimized
            />
          </div>
        )}

        {/* Stamps */}
        <div className="relative">
          {heroWidth > 0 && (
            <GoogleStampGrid
              totalStamps={totalStamps}
              filledCount={stamps}
              colors={colors}
              stampIcon={stampIcon}
              rewardIcon={rewardIcon}
              containerWidth={heroWidth
              }
              containerHeight={heroHeight}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default GoogleWalletCard;
