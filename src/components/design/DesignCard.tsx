'use client';

import Link from 'next/link';
import { CardDesign } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash, CheckCircle } from '@phosphor-icons/react';
import { StampIconSvg, StampIconType } from './StampIconPicker';

interface DesignCardProps {
  design: CardDesign;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  isActivating?: boolean;
}

// Convert rgb(r, g, b) to hex
function rgbToHex(rgb: string): string {
  if (!rgb) return '#1c1c1e';
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!match) return '#1c1c1e';
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Helper to determine if a color is light or dark
function isLightColor(color: string): boolean {
  if (!color) return false;
  let r = 0, g = 0, b = 0;
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
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
  if (!hex?.startsWith('#')) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return 'YB';
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function DesignCard({
  design,
  onActivate,
  onDelete,
  isActivating = false,
}: DesignCardProps) {
  const backgroundColor = design.background_color ?? 'rgb(28, 28, 30)';
  const accentColor = design.stamp_filled_color ?? 'rgb(249, 115, 22)';
  const iconColor = design.label_color ?? 'rgb(255, 255, 255)';
  const totalStamps = design.total_stamps ?? 10;

  const bgHex = rgbToHex(backgroundColor);
  const accentHex = rgbToHex(accentColor);
  const iconColorHex = rgbToHex(iconColor);
  const bgGradientFrom = adjustBrightness(bgHex, 15);
  const bgGradientTo = adjustBrightness(bgHex, -10);

  const isLightBg = isLightColor(bgHex);
  const textColor = isLightBg ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,1)';
  const mutedTextColor = isLightBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const emptyStampBg = isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  const displayName = design.organization_name || 'Your Business';
  const initials = getInitials(displayName);

  // Show max 6 stamps in mini preview
  const previewStamps = Math.min(totalStamps, 6);
  const filledCount = 3;

  return (
    <div className={`rounded-xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow ${design.is_active ? 'ring-2 ring-primary' : ''}`}>
      {/* Mini Card Preview */}
      <div
        className="p-4 relative"
        style={{
          background: `linear-gradient(135deg, ${bgGradientFrom}, ${bgGradientTo})`,
        }}
      >
        {/* Active Badge */}
        {design.is_active && (
          <Badge className="absolute top-2 right-2 text-xs">Active</Badge>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          {design.logo_url ? (
            <img
              src={design.logo_url}
              alt={displayName}
              className="h-8 max-w-[80px] object-contain"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: accentHex }}
            >
              <span className="text-white font-bold text-xs">{initials}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3
              className="font-semibold text-sm truncate"
              style={{ color: textColor }}
            >
              {displayName}
            </h3>
            <p
              className="text-xs truncate"
              style={{ color: mutedTextColor }}
            >
              {design.description || 'Loyalty Card'}
            </p>
          </div>
        </div>

        {/* Stamp Row */}
        <div className="flex justify-between gap-1">
          {Array.from({ length: previewStamps }, (_, i) => {
            const isFilled = i < filledCount;
            const isLast = i === previewStamps - 1;
            return (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isFilled ? accentHex : emptyStampBg,
                  boxShadow: isFilled ? `0 2px 8px ${accentHex}40` : 'none',
                }}
              >
                {isFilled && (
                  <StampIconSvg
                    icon={(isLast ? design.reward_icon : design.stamp_icon) as StampIconType || 'checkmark'}
                    className="w-4 h-4"
                    color={iconColorHex}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Stamp count indicator */}
        <div className="mt-3 text-center">
          <span className="text-xs font-medium" style={{ color: mutedTextColor }}>
            {totalStamps} stamps total
          </span>
        </div>
      </div>

      {/* Card Info & Actions */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-base">{design.name}</h3>
          <p className="text-sm text-muted-foreground">{design.organization_name}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/design/${design.id}`}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Link>
          </Button>
          {!design.is_active && (
            <>
              <Button
                size="sm"
                onClick={() => onActivate(design.id)}
                disabled={isActivating}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {isActivating ? 'Activating...' : 'Activate'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(design.id)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
