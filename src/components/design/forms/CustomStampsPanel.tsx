'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretDown, CaretLeft, CaretRight, Info, Spinner } from '@phosphor-icons/react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { StampIconUploader } from '@/components/design/StampIconUploader';
import { useBusiness } from '@/contexts/business-context';
import { reprocessStampIcon } from '@/api';
import { useDesignForm } from './DesignFormContext';
import type {
  CustomStampArrangement,
  CustomStampConfig,
  CustomStampEmptyMode,
  ProcessedIconAsset,
} from '@/types';
import { cn } from '@/lib/utils';

const EMPTY_CONFIG: CustomStampConfig = {
  icons: [],
  reward_icon: null,
  empty_icon: null,
  empty_mode: 'greyscale',
  arrangement: 'straight',
  empty_opacity: 100,
};

/**
 * Custom stamp icons panel (STA-216). Replaces the preset pickers AND the
 * stamp color pickers — custom icons float directly on the strip, there is
 * no circle to color. Progressive disclosure: rotation and the custom
 * reward stamp start collapsed; most merchants only ever touch the primary
 * upload.
 *
 * stamp_icon_mode only flips to 'custom' once at least one icon exists, so
 * a half-configured panel never breaks the preview or the save.
 */
export function CustomStampsPanel() {
  const t = useTranslations('designEditor.customStamps');
  const { currentBusiness } = useBusiness();
  const { formData, updateField, designId } = useDesignForm();
  // Background removal defaults ON (most uploads are photos or logos on a
  // background); for a saved design, reflect what the primary upload
  // actually used so the switch isn't lying.
  const [removeBg, setRemoveBg] = useState<boolean>(
    () => formData.custom_stamp_config?.icons?.[0]?.bg_removed ?? true
  );
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);

  const config = formData.custom_stamp_config ?? EMPTY_CONFIG;
  const icons = config.icons ?? [];

  const setConfig = (partial: Partial<CustomStampConfig>) => {
    const next = { ...config, ...partial };
    updateField('custom_stamp_config', next);
    updateField('stamp_icon_mode', (next.icons?.length ?? 0) > 0 ? 'custom' : 'preset');
  };

  /**
   * The toggle is a design-level setting: flipping it re-processes every
   * uploaded asset's stored original on the server with the new value, so
   * the cutout (or its undo) is immediately visible on the live preview.
   */
  const handleRemoveBgChange = async (next: boolean) => {
    setRemoveBg(next);
    setReprocessError(null);
    const hasAssets = icons.length > 0 || config.reward_icon || config.empty_icon;
    if (!hasAssets || !currentBusiness?.id || !designId) return;

    setReprocessing(true);
    try {
      const redo = (asset: ProcessedIconAsset) =>
        reprocessStampIcon(currentBusiness.id, designId, asset.id, next);

      const [newIcons, newReward, newEmpty] = await Promise.all([
        Promise.all(icons.map(redo)),
        config.reward_icon ? redo(config.reward_icon) : Promise.resolve(null),
        config.empty_icon ? redo(config.empty_icon) : Promise.resolve(null),
      ]);
      setConfig({ icons: newIcons, reward_icon: newReward, empty_icon: newEmpty });
    } catch (err) {
      setRemoveBg(!next);
      setReprocessError(err instanceof Error ? err.message : t('uploadError'));
    } finally {
      setReprocessing(false);
    }
  };

  if (!designId) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/60 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>{t('saveFirst')}</p>
      </div>
    );
  }

  const setIconAt = (index: number, asset: ProcessedIconAsset) => {
    const next = [...icons];
    next[index] = asset;
    setConfig({ icons: next });
  };

  const removeIconAt = (index: number) => {
    setConfig({ icons: icons.filter((_, i) => i !== index) });
  };

  const moveIcon = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= icons.length) return;
    const next = [...icons];
    [next[index], next[target]] = [next[target], next[index]];
    setConfig({ icons: next });
  };

  const primary = icons[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Primary icon + background removal */}
      <div className="flex flex-col gap-3">
        <Label>{t('primaryLabel')}</Label>
        <div className="flex items-start gap-4">
          <StampIconUploader
            asset={primary}
            designId={designId}
            removeBg={removeBg}
            processing={reprocessing}
            onUploaded={(asset) =>
              primary ? setIconAt(0, asset) : setConfig({ icons: [asset] })
            }
            onRemove={icons.length > 0 ? () => removeIconAt(0) : undefined}
            label={t('uploadLabel')}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-normal flex items-center gap-1.5">
                {t('removeBg')}
                {reprocessing && <Spinner className="w-3.5 h-3.5 animate-spin" />}
              </Label>
              <Switch
                checked={removeBg}
                onCheckedChange={(v) => void handleRemoveBgChange(v)}
                disabled={reprocessing}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('removeBgHint')}</p>
            {reprocessError && (
              <p className="text-xs text-destructive mt-1">{reprocessError}</p>
            )}
          </div>
        </div>
      </div>

      {primary && (
        <>
          {/* Empty stamp style */}
          <div className="flex flex-col gap-3">
            <Label>{t('emptyStyleLabel')}</Label>
            <div className="flex gap-2">
              {(
                [
                  { mode: 'greyscale' as const, src: primary.greyscale_url },
                  { mode: 'outline' as const, src: primary.outline_url },
                  { mode: 'custom' as const, src: config.empty_icon?.processed_url },
                ] satisfies { mode: CustomStampEmptyMode; src?: string }[]
              ).map(({ mode, src }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setConfig({ empty_mode: mode })}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border transition-colors',
                    config.empty_mode === mode
                      ? 'border-foreground bg-muted/60'
                      : 'border-border hover:bg-muted/40'
                  )}
                >
                  <span className="w-8 h-8 flex items-center justify-center">
                    {src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{ opacity: (config.empty_opacity ?? 100) / 100 }}
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full border border-dashed border-muted-foreground/50" />
                    )}
                  </span>
                  <span className="text-xs font-medium">{t(`empty_${mode}`)}</span>
                </button>
              ))}
            </div>
            {config.empty_mode === 'custom' && (
              <div className="flex items-center gap-3">
                <StampIconUploader
                  asset={config.empty_icon}
                  designId={designId}
                  removeBg={removeBg}
                  processing={reprocessing}
                  size={56}
                  onUploaded={(asset) => setConfig({ empty_icon: asset })}
                  onRemove={() => setConfig({ empty_icon: null, empty_mode: 'greyscale' })}
                  label={t('emptyUploadLabel')}
                />
                <p className="text-xs text-muted-foreground">{t('emptyCustomHint')}</p>
              </div>
            )}

            {/* Empty-slot opacity: applied at render time (CSS opacity in the
                preview, alpha multiply in the strip generator) — sliding it
                never re-processes the uploads. */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">{t('emptyOpacityLabel')}</Label>
                <span className="text-sm text-muted-foreground">
                  {config.empty_opacity ?? 100}%
                </span>
              </div>
              <input
                type="range"
                className="styled-slider w-full"
                min={10}
                max={100}
                value={config.empty_opacity ?? 100}
                onChange={(e) =>
                  setConfig({ empty_opacity: parseInt(e.target.value, 10) })
                }
              />
            </div>
          </div>

          {/* Arrangement */}
          <div className="flex flex-col gap-3">
            <Label>{t('arrangementLabel')}</Label>
            <div className="flex gap-2">
              {(['straight', 'staggered', 'overlap'] satisfies CustomStampArrangement[]).map(
                (arrangement) => (
                  <button
                    key={arrangement}
                    type="button"
                    onClick={() => setConfig({ arrangement })}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border transition-colors',
                      config.arrangement === arrangement
                        ? 'border-foreground bg-muted/60'
                        : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <ArrangementGlyph arrangement={arrangement} />
                    <span className="text-xs font-medium">
                      {t(`arrangement_${arrangement}`)}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Advanced: different icon per stamp */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-1">
              {t('advancedTitle')}
              <CaretDown
                className={cn('w-4 h-4 transition-transform', advancedOpen && 'rotate-180')}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">{t('advancedHint')}</p>
                <div className="flex flex-wrap gap-3">
                  {icons.map((asset, index) => (
                    <div key={asset.id} className="flex flex-col items-center gap-1">
                      <StampIconUploader
                        asset={asset}
                        designId={designId}
                        removeBg={removeBg}
                        processing={reprocessing}
                        size={56}
                        onUploaded={(next) => setIconAt(index, next)}
                        onRemove={() => removeIconAt(index)}
                      />
                      {icons.length > 1 && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveIcon(index, -1)}
                            disabled={index === 0}
                            aria-label={t('moveLeft')}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <CaretLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveIcon(index, 1)}
                            disabled={index === icons.length - 1}
                            aria-label={t('moveRight')}
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <CaretRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {icons.length < 12 && (
                    <StampIconUploader
                      asset={null}
                      designId={designId}
                      removeBg={removeBg}
                      size={56}
                      onUploaded={(asset) => setConfig({ icons: [...icons, asset] })}
                      label={t('addIcon')}
                    />
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Custom reward stamp */}
          <Collapsible open={rewardOpen} onOpenChange={setRewardOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-1">
              {t('rewardTitle')}
              <CaretDown
                className={cn('w-4 h-4 transition-transform', rewardOpen && 'rotate-180')}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3 flex items-center gap-3">
                <StampIconUploader
                  asset={config.reward_icon}
                  designId={designId}
                  removeBg={removeBg}
                  processing={reprocessing}
                  size={56}
                  onUploaded={(asset) => setConfig({ reward_icon: asset })}
                  onRemove={() => setConfig({ reward_icon: null })}
                  label={t('rewardTitle')}
                />
                <p className="text-xs text-muted-foreground">{t('rewardHint')}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}

/** Tiny schematic of the three arrangements, drawn with dots. */
function ArrangementGlyph({ arrangement }: { arrangement: CustomStampArrangement }) {
  const dots =
    arrangement === 'overlap'
      ? // Tight pitch + deep drop: neighbors visibly overlap
        [
          { x: 6, y: 9 },
          { x: 13, y: 16 },
          { x: 20, y: 9 },
          { x: 27, y: 16 },
          { x: 34, y: 9 },
          { x: 41, y: 16 },
        ]
      : arrangement === 'staggered'
        ? // Normal pitch + subtle drop
          [
            { x: 6, y: 11 },
            { x: 15, y: 15 },
            { x: 24, y: 11 },
            { x: 33, y: 15 },
            { x: 42, y: 11 },
          ]
        : [
            { x: 6, y: 13 },
            { x: 15, y: 13 },
            { x: 24, y: 13 },
            { x: 33, y: 13 },
            { x: 42, y: 13 },
          ];
  const r = arrangement === 'overlap' ? 5 : 4;
  return (
    <svg width="48" height="26" viewBox="0 0 48 26" aria-hidden>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={r} className="fill-current opacity-70" />
      ))}
    </svg>
  );
}
