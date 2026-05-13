'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkle, ArrowsCounterClockwise, X } from '@phosphor-icons/react';
import { useDesignForm } from './forms/DesignFormContext';
import { generateThemeVariants, type ThemeVariant } from '@/lib/theme-variants';
import { rgbToHex } from '@/lib/color-utils';

/**
 * "Auto-generate from logo" bar rendered at the top of the Branding form
 * AND inside the mobile preview sheet. Both instances share their state
 * via `DesignFormContext.autoGenerateState`, so cycling in the sheet
 * advances the bar in the form (and vice versa) — the user never has to
 * remember which surface they started from.
 *
 * Two visual states:
 *  - **Idle**: a gradient pill button.
 *  - **Active**: same outer pill shape, with the count + variant name laid
 *    out horizontally on a single line, plus "Try another" and Cancel.
 *
 * Determinism: the variant list is generated once per palette and walked
 * sequentially. "Try another" advances the index (wrapping at the end);
 * "Cancel" restores the pre-activation snapshot.
 */
export function AutoGenerateBar() {
  const t = useTranslations('designEditor.autoGenerate');
  const {
    extractedPalette,
    isPaletteLoading,
    applyThemeVariant,
    formData,
    autoGenerateState,
    setAutoGenerateState,
  } = useDesignForm();

  const variants = useMemo(
    () => (extractedPalette ? generateThemeVariants(extractedPalette) : null),
    [extractedPalette]
  );
  const hasPalette = Boolean(variants && variants.length > 0);

  // Self-invalidate on logo change: if the cycle state was opened against a
  // different palette than the currently-loaded one (user uploaded a new
  // logo mid-cycle), treat it as idle.
  const activeMatches =
    autoGenerateState !== null && autoGenerateState.palette === extractedPalette;
  const currentIndex = activeMatches ? autoGenerateState!.index : null;

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
    setAutoGenerateState({ palette: extractedPalette, index: 0, snapshot });
    applyThemeVariant(variants[0]);
  };

  const cycle = () => {
    if (!variants || !activeMatches || !autoGenerateState) return;
    const next = (autoGenerateState.index + 1) % variants.length;
    setAutoGenerateState({ ...autoGenerateState, index: next });
    applyThemeVariant(variants[next]);
  };

  const cancel = () => {
    if (autoGenerateState?.snapshot) applyThemeVariant(autoGenerateState.snapshot);
    setAutoGenerateState(null);
  };

  if (currentIndex === null) {
    const label =
      !extractedPalette && !isPaletteLoading
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
        className={`group relative w-full overflow-hidden rounded-full px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 bg-gradient-to-r from-amber-500 to-orange-500 ${
          enabled
            ? 'shadow-[0_6px_20px_-6px_rgba(249,115,22,0.55)] hover:from-amber-600 hover:to-orange-600 hover:shadow-[0_8px_24px_-6px_rgba(234,88,12,0.6)] hover:-translate-y-[1px] active:translate-y-0'
            : 'opacity-50 cursor-not-allowed'
        }`}
      >
        {/* Pure-CSS shine sweep on hover. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 transition-transform duration-700 ease-out group-hover:translate-x-[400%]"
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
    // Outer ring matches the idle button's footprint: same total height
    // (py-2 inner + 1.5px ring outside ≈ py-3.5 of the idle pill). Inner
    // text uses `leading-tight` instead of `leading-none` — none would clip
    // the bottoms of ascenders/descenders, especially under the rounded-
    // full clip. `whitespace-nowrap` on the count keeps "2/5" intact even
    // when the name truncates.
    <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-[1.5px] shadow-[0_6px_20px_-6px_rgba(249,115,22,0.55)]">
      <div className="flex items-center gap-3 rounded-full bg-white pl-4 pr-1.5 py-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Sparkle
            className="w-4 h-4 text-orange-500 flex-shrink-0"
            weight="fill"
          />
          <span className="text-base font-bold text-[var(--foreground)] tabular-nums leading-tight whitespace-nowrap">
            {currentIndex + 1}/{variants!.length}
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
            {variantName}
          </span>
        </div>
        <button
          type="button"
          onClick={cycle}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:from-amber-600 hover:to-orange-600 transition-all hover:shadow-md flex-shrink-0"
        >
          <ArrowsCounterClockwise className="w-3.5 h-3.5" weight="bold" />
          {t('active.next')}
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label={t('active.cancel')}
          className="inline-flex items-center justify-center rounded-full w-7 h-7 text-[#888] hover:text-[var(--foreground)] hover:bg-[var(--paper-hover)] transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>
    </div>
  );
}
