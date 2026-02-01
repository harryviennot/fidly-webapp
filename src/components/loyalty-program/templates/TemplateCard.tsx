'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CardDesign } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsThreeIcon, TrashIcon, CheckCircleIcon, PencilIcon, CopyIcon } from '@phosphor-icons/react';
import { ScaledCardWrapper } from '@/components/design/ScaledCardWrapper';
import { StampIconSvg, StampIconType } from '@/components/design/StampIconPicker';

interface TemplateCardProps {
  design: CardDesign;
  onDelete?: (id: string) => void;
  onActivate?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

// Helper functions
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
    if (match) [r, g, b] = match.map(Number);
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

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
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function TemplateCard({ design, onDelete, onActivate, onDuplicate }: TemplateCardProps) {
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
  const emptyStampBorder = isLightBg ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';

  const displayName = design.organization_name || 'Your Business';
  const initials = getInitials(displayName);
  const row1Count = Math.ceil(totalStamps / 2);
  const row2Count = totalStamps - row1Count;
  const filledCount = 3;

  return (
    <div className="w-full">
      {/* Card Preview */}
      <Link href={`/loyalty-program/design/${design.id}`} className="block">
        <ScaledCardWrapper baseWidth={280} aspectRatio={1.282} minScale={0.6}>
          <div
            className="w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${bgGradientFrom}, ${bgGradientTo})`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            }}
          >
            <div
              className="h-full flex flex-col p-4"
              style={{
                background: isLightBg
                  ? 'linear-gradient(to bottom right, rgba(255,255,255,0.4), transparent, rgba(0,0,0,0.05))'
                  : 'linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent, rgba(0,0,0,0.2))',
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {design.logo_url ? (
                    <Image
                      src={design.logo_url}
                      alt={displayName}
                      width={80}
                      height={28}
                      className="h-7 max-w-[80px] object-contain"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: accentHex }}
                    >
                      <span className="text-white font-bold text-[10px]">{initials}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-xs leading-tight" style={{ color: textColor }}>
                      {displayName}
                    </h3>
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: mutedTextColor }}>
                      {design.description || 'Loyalty Card'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: mutedTextColor }}>
                    Stamps
                  </div>
                  <div className="text-base font-medium" style={{ color: textColor }}>
                    {filledCount} / {totalStamps}
                  </div>
                </div>
              </div>

              {/* Stamps Grid */}
              <div className="flex flex-col justify-center gap-2 w-full my-auto py-3">
                <div className="flex justify-between w-full px-1">
                  {Array.from({ length: row1Count }, (_, i) => {
                    const isFilled = i < filledCount;
                    return (
                      <div
                        key={`stamp-${i}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: isFilled ? accentHex : emptyStampBg,
                          border: isFilled ? 'none' : `1px solid ${emptyStampBorder}`,
                          boxShadow: isFilled ? `0 3px 8px ${accentHex}40` : 'none',
                        }}
                      >
                        {isFilled && (
                          <StampIconSvg
                            icon={(design.stamp_icon || 'checkmark') as StampIconType}
                            className="w-4 h-4"
                            color={iconColorHex}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {row2Count > 0 && (
                  <div className="flex justify-between w-full px-1">
                    {Array.from({ length: row2Count }, (_, i) => {
                      const actualIndex = row1Count + i;
                      const isFilled = actualIndex < filledCount;
                      return (
                        <div
                          key={`stamp-${actualIndex}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: isFilled ? accentHex : emptyStampBg,
                            border: isFilled ? 'none' : `1px solid ${emptyStampBorder}`,
                            boxShadow: isFilled ? `0 3px 8px ${accentHex}40` : 'none',
                          }}
                        >
                          {isFilled && (
                            <StampIconSvg
                              icon={(design.stamp_icon || 'checkmark') as StampIconType}
                              className="w-4 h-4"
                              color={iconColorHex}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-auto">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: mutedTextColor }}>
                  Collect stamps
                </p>
                <p className="text-xs" style={{ color: textColor, opacity: 0.9 }}>
                  to earn your reward
                </p>
              </div>
            </div>
          </div>
        </ScaledCardWrapper>
      </Link>

      {/* Card info + actions */}
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{displayName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {design.is_active ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                Active
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Draft</span>
            )}
            <span className="text-xs text-muted-foreground">
              {totalStamps} stamps
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 hover:bg-muted rounded">
            <DotsThreeIcon className="w-5 h-5" weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/loyalty-program/design/${design.id}`}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(design.id)}>
                <CopyIcon className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            )}
            {!design.is_active && onActivate && (
              <DropdownMenuItem onClick={() => onActivate(design.id)}>
                <CheckCircleIcon className="mr-2 h-4 w-4" />
                Set as Active
              </DropdownMenuItem>
            )}
            {onDelete && !design.is_active && (
              <DropdownMenuItem
                onClick={() => onDelete(design.id)}
                className="text-destructive focus:text-destructive"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
