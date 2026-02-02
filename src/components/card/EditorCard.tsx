"use client";

import React, { useRef, useState, useCallback } from "react";
import { CardDesign, PassField } from "@/types";
import { WalletCard } from "./WalletCard";
import { computeCardColors, rgbToHex } from "@/lib/card-utils";

// ============================================================================
// Types
// ============================================================================

export interface EditorCardProps {
  /** Card design being edited */
  design: Partial<CardDesign>;
  /** Current preview stamp count */
  previewStamps?: number;
  /** Organization name (may differ from design during editing) */
  organizationName?: string;
  /** Show back side */
  showBack?: boolean;
}

// ============================================================================
// 3D Effect Hook (shared between front and back)
// ============================================================================

function use3DEffect() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setRotate({ x: 0, y: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return { cardRef, rotate, glare, handleMouseMove, handleMouseLeave };
}

// ============================================================================
// Card Back Component
// ============================================================================

interface CardBackProps {
  design: Partial<CardDesign>;
  organizationName?: string;
}

function CardBack({ design, organizationName }: CardBackProps) {
  const { cardRef, rotate, glare, handleMouseMove, handleMouseLeave } =
    use3DEffect();

  const displayName =
    organizationName || design.organization_name || "Your Business";

  const colors = computeCardColors(design);
  const foregroundColor = design.foreground_color
    ? rgbToHex(design.foreground_color)
    : colors.textColor;
  const labelColor = design.label_color
    ? rgbToHex(design.label_color)
    : colors.mutedTextColor;
  const dividerColor = colors.emptyStampBorder;

  const backFields = design.back_fields ?? [];

  return (
    <div
      className="relative w-full max-w-[340px] mx-auto aspect-[1/1.282]"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full rounded-2xl cursor-pointer"
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
          className="absolute inset-0 rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${colors.bgGradientFrom}, ${colors.bgGradientTo})`,
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: colors.isLightBg
                ? "linear-gradient(to bottom right, rgba(255,255,255,0.4), transparent, rgba(0,0,0,0.05))"
                : "linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent, rgba(0,0,0,0.2))",
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
          className="absolute inset-0 rounded-2xl pointer-events-none z-20"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)`,
            opacity: glare.opacity,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Border */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-30"
          style={{
            boxShadow: `inset 0 0 0 1px ${
              colors.isLightBg ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"
            }`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EditorCard({
  design,
  previewStamps = 3,
  organizationName,
  showBack = false,
}: EditorCardProps) {
  if (showBack) {
    return <CardBack design={design} organizationName={organizationName} />;
  }

  return (
    <div className="relative w-full max-w-[340px] mx-auto aspect-[1/1.282]">
      <WalletCard
        design={design}
        stamps={previewStamps}
        organizationName={organizationName}
        showQR={true}
        showSecondaryFields={true}
        interactive3D={true}
      />
    </div>
  );
}

export default EditorCard;
