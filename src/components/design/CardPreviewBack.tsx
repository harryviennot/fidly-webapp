"use client";

import React, { useRef, useState } from "react";
import { CardDesign, PassField } from "@/types";

interface CardPreviewBackProps {
  design: Partial<CardDesign>;
  organizationName?: string;
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

export function CardPreviewBack({
  design,
  organizationName,
}: CardPreviewBackProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const displayName = organizationName || design.organization_name || "Your Business";

  // Get colors with defaults
  const backgroundColor = design.background_color ?? "rgb(28, 28, 30)";
  const foregroundColor = design.foreground_color ?? "rgb(255, 255, 255)";
  const labelColor = design.label_color ?? "rgb(255, 255, 255)";

  // Convert to hex for gradient calculations
  const bgHex = rgbToHex(backgroundColor);

  // Calculate gradient colors for more depth
  const bgGradientFrom = adjustBrightness(bgHex, 15);
  const bgGradientTo = adjustBrightness(bgHex, -10);

  // Determine text color based on background
  const isLightBg = isLightColor(bgHex);
  const dividerColor = isLightBg ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  const backFields = design.back_fields ?? [];

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
          <div className="relative h-full px-5 py-5 flex flex-col z-10">
            {/* Header: Organization Name */}
            <div
              className="text-center pb-4 mb-4 border-b"
              style={{ borderColor: dividerColor }}
            >
              <h3
                className="font-semibold text-lg tracking-tight"
                style={{ color: foregroundColor }}
              >
                {displayName}
              </h3>
            </div>

            {/* Back Fields */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {backFields.length > 0 ? (
                backFields.map((field: PassField, index: number) => (
                  <div key={field.key || index} className="space-y-1">
                    <p
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: labelColor, opacity: 0.7 }}
                    >
                      {field.label}
                    </p>
                    <p
                      className="text-sm whitespace-pre-wrap"
                      style={{ color: foregroundColor }}
                    >
                      {field.value}
                    </p>
                  </div>
                ))
              ) : (
                <div
                  className="text-center py-8"
                  style={{ color: foregroundColor, opacity: 0.5 }}
                >
                  <p className="text-sm">No back fields configured</p>
                  <p className="text-xs mt-1">
                    Add terms, contact info, or other details
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="mt-auto pt-4 border-t text-center"
              style={{ borderColor: dividerColor }}
            >
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ color: labelColor, opacity: 0.5 }}
              >
                Powered by Fidelity
              </p>
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

export default CardPreviewBack;
