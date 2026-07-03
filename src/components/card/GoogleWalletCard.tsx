"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CardDesign, RewardTier } from "@/types";
import { StampIconType } from "@/components/design/StampIconPicker";
import { StampGrid } from "@/components/card/WalletCard";
import { PointsStrip } from "@/components/card/PointsStrip";
import { computeCardColors, rgbToHex, getInitials } from "@/lib/card-utils";

// ============================================================================
// Types
// ============================================================================

export interface GoogleWalletCardProps {
  /** Card design configuration */
  design: Partial<CardDesign>;
  /** Number of filled stamps (default: 3 for preview) */
  stamps?: number;
  /** Override total stamps from program (instead of design) */
  totalStamps?: number;
  /** Override organization name from design */
  organizationName?: string;
  /** Additional class names */
  className?: string;
  /** Show back view with details instead of front */
  showBack?: boolean;
  /** Points programs (design.card_type === 'points'): sample balance + ladder. */
  pointsBalance?: number;
  pointsRewards?: RewardTier[];
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
  totalStamps: totalStampsProp,
  organizationName,
  className = "",
  showBack = false,
  pointsBalance,
  pointsRewards,
}: GoogleWalletCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heroWidth, setHeroWidth] = useState(0);

  const t = useTranslations("designEditor.cardBack");
  const displayName =
    organizationName || design.organization_name || "Your Business";
  const initials = getInitials(displayName);
  const totalStamps = totalStampsProp ?? design.total_stamps ?? 10;
  const colors = computeCardColors(design);
  const isPoints = design.card_type === "points";
  const pointsAccent = design.progress_accent_color
    ? rgbToHex(design.progress_accent_color)
    : colors.accentHex;
  const stripBgHex = design.strip_background_color
    ? rgbToHex(design.strip_background_color)
    : colors.bgHex;

  const stampIcon = (design.stamp_icon || "checkmark") as StampIconType;
  const rewardIcon = (design.reward_icon || "gift") as StampIconType;
  const customConfig =
    design.stamp_icon_mode === "custom" ? design.custom_stamp_config : null;

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
  const backFields = design.back_fields || [];

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{
        backgroundColor: colors.bgHex,
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      {/* Header Section - Round Logo + Business Name */}
      <div className="px-4 py-4 flex items-center gap-3">
        {design.logo_url ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          // style={{ backgroundColor: colors.accentHex }}
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
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
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

      {showBack ? (
        /* Back view: details / back fields */
        backFields.length > 0 ? (
          <div className="px-4 py-3 space-y-3">
            <p
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: colors.mutedTextColor }}
            >
              Details
            </p>
            {backFields.map((field, i) => (
              <div key={field.key || i}>
                <p
                  className="text-xs tracking-wider font-medium mb-0.5"
                  style={{ color: colors.mutedTextColor }}
                >
                  {field.label
                    ? field.label.charAt(0).toUpperCase() + field.label.slice(1)
                    : field.label}
                </p>
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: colors.textColor }}
                >
                  {field.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: colors.mutedTextColor }}>{t("noBackFieldsAdded")}</p>
            <p className="text-xs mt-1" style={{ color: colors.mutedTextColor }}>{t("addFieldsHint")}</p>
          </div>
        )
      ) : (
        /* Front view */
        <>
          {/* Header Title - Description (Large) */}
          <div className="px-4 pb-3">
            <h2
              className="text-2xl font-light text-wrap"
              style={{ color: colors.textColor }}
            >
              {design.description || "Loyalty Card"}
            </h2>
          </div>

          {/* Stamps / Points Row */}
          <div className="px-4 py-2">
            <p
              className="text-xs uppercase font-medium mb-1"
              style={{ color: colors.mutedTextColor }}
            >
              {isPoints ? t("points") : t("stamps")}
            </p>
            <p
              className="text-sm font-normal"
              style={{ color: colors.textColor }}
            >
              {isPoints ? (pointsBalance ?? 0) : `${stamps} / ${totalStamps}`}
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
                    className="text-xs font-medium mb-0.5"
                    style={{ color: colors.mutedTextColor }}
                  >
                    {field.label
                      ? field.label.charAt(0).toUpperCase() + field.label.slice(1)
                      : field.label}
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
              <FakeQRCode size={100} />
            </div>
          </div>

          {/* Stamp Grid at Bottom */}
          <div
            className="relative pb-1"
            style={{
              borderColor: `${colors.textColor}15`,
              backgroundColor: isPoints ? stripBgHex : undefined,
            }}
          >
            {/* Strip background layer */}
            {design.strip_background_url && (
              <div className="absolute inset-0 overflow-hidden rounded-b-[28px]">
                <Image
                  src={design.strip_background_url}
                  alt=""
                  fill
                  className="object-cover"
                  style={{
                    // image_only shows the raw image edge-to-edge (no dimming).
                    opacity:
                      design.points_strip_style === "image_only"
                        ? 1
                        : (design.strip_background_opacity ?? 40) / 100,
                  }}
                  unoptimized
                />
              </div>
            )}

            {/* Stamps / points hero */}
            <div className="relative">
              {isPoints ? (
                <PointsStrip
                  style={design.points_strip_style ?? "big_point"}
                  balance={pointsBalance ?? 0}
                  rewards={pointsRewards ?? []}
                  rewardIcons={design.points_reward_icons}
                  accentColor={pointsAccent}
                  backgroundColor={stripBgHex}
                />
              ) : (
                heroWidth > 0 && (
                  <StampGrid
                    totalStamps={totalStamps}
                    filledCount={stamps}
                    colors={colors}
                    stampIcon={stampIcon}
                    rewardIcon={rewardIcon}
                    customConfig={customConfig}
                    containerWidth={heroWidth}
                    containerHeight={heroHeight}
                  />
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GoogleWalletCard;
