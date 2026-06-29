'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ColorPicker } from '@/components/design/ColorPicker';
import { LabelWithTooltip } from '@/components/design/FieldTooltip';
import ImageUploader from '@/components/design/ImageUploader';
import {
  IconLibrary,
  StampIconSvg,
  type StampIconType,
} from '@/components/design/StampIconPicker';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDesignForm } from './DesignFormContext';
import { designColors, rgbToHex, hexToRgb } from '@/lib/color-utils';
import { cn } from '@/lib/utils';
import type { PointsStripStyle, RewardTier } from '@/types';

interface PointsFormProps {
  /** The active program's reward ladder — one icon picker per reward. */
  rewards: RewardTier[];
}

const STRIP_STYLES: PointsStripStyle[] = ['big_point', 'circle_progress', 'progress_icons'];

/**
 * Points card design controls (parallel to StampsForm). Edits the points
 * strip style, the progress accent color, and — for the `progress_icons`
 * style — a preset icon per reward. Reads the active program's `rewards[]`
 * to know which icon rows to render; keying icons by reward id keeps choices
 * stable when the reward menu is reordered.
 */
export function PointsForm({ rewards }: PointsFormProps) {
  const t = useTranslations('designEditor.points');
  const tEditor = useTranslations('designEditor.editor');
  const {
    formData,
    updateField,
    accentHex,
    iconHex,
    handleStripBackgroundUpload,
    handleStripBackgroundClear,
  } = useDesignForm();

  const stripStyle = formData.points_strip_style ?? 'big_point';
  const rewardIcons = formData.points_reward_icons ?? {};
  // Which reward's icon popover is open (one at a time). Selecting an icon
  // closes it — see setRewardIcon.
  const [openRewardIcon, setOpenRewardIcon] = useState<string | null>(null);
  const accentValue = formData.progress_accent_color
    ? rgbToHex(formData.progress_accent_color)
    : accentHex;
  // Strip canvas color, shown only when no strip image is uploaded. Defaults to
  // the card's background_color (which is what the backend falls back to).
  const stripBgValue = formData.strip_background_color
    ? rgbToHex(formData.strip_background_color)
    : formData.background_color
      ? rgbToHex(formData.background_color)
      : '#1c1c1e';
  const hasStripImage = Boolean(formData.strip_background_url);

  const setRewardIcon = (rewardId: string, icon: StampIconType) => {
    updateField('points_reward_icons', {
      ...rewardIcons,
      [rewardId]: { type: 'preset', ref: icon },
    });
    setOpenRewardIcon(null);
  };

  const iconFor = (rewardId: string): StampIconType => {
    const choice = rewardIcons[rewardId];
    return (choice?.type === 'preset' ? choice.ref : 'gift') as StampIconType;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Strip style */}
      <div>
        <label className="block text-[12px] font-semibold text-[#555] mb-2">
          {t('stripStyleLabel')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {STRIP_STYLES.map((style) => {
            const active = stripStyle === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => updateField('points_strip_style', style)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-colors',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                )}
              >
                <StripStyleThumb style={style} />
                <span className="text-[11px] font-medium text-[#1A1A1A] text-center leading-tight">
                  {t(`stripStyle.${style}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent color */}
      <ColorPicker
        label={t('accentColorLabel')}
        tooltip={t('accentColorHelp')}
        colors={designColors}
        value={accentValue}
        onChange={(hex) => updateField('progress_accent_color', hexToRgb(hex))}
      />

      {/* Strip background: the solid canvas color is always editable (it shows
          through wherever an image is absent or transparent). An optional image
          layer sits on top, with its own opacity. Color first, image second. */}
      <div className="flex flex-col gap-4">
        <ColorPicker
          label={t('bgColorLabel')}
          tooltip={t('bgColorHelp')}
          colors={designColors}
          value={stripBgValue}
          onChange={(hex) => updateField('strip_background_color', hexToRgb(hex))}
        />
        <div className="flex flex-col gap-3">
          <LabelWithTooltip tooltip={tEditor('stripBackgroundTooltip')}>
            {t('bgImageLabel')}
          </LabelWithTooltip>
          <ImageUploader
            label=""
            value={formData.strip_background_url}
            onUpload={handleStripBackgroundUpload}
            onClear={handleStripBackgroundClear}
            hint={t('bgImageHint')}
            enableCrop
            cropProps={{
              aspect: 1125 / 432,
              filename: 'strip-background.png',
            }}
          />
          {hasStripImage && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{tEditor('opacity')}</Label>
                <span className="text-sm text-muted-foreground">
                  {formData.strip_background_opacity ?? 40}%
                </span>
              </div>
              <input
                type="range"
                className="styled-slider w-full"
                min={0}
                max={100}
                value={formData.strip_background_opacity ?? 40}
                onChange={(e) => updateField('strip_background_opacity', parseInt(e.target.value, 10))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Reward icons — only the reward-track (progress_icons) style shows them. */}
      {stripStyle === 'progress_icons' && rewards.length > 0 && (
        <div>
          <label className="block text-[12px] font-semibold text-[#555] mb-1">
            {t('rewardIconsLabel')}
          </label>
          <p className="text-[11.5px] text-[#8A8A8A] leading-[1.4] mb-2.5">
            {t('rewardIconsHelp')}
          </p>
          <div className="flex flex-col gap-2">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border-light)] bg-[var(--paper)] px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                    {reward.name || t('untitledReward')}
                  </div>
                  <div className="text-[11px] text-[#8A8A8A]">
                    {t('rewardPrice', { points: reward.threshold })}
                  </div>
                </div>
                <Popover
                  open={openRewardIcon === reward.id}
                  onOpenChange={(o) => setOpenRewardIcon(o ? reward.id : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{ backgroundColor: accentValue }}
                      aria-label={t('pickIcon', { reward: reward.name })}
                    >
                      <StampIconSvg icon={iconFor(reward.id)} className="w-4 h-4" color={iconHex} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <IconLibrary
                      value={iconFor(reward.id)}
                      onChange={(icon) => setRewardIcon(reward.id, icon)}
                      accentColor={accentValue}
                      iconColor={iconHex}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tiny inline glyph representing each strip layout in the style picker. */
function StripStyleThumb({ style }: { style: PointsStripStyle }) {
  if (style === 'big_point') {
    return (
      <div className="flex items-center justify-end w-full h-7 px-1">
        <span className="text-[18px] font-extrabold leading-none text-[var(--accent)]">42</span>
      </div>
    );
  }
  if (style === 'circle_progress') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="10" fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="14"
          cy="14"
          r="10"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 10}
          strokeDashoffset={2 * Math.PI * 10 * 0.35}
          transform="rotate(-90 14 14)"
        />
      </svg>
    );
  }
  return (
    <div className="flex items-center gap-1 h-7">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-3.5 h-3.5 rounded-full"
          style={{ background: i < 2 ? 'var(--accent)' : 'var(--border)' }}
        />
      ))}
    </div>
  );
}
