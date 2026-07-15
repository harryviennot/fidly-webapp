"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CardDesign } from "@/types";
import { renderSamplePreview } from "@/lib/template-variables";
import { stampStripImageOpacity } from "@/lib/stamp-strip";
import { useVariablePreviewValues } from "@/hooks/use-variable-preview-values";
import {
  StampIconSvg,
  StampIconType,
} from "@/components/design/StampIconPicker";
import {
  computeCardColors,
  rgbToHex,
  getInitials,
  calculateStampLayout,
  calculateStaggeredStampLayout,
  customIconBoxSize,
  resolveStampIconUrl,
  defaultPointsSampleBalance,
  CUSTOM_GRID_VPAD_SCALE,
  OVERLAP_MAX_COUNT,
  STAGGERED_MAX_COUNT,
} from "@/lib/card-utils";
import { useBusiness } from "@/contexts/business-context";
import { useDefaultProgram } from "@/hooks/use-programs";
import { isPointsProgram } from "@/types";
import type { CustomStampArrangement, CustomStampConfig, RewardTier } from "@/types";
import { PointsStrip } from "./PointsStrip";

// ============================================================================
// Types
// ============================================================================

export interface WalletCardProps {
  /** Card design configuration */
  design: Partial<CardDesign>;
  /** Number of filled stamps (default: 3 for preview) */
  stamps?: number;
  /** Override total stamps from program (instead of design) */
  totalStamps?: number;
  /** Override organization name from design */
  organizationName?: string;
  /** Show QR code at bottom */
  showQR?: boolean;
  /** Show secondary fields section */
  showSecondaryFields?: boolean;
  /** Additional class names */
  className?: string;
  /** Points programs (design.card_type === 'points'): sample balance for the
   *  strip preview. */
  pointsBalance?: number;
  /** Points programs: the reward ladder, for the strip preview. */
  pointsRewards?: RewardTier[];
}

// ============================================================================
// Sub-components
// ============================================================================

interface StampGridProps {
  readonly totalStamps: number;
  readonly filledCount: number;
  readonly colors: ReturnType<typeof computeCardColors>;
  readonly stampIcon: StampIconType;
  readonly rewardIcon: StampIconType;
  readonly containerWidth: number;
  readonly containerHeight: number;
  /** Custom uploaded icons (STA-216). When set with at least one icon,
   *  slots render the processed PNGs instead of circles — exactly what the
   *  backend strip generator composites, so the preview cannot drift. */
  readonly customConfig?: CustomStampConfig | null;
}

const MIN_PADDING = 8; // 24/3, scaled for the ~375px preview container
const SIDE_PADDING = 11; // 32/3 ≈ 11

export function StampGrid({
  totalStamps,
  filledCount,
  colors,
  stampIcon,
  rewardIcon,
  containerWidth,
  containerHeight,
  customConfig,
}: StampGridProps) {
  const useCustom = !!customConfig && customConfig.icons.length > 0;
  // Mirror of the backend fallback: staggered carries 2..16 stamps,
  // overlap up to 24 (it gains a third depth level past 16)
  const wantedArrangement = useCustom ? customConfig.arrangement : "straight";
  const bandMax =
    wantedArrangement === "overlap" ? OVERLAP_MAX_COUNT : STAGGERED_MAX_COUNT;
  const arrangement: CustomStampArrangement =
    (wantedArrangement === "staggered" || wantedArrangement === "overlap") &&
    totalStamps >= 2 &&
    totalStamps <= bandMax
      ? wantedArrangement
      : "straight";

  // Calculate layout using the same algorithm as the backend
  const layout = useMemo(() => {
    if (arrangement === "staggered" || arrangement === "overlap") {
      return calculateStaggeredStampLayout(
        totalStamps,
        containerWidth,
        containerHeight,
        SIDE_PADDING,
        MIN_PADDING,
        arrangement === "overlap"
      );
    }
    return calculateStampLayout(
      totalStamps,
      containerWidth,
      containerHeight,
      MIN_PADDING,
      SIDE_PADDING,
      useCustom ? CUSTOM_GRID_VPAD_SCALE : 1
    );
  }, [arrangement, totalStamps, containerWidth, containerHeight, useCustom]);

  // Calculate icon size (60% of diameter, matching backend)
  const iconSize = Math.max(layout.radius * 1.2, 12);
  const customBox = customIconBoxSize(layout, MIN_PADDING, arrangement);

  return (
    <div
      className="relative w-full"
      style={{ height: containerHeight }}
    >
      {layout.positions.map((pos) => {
        const isFilled = pos.globalIndex < filledCount;
        const isLast = pos.globalIndex === totalStamps - 1;

        if (useCustom) {
          const src = resolveStampIconUrl(
            customConfig,
            pos.globalIndex,
            totalStamps,
            isFilled
          );
          if (!src) return null;
          return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`stamp-${pos.globalIndex}`}
              src={src}
              alt=""
              className="absolute object-contain transition-all duration-300"
              style={{
                width: customBox,
                height: customBox,
                left: pos.centerX - customBox / 2,
                top: pos.centerY - customBox / 2,
                // Deeper band levels overlap shallower ones, matching the
                // backend compositing order.
                zIndex: pos.row + 1,
                // Empty slots fade by the design's empty_opacity — CSS
                // opacity is the same alpha multiply the strip generator
                // applies at composite time.
                opacity: isFilled ? 1 : (customConfig.empty_opacity ?? 100) / 100,
              }}
            />
          );
        }

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

interface SecondaryFieldsRowProps {
  fields: Array<{ key?: string; label: string; value: string }>;
  colors: ReturnType<typeof computeCardColors>;
  /** Values substituted into {{variable}} templates. Falls back to the
   *  generic samples from template-variables when a key is absent. */
  variableValues?: Record<string, string>;
}

function SecondaryFieldsRow({ fields, colors, variableValues }: SecondaryFieldsRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14); // Start with text-sm equivalent

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // The available WIDTH is what decides whether text overflows. Shrinking the
    // font only changes the row's HEIGHT (and scrollWidth) — so if we let the
    // observer react to those, resetting to 14px then re-shrinking would loop
    // forever, and two long fields visibly jitter left↔right. Guard on width so
    // font-induced size changes are ignored and the fit converges once.
    let lastWidth = -1;
    let raf = 0;

    const fit = () => {
      cancelAnimationFrame(raf);
      setFontSize(14); // measure at full size first
      raf = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const containerWidth = el.offsetWidth;
        const contentWidth = el.scrollWidth;
        if (contentWidth > containerWidth) {
          const scale = containerWidth / contentWidth;
          setFontSize(Math.max(10, Math.floor(14 * scale)));
        }
      });
    };

    fit();

    const resizeObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width);
      if (width === lastWidth) return;
      lastWidth = width;
      fit();
    });
    resizeObserver.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [fields]);

  const fieldCount = fields.length;

  return (
    <div className="px-2.5 py-1 overflow-hidden">
      <div
        ref={containerRef}
        className="flex items-start"
        style={{ gap: '8px' }}
      >
        {fields.map((field, i) => {
          const isFirst = i === 0;
          const isLast = i === fieldCount - 1;

          return (
            <div
              key={field.key || i}
              className={`${isFirst ? '' : isLast ? 'ml-auto' : ''}`}
              style={{
                textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                flexShrink: isFirst || isLast ? 0 : 1,
              }}
            >
              <div
                className="text-[8px] font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap"
                style={{ color: colors.mutedTextColor }}
              >
                {renderSamplePreview(field.label, variableValues)}
              </div>
              <div
                className="font-medium transition-colors duration-300 whitespace-nowrap"
                style={{
                  color: colors.textColor,
                  fontSize: `${fontSize}px`,
                }}
              >
                {renderSamplePreview(field.value, variableValues)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

const STRIP_ASPECT_RATIO = 1125 / 432;

interface StampGridContainerProps
  extends Omit<StampGridProps, "containerWidth" | "containerHeight"> {
  /** Cap the rendered strip width. Defaults to undefined (fills parent). */
  maxWidth?: number | string;
}

export function StampGridContainer({
  totalStamps,
  filledCount,
  colors,
  stampIcon,
  rewardIcon,
  customConfig,
  maxWidth,
}: StampGridContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          // Calculate height based on strip aspect ratio
          const height = width / STRIP_ASPECT_RATIO;
          setDimensions({ width, height });
        }
      };

      const resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(containerRef.current);
      updateDimensions(); // Initial calculation

      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto"
      style={{
        // Use aspect-ratio to maintain proportions
        aspectRatio: `${STRIP_ASPECT_RATIO}`,
        maxWidth,
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <StampGrid
          totalStamps={totalStamps}
          filledCount={filledCount}
          colors={colors}
          stampIcon={stampIcon}
          rewardIcon={rewardIcon}
          customConfig={customConfig}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WalletCard({
  design,
  stamps = Math.round((design.total_stamps ?? 10) * 0.75),
  totalStamps: totalStampsProp,
  organizationName,
  showQR = true,
  showSecondaryFields = true,
  className = "",
  pointsBalance,
  pointsRewards,
}: WalletCardProps) {
  const t = useTranslations("designEditor.cardBack");
  const displayName =
    organizationName || design.organization_name || "";
  const initials = getInitials(displayName);
  const totalStamps = totalStampsProp ?? design.total_stamps ?? 10;
  const colors = computeCardColors(design);
  const isPoints = design.card_type === "points";

  // Points previews need a reward ladder + a sample balance. Editor surfaces
  // pass them explicitly (slider-driven). Everywhere else (dashboard, templates,
  // overview) renders a points card WITHOUT them, which used to preview a blank
  // "0" strip. When rewards aren't supplied, pull the active program's ladder
  // and seed a representative balance so the card is never empty.
  const { currentBusiness } = useBusiness();
  const needProgramRewards = isPoints && pointsRewards === undefined;
  const { data: defaultProgram } = useDefaultProgram(
    needProgramRewards ? currentBusiness?.id : undefined
  );
  const resolvedRewards = useMemo<RewardTier[]>(
    () =>
      pointsRewards ??
      (isPointsProgram(defaultProgram) ? defaultProgram.config.rewards : []),
    [pointsRewards, defaultProgram]
  );
  const resolvedBalance = useMemo(
    () => pointsBalance ?? defaultPointsSampleBalance(resolvedRewards),
    [pointsBalance, resolvedRewards]
  );

  // Points accent: explicit progress color → stamp accent fallback.
  const pointsAccent = design.progress_accent_color
    ? rgbToHex(design.progress_accent_color)
    : colors.accentHex;
  // Strip canvas color: a dedicated strip_background_color when set, else the
  // card background — matches the backend points strip generator.
  const stripBgHex = design.strip_background_color
    ? rgbToHex(design.strip_background_color)
    : colors.bgHex;

  // {{variable}} previews use the business's REAL data (reward name,
  // business name, the signed-in user's own first name) and the counts
  // shown on this very card, so the preview matches what a customer sees.
  const realValues = useVariablePreviewValues();
  const variableValues = useMemo(() => {
    const values: Record<string, string> = {
      ...realValues,
      stamp_count: String(stamps),
      total_stamps: String(totalStamps),
      stamps_left: String(Math.max(0, totalStamps - stamps)),
    };
    if (isPoints) {
      const balance = resolvedBalance;
      const sorted = [...resolvedRewards].sort((a, b) => a.threshold - b.threshold);
      const next = sorted.find((r) => r.threshold > balance) ?? null;
      values.points_balance = String(balance);
      values.points_to_next = String(next ? Math.max(0, next.threshold - balance) : 0);
      // Absolute value of that SAME next milestone (must agree with
      // points_to_next: the reward they're currently reaching, not the one after).
      // Empty when every tier is cleared, so it never falls back to the generic
      // sample value.
      values.next_reward_points = next ? String(next.threshold) : "";
      if (next?.name) values.next_reward_name = next.name;
    }
    return values;
  }, [realValues, stamps, totalStamps, isPoints, resolvedBalance, resolvedRewards]);

  const stampIcon = (design.stamp_icon || "checkmark") as StampIconType;
  const rewardIcon = (design.reward_icon || "gift") as StampIconType;
  const customConfig =
    design.stamp_icon_mode === "custom" ? design.custom_stamp_config : null;

  const secondaryFields = design.secondary_fields || [];
  const auxiliaryFields = design.auxiliary_fields || [];

  return (
    <div
      className={`relative w-full h-full ${className}`}
    >
      <div
        className="relative w-full h-full rounded-2xl"
        style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
      >
        {/* Card Content Layer */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: colors.bgHex,
          }}
        >
          {/* Content Layout */}
          <div className="relative h-full px-0 py-0 flex flex-col z-10">
            {/* Header: Logo + Business Name */}
            <div className="flex justify-between items-center px-2.5 py-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {design.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={design.logo_url}
                    alt={displayName}
                    className="h-8 w-auto max-w-[102px] object-contain transition-all duration-300"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 flex-shrink-0"
                    style={{ backgroundColor: colors.accentHex }}
                  >
                    <span className="text-white font-bold text-xs">
                      {initials}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <h3
                    className="font-semibold text-sm tracking-tight leading-tight truncate transition-colors duration-300"
                    style={{ color: colors.mutedTextColor }}
                  >
                    {displayName}
                  </h3>

                </div>
              </div>
              <div className="text-right items-center flex-shrink-0 pl-2">
                <div
                  className="text-[8px] font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{ color: colors.mutedTextColor }}
                >
                  {isPoints ? t("points") : t("stamps")}
                </div>
                <div
                  className="text-md font-medium flex items-baseline gap-1 justify-end transition-colors duration-300 leading-tight"
                  style={{ color: colors.textColor }}
                >
                  {isPoints ? resolvedBalance : `${stamps} / ${totalStamps}`}
                </div>
              </div>
            </div>

            {/* Strip area: points render a full-width strip band (its own
                canvas color behind the optional image); stamps keep the
                centered grid. */}
            {isPoints ? (
              <div
                className="relative w-full overflow-hidden"
                style={{ backgroundColor: stripBgHex }}
              >
                {design.strip_background_url && (
                  <div className="absolute inset-0" style={{ zIndex: 0 }}>
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
                <div className="relative" style={{ zIndex: 1 }}>
                  <PointsStrip
                    style={design.points_strip_style ?? "big_point"}
                    balance={resolvedBalance}
                    rewards={resolvedRewards}
                    rewardIcons={design.points_reward_icons}
                    accentColor={pointsAccent}
                    backgroundColor={stripBgHex}
                  />
                </div>
              </div>
            ) : design.stamp_icon_mode === "image_only" ? (
              /* image_only: the strip IS the uploaded image (or the bare
                 canvas color) — full-width band, no stamps drawn. */
              <div
                className="relative w-full overflow-hidden"
                style={{ backgroundColor: stripBgHex }}
              >
                {design.strip_background_url && (
                  <div className="absolute inset-0" style={{ zIndex: 0 }}>
                    <Image
                      src={design.strip_background_url}
                      alt=""
                      fill
                      className="object-cover"
                      style={{ opacity: stampStripImageOpacity(design) }}
                      unoptimized
                    />
                  </div>
                )}
                {/* Spacer keeps the strip's height without drawing stamps. */}
                <div className="w-full" style={{ aspectRatio: `${STRIP_ASPECT_RATIO}` }} />
              </div>
            ) : (
              <div
                className="relative flex items-start justify-center py-2"
                style={{ backgroundColor: stripBgHex }}
              >
                {/* Strip background layer */}
                {design.strip_background_url && (
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden"
                    style={{ zIndex: 0 }}
                  >
                    <Image
                      src={design.strip_background_url}
                      alt=""
                      fill
                      className="object-cover"
                      style={{ opacity: stampStripImageOpacity(design) }}
                      unoptimized
                    />
                  </div>
                )}
                <StampGridContainer
                  totalStamps={totalStamps}
                  filledCount={stamps}
                  colors={colors}
                  stampIcon={stampIcon}
                  rewardIcon={rewardIcon}
                  customConfig={customConfig}
                />
              </div>
            )}

            {/* Secondary Fields - horizontal row like real Apple Wallet */}
            {showSecondaryFields && secondaryFields.length > 0 && (
              <SecondaryFieldsRow
                fields={secondaryFields.slice(0, 4)}
                colors={colors}
                variableValues={variableValues}
              />
            )}

            {/* Auxiliary Fields - second horizontal row, same shape as
                secondary. Apple Wallet uses an auxiliary row below the
                secondary row for less-important details. */}
            {showSecondaryFields && auxiliaryFields.length > 0 && (
              <SecondaryFieldsRow
                fields={auxiliaryFields.slice(0, 4)}
                colors={colors}
                variableValues={variableValues}
              />
            )}

            {/* QR Code */}
            {showQR && (
              <div
                className="mt-auto pb-2 flex justify-center"
                style={{ borderColor: colors.emptyStampBorder }}
              >
                <div className="bg-white p-2 rounded-lg">
                  <FakeQRCode size={80} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Border */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-30"
          style={{
            boxShadow: `inset 0 0 0 1px ${colors.isLightBg ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"
              }`,
          }}
        />
      </div>
    </div>
  );
}

export default WalletCard;
