'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkle, ArrowsCounterClockwise, X } from '@phosphor-icons/react';
import { useDesignForm } from './forms/DesignFormContext';
import { generateThemeVariants, type ThemeVariant } from '@/lib/theme-variants';
import { rgbToHex } from '@/lib/color-utils';
import type { LogoPalette } from '@/lib/logo-palette';

/**
 * "Auto-generate from logo" bar rendered at the top of the Branding form.
 *
 * Two states:
 *  - **Idle**: a single dashed button. Disabled until a logo has been
 *    uploaded and the palette has been extracted.
 *  - **Active**: counter ("Style 2 of 5 — Dark"), Try another, Cancel.
 *
 * Determinism: the variant list is generated once per palette and walked
 * sequentially. "Try another" advances the index (wrapping at the end);
 * "Cancel" restores the pre-activation snapshot.
 */
export function AutoGenerateBar() {
  const t = useTranslations('designEditor.autoGenerate');
  const { extractedPalette, isPaletteLoading, applyThemeVariant, formData } = useDesignForm();

  const variants = useMemo(
    () => (extractedPalette ? generateThemeVariants(extractedPalette) : null),
    [extractedPalette]
  );
  const hasPalette = Boolean(variants && variants.length > 0);

  // Active state holds the palette it was opened against so we can
  // self-invalidate on logo change without an effect. If the palette
  // identity drifts (user uploaded a new logo), `activeMatches` becomes
  // false and the bar falls back to the idle state.
  interface ActiveState {
    palette: LogoPalette;
    index: number;
    snapshot: ThemeVariant;
  }
  const [active, setActive] = useState<ActiveState | null>(null);
  const activeMatches = active !== null && active.palette === extractedPalette;
  const currentIndex = activeMatches ? active!.index : null;

  const start = () => {
    if (!variants || variants.length === 0 || !extractedPalette) return;
    const snapshot: ThemeVariant = {
      id: 'snapshot',
      name: 'snapshot',
      background: rgbToHex(formData.background_color || 'rgb(28, 28, 30)'),
      foreground: rgbToHex(formData.foreground_color || 'rgb(255, 255, 255)'),
      label: rgbToHex(formData.label_color || 'rgb(255, 255, 255)'),
      stampFilled: rgbToHex(formData.stamp_filled_color || 'rgb(249, 115, 22)'),
      stampEmpty: rgbToHex(formData.stamp_empty_color || 'rgb(255, 255, 255)'),
      stampBorder: rgbToHex(formData.stamp_border_color || 'rgb(255, 255, 255)'),
      iconColor: rgbToHex(formData.icon_color || 'rgb(255, 255, 255)'),
    };
    setActive({ palette: extractedPalette, index: 0, snapshot });
    applyThemeVariant(variants[0]);
  };

  const cycle = () => {
    if (!variants || !activeMatches || !active) return;
    const next = (active.index + 1) % variants.length;
    setActive({ ...active, index: next });
    applyThemeVariant(variants[next]);
  };

  const cancel = () => {
    if (active?.snapshot) applyThemeVariant(active.snapshot);
    setActive(null);
  };

  if (currentIndex === null) {
    const label = !extractedPalette && !isPaletteLoading
      ? t('idle.noLogo')
      : isPaletteLoading
        ? t('idle.loading')
        : t('idle.label');
    const enabled = hasPalette && !isPaletteLoading;
    return (
      <button
        type="button"
        onClick={start}
        disabled={!enabled}
        className={`group relative w-full overflow-hidden rounded-[12px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(168,85,247,0.45)] transition-all duration-200 ${
          enabled
            ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 hover:shadow-[0_6px_20px_-4px_rgba(236,72,153,0.5)] hover:-translate-y-[1px] active:translate-y-0'
            : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 opacity-50 cursor-not-allowed'
        }`}
      >
        {/* Animated shine sweep on hover — pure CSS, no JS. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 transition-transform duration-700 ease-out group-hover:translate-x-[400%]"
        />
        <span className="relative inline-flex items-center justify-center gap-2">
          <Sparkle
            className={`w-4 h-4 ${enabled ? 'animate-pulse' : ''}`}
            weight="fill"
          />
          {label}
        </span>
      </button>
    );
  }

  const current = variants![currentIndex];
  const variantName = t(`variants.${current.id}` as 'variants.light');
  return (
    <div className="rounded-[12px] bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 p-[1.5px] shadow-[0_4px_16px_-4px_rgba(168,85,247,0.45)]">
      <div className="flex items-center gap-2 rounded-[11px] bg-white px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[#888] font-semibold leading-tight">
            <Sparkle className="w-3 h-3 inline-block mr-1 -mt-[1px]" weight="fill" />
            {currentIndex + 1} / {variants!.length}
          </p>
          <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">
            {variantName}
          </p>
        </div>
        <button
          type="button"
          onClick={cycle}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <ArrowsCounterClockwise className="w-3.5 h-3.5" weight="bold" />
          {t('active.next')}
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label={t('active.cancel')}
          className="inline-flex items-center justify-center rounded-[8px] border border-[var(--border)] w-7 h-7 text-[#666] hover:text-[var(--foreground)] hover:border-[var(--border-medium)] transition-colors"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>
    </div>
  );
}
