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
    return (
      <button
        type="button"
        onClick={start}
        disabled={!hasPalette || isPaletteLoading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--border-medium)] bg-[var(--paper-hover)]/40 px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--paper-hover)] hover:border-[var(--foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--paper-hover)]/40 disabled:hover:border-[var(--border-medium)]"
      >
        <Sparkle className="w-4 h-4" weight="fill" />
        {label}
      </button>
    );
  }

  const current = variants![currentIndex];
  const variantName = t(`variants.${current.id}` as 'variants.light');
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-[var(--border-medium)] bg-[var(--paper-hover)]/40 px-3 py-2">
      <p className="flex-1 min-w-0 text-sm font-semibold text-[var(--foreground)]">
        {t('active.counter', {
          current: currentIndex + 1,
          total: variants!.length,
          name: variantName,
        })}
      </p>
      <button
        type="button"
        onClick={cycle}
        className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--foreground)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--foreground)]/90 transition-colors"
      >
        <ArrowsCounterClockwise className="w-3.5 h-3.5" weight="bold" />
        {t('active.next')}
      </button>
      <button
        type="button"
        onClick={cancel}
        aria-label={t('active.cancel')}
        className="inline-flex items-center justify-center rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-[#666] hover:text-[var(--foreground)] hover:border-[var(--border-medium)] transition-colors"
      >
        <X className="w-3.5 h-3.5" weight="bold" />
      </button>
    </div>
  );
}
