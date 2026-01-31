"use client";

import React, { useRef, useState } from "react";
import { CardDesign } from "@/types";
import { StampIconSvg, StampIconType } from "./StampIconPicker";

interface CardPreview3DProps {
  design: Partial<CardDesign>;
  stamps?: number;
  organizationName?: string;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return "YB";
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Convert rgb(r, g, b) to hex
function rgbToHex(rgb: string): string {
  if (!rgb) return "#1c1c1e";
  if (rgb.startsWith("#")) return rgb;

  const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!match) return "#1c1c1e";

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Helper to determine if a color is light or dark
function isLightColor(color: string): boolean {
  if (!color) return false;

  let r = 0, g = 0, b = 0;

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith("rgb")) {
    const match = color.match(/\d+/g);
    if (match) {
      [r, g, b] = match.map(Number);
    } else {
      return false;
    }
  } else {
    return false;
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Helper to adjust color brightness
function adjustBrightness(color: string, percent: number): string {
  const hex = rgbToHex(color);
  if (!hex?.startsWith("#")) return hex;

  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function CardPreview3D({
  design,
  stamps = 3,
  organizationName,
}: CardPreview3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const displayName = organizationName || design.organization_name || "Your Business";
  const initials = getInitials(displayName);

  // Get colors with defaults
  const backgroundColor = design.background_color ?? "rgb(28, 28, 30)";
  const accentColor = design.stamp_filled_color ?? "rgb(249, 115, 22)";
  const iconColor = design.label_color ?? "rgb(255, 255, 255)";
  const totalStamps = design.total_stamps ?? 10;

  // Convert to hex for gradient calculations
  const bgHex = rgbToHex(backgroundColor);
  const accentHex = rgbToHex(accentColor);
  const iconColorHex = rgbToHex(iconColor);

  // Calculate gradient colors for more depth
  const bgGradientFrom = adjustBrightness(bgHex, 15);
  const bgGradientTo = adjustBrightness(bgHex, -10);

  // Determine text color - use foreground_color if set, otherwise auto-calculate from background
  const isLightBg = isLightColor(bgHex);
  const foregroundColor = design.foreground_color;

  // Calculate auto colors based on background brightness
  const autoTextColor = isLightBg ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,1)";
  const autoMutedColor = isLightBg ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";

  // Use foreground_color if set, otherwise use auto-calculated colors
  const textColor = foregroundColor ? rgbToHex(foregroundColor) : autoTextColor;
  const mutedTextColor = foregroundColor ? `${rgbToHex(foregroundColor)}80` : autoMutedColor;

  const emptyStampBg = isLightBg ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const emptyStampBorder = isLightBg ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";

  const filledCount = stamps;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 4;
    const rotateX = ((centerY - y) / centerY) * 4;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: glareX, y: glareY, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // Calculate stamp rows (for n stamps: ceil(n/2) on top, floor(n/2) on bottom)
  const row1Count = Math.ceil(totalStamps / 2);
  const row2Count = totalStamps - row1Count;

  return (
    <div
      className="relative w-full max-w-[340px] mx-auto aspect-[10/12]"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full rounded-[1.5rem] cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition:
            "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease",
          boxShadow: `
            ${-rotate.y * 1.5}px ${rotate.x * 1.5 + 8}px 24px rgba(0,0,0,0.12),
            0 20px 50px rgba(0,0,0,0.08)
          `,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Card Content Layer */}
        <div
          className="absolute inset-0 rounded-[1.5rem] overflow-hidden transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${bgGradientFrom}, ${bgGradientTo})`
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: isLightBg
                ? "linear-gradient(to bottom right, rgba(255,255,255,0.4), transparent, rgba(0,0,0,0.05))"
                : "linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent, rgba(0,0,0,0.2))"
            }}
          />

          {/* Content Layout */}
          <div className="relative h-full px-5 py-4 flex flex-col z-10">
            {/* Header: Logo/Brand Left, Stamp Count Right */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  {design.logo_url ? (
                    <img
                      src={design.logo_url}
                      alt={displayName}
                      className="object-contain transition-all duration-300"
                      style={{ height: 36, maxWidth: 115 }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300"
                      style={{ backgroundColor: accentHex }}
                    >
                      <span className="text-white font-bold text-xs">
                        {initials}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3
                      className="font-semibold text-[14px] tracking-tight leading-tight transition-colors duration-300"
                      style={{ color: textColor }}
                    >
                      {displayName}
                    </h3>
                    <p
                      className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
                      style={{ color: mutedTextColor }}
                    >
                      {design.description || "Loyalty Card"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{ color: mutedTextColor }}
                >
                  Stamps
                </div>
                <div
                  className="text-lg font-medium flex items-baseline gap-1 justify-end transition-colors duration-300"
                  style={{ color: textColor }}
                >
                  {filledCount} / {totalStamps}
                </div>
              </div>
            </div>

            {/* Middle: Stamps Grid */}
            <div className="flex flex-col justify-center gap-3 w-full my-auto py-4">
              {/* Row 1 */}
              <div className="flex justify-between w-full px-1">
                {Array.from({ length: row1Count }, (_, i) => (
                  <Stamp
                    key={`stamp-${i}`}
                    isFilled={i < filledCount}
                    accentColor={accentHex}
                    iconColor={iconColorHex}
                    emptyBg={emptyStampBg}
                    emptyBorder={emptyStampBorder}
                    stampIcon={(design.stamp_icon || "checkmark") as StampIconType}
                    rewardIcon={(design.reward_icon || "gift") as StampIconType}
                    totalStamps={totalStamps}
                  />
                ))}
              </div>
              {/* Row 2 */}
              {row2Count > 0 && (
                <div className="flex justify-between w-full px-1">
                  {Array.from({ length: row2Count }, (_, i) => {
                    const actualIndex = row1Count + i;
                    const isLastStamp = actualIndex === totalStamps - 1;
                    return (
                      <Stamp
                        key={`stamp-${actualIndex}`}
                        isFilled={actualIndex < filledCount}
                        accentColor={accentHex}
                        iconColor={iconColorHex}
                        emptyBg={emptyStampBg}
                        emptyBorder={emptyStampBorder}
                        isLast={isLastStamp}
                        stampIcon={(design.stamp_icon || "checkmark") as StampIconType}
                        rewardIcon={(design.reward_icon || "gift") as StampIconType}
                        totalStamps={totalStamps}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto">
              <div className="flex justify-between items-center">
                <div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: mutedTextColor }}
                  >
                    Collect stamps
                  </p>
                  <p
                    className="text-[14px] transition-colors duration-300"
                    style={{ color: textColor, opacity: 0.9 }}
                  >
                    to earn your reward
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="mt-3 pt-3 flex justify-center border-t" style={{ borderColor: emptyStampBorder }}>
              <div className="bg-white p-1.5 rounded-lg">
                <FakeQRCode size={70} />
              </div>
            </div>
          </div>
        </div>

        {/* Glare Effect */}
        <div
          className="absolute inset-0 rounded-[1.5rem] pointer-events-none z-20"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)`,
            opacity: glare.opacity,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Border */}
        <div
          className="absolute inset-0 rounded-[1.5rem] pointer-events-none z-30"
          style={{
            boxShadow: `inset 0 0 0 1px ${isLightBg ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
          }}
        />
      </div>
    </div>
  );
}

interface StampProps {
  readonly isFilled: boolean;
  readonly accentColor: string;
  readonly iconColor: string;
  readonly emptyBg: string;
  readonly emptyBorder: string;
  readonly isLast?: boolean;
  readonly stampIcon: StampIconType;
  readonly rewardIcon: StampIconType;
  readonly totalStamps: number;
}

function Stamp({
  isFilled,
  accentColor,
  iconColor,
  emptyBg,
  emptyBorder,
  isLast = false,
  stampIcon = "checkmark",
  rewardIcon = "gift",
  totalStamps,
}: StampProps) {
  // Adjust stamp size based on total stamps
  const sizeClass = totalStamps <= 6 ? "w-12 h-12" : totalStamps <= 10 ? "w-10 h-10" : "w-8 h-8";
  const iconSizeClass = totalStamps <= 6 ? "w-6 h-6" : totalStamps <= 10 ? "w-5 h-5" : "w-4 h-4";

  return (
    <div className="flex justify-center">
      <div
        className={`
          ${sizeClass} rounded-full flex items-center justify-center
          transition-all duration-300
        `}
        style={{
          backgroundColor: isFilled ? accentColor : emptyBg,
          border: isFilled ? "none" : `1px solid ${emptyBorder}`,
          boxShadow: isFilled ? `0 4px 12px ${accentColor}40` : "none",
        }}
      >
        {isFilled && (
          <StampIconSvg
            icon={isLast ? rewardIcon : stampIcon}
            className={iconSizeClass}
            color={iconColor}
          />
        )}
      </div>
    </div>
  );
}

function FakeQRCode({ size = 70 }: { size?: number }) {
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

export default CardPreview3D;
