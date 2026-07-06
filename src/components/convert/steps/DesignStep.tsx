'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { EditorCard } from '@/components/card/EditorCard';
import { InfoBox } from '@/components/reusables/info-box';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useDesignReady } from '@/components/onboarding/chapters/first-stamp/useDesignReady';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { createDesign, duplicateDesign } from '@/api/designs';
import { defaultPointsSampleBalance } from '@/lib/card-utils';
import type { CardDesign, CardDesignCreate } from '@/types';
import { useConvertWizard } from '../convert-context';
import { readTargetDraft } from '../target-draft';
import { ConvertDesignEditor } from './ConvertDesignEditor';

type DesignMode = 'reactivate' | 'editor' | null;

/** Brand seed for the new target-type design: everything the owner already
 * chose (logo, colors, organization name, back content) carries over; only
 * the type-specific surface starts from the closest equivalent color. */
function buildSeedDesign(
  active: CardDesign | null,
  opts: { name: string; description: string; organizationName: string; toType: 'stamp' | 'points' }
): CardDesignCreate {
  const seed: CardDesignCreate = {
    name: opts.name,
    description: active?.description || opts.description,
    organization_name: active?.organization_name || opts.organizationName,
    logo_text: active?.logo_text,
    foreground_color: active?.foreground_color,
    background_color: active?.background_color,
    label_color: active?.label_color,
    icon_color: active?.icon_color,
    card_type: opts.toType,
    back_fields: active?.back_fields ?? [],
    hidden_business_info_keys: active?.hidden_business_info_keys,
  };
  if (active?.logo_url) seed.logo_url = active.logo_url;
  if (opts.toType === 'points') {
    // Points lead color falls back to the stamp fill the owner picked.
    seed.progress_accent_color = active?.progress_accent_color || active?.stamp_filled_color;
    seed.strip_background_color = active?.strip_background_color;
  } else {
    seed.stamp_filled_color = active?.stamp_filled_color || active?.progress_accent_color;
    seed.stamp_empty_color = active?.stamp_empty_color;
    seed.stamp_border_color = active?.stamp_border_color;
    seed.stamp_icon = active?.stamp_icon;
    seed.reward_icon = active?.reward_icon;
  }
  return seed;
}

/**
 * The target-type card. Reactivation path first (inactive designs of the
 * matching type), otherwise an embedded DesignEditorV2 on a server-side
 * INACTIVE draft pre-seeded with the active design's brand. The created
 * design_id in the wizard draft is the resume anchor.
 */
export function DesignStep() {
  const t = useTranslations('conversion.steps.design');
  const tErr = useTranslations('conversion.errors');
  const ctx = useWizardStep();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id;
  const { program, toType } = useConvertWizard();
  const { data: designs = [], isLoading } = useDesigns(businessId);

  const activeDesign = designs.find((d) => d.is_active) ?? null;
  const matching = designs.filter(
    (d) => !d.is_active && (d.card_type ?? 'stamp') === toType
  );

  const [designId, setDesignId] = useWizardDraft<string | null>('design.designId', () => null);
  const [, setMode] = useWizardDraft<DesignMode>('design.mode', () => null);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  const chosenDesign = designId ? designs.find((d) => d.id === designId) ?? null : null;
  const targetDraft = readTargetDraft(ctx.getDraft, toType, program);

  // Stamp targets need the strip PNGs rendered before the card is usable.
  const needsStrips = toType === 'stamp';
  const { ready: stripsReady } = useDesignReady(
    businessId,
    needsStrips && designId ? designId : undefined,
    chosenDesign
  );

  const createNewDraft = useCallback(async () => {
    if (!businessId || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const seed = buildSeedDesign(activeDesign, {
        name: toType === 'points' ? t('defaultNamePoints') : t('defaultNameStamp'),
        description: program.name || currentBusiness?.name || '',
        organizationName: currentBusiness?.name || '',
        toType,
      });
      const created = await createDesign(businessId, seed);
      // Append synchronously so the editor mounts immediately and the
      // dangling-id self-heal below never mistakes the fresh draft (not yet
      // in the refetched list) for a stale one.
      queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (cached) =>
        cached ? [...cached.filter((d) => d.id !== created.id), created] : [created]
      );
      queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
      setDesignId(created.id);
      setMode('editor');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tErr('generic'));
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }, [
    businessId, activeDesign, toType, program.name, currentBusiness?.name,
    queryClient, setDesignId, setMode, t, tErr,
  ]);

  // Self-heal a dangling drafted design id: one that doesn't exist under
  // this business (deleted draft, or a draft leaked from another business
  // before the store was business-scoped) or whose type no longer matches
  // the direction (double conversion). Left in place it would 404-poll and
  // show "preparing your card" forever — drop it and let the flow restart.
  useEffect(() => {
    if (isLoading || !designId) return;
    const found = designs.find((d) => d.id === designId);
    if (!found || (found.card_type ?? 'stamp') !== toType) {
      setDesignId(null);
      setMode(null);
    }
  }, [isLoading, designId, designs, toType, setDesignId, setMode]);

  // No matching inactive design to offer: go straight to the editor by
  // creating the draft design (it is also the cross-device resume anchor).
  useEffect(() => {
    if (isLoading || designId || creating) return;
    if (matching.length === 0) void createNewDraft();
  }, [isLoading, designId, creating, matching.length, createNewDraft]);

  // Duplicate-then-edit: keeps the original card intact while the owner
  // adapts the copy for the new program type.
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const duplicateAndEdit = useCallback(
    async (source: CardDesign) => {
      if (!businessId || duplicatingId) return;
      setDuplicatingId(source.id);
      try {
        const copy = await duplicateDesign(businessId, source.id);
        queryClient.setQueryData<CardDesign[]>(designKeys.all(businessId), (cached) =>
          cached ? [...cached.filter((d) => d.id !== copy.id), copy] : [copy]
        );
        queryClient.invalidateQueries({ queryKey: designKeys.all(businessId) });
        setDesignId(copy.id);
        setMode('editor');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErr('generic'));
      } finally {
        setDuplicatingId(null);
      }
    },
    [businessId, duplicatingId, queryClient, setDesignId, setMode, tErr]
  );

  // While the embedded editor is mounted IT owns the footer gate and the
  // submit handler (it saves all sections on Continue). The parent only
  // registers them for the picker branch. No cleanups here: the shell resets
  // both on step navigation, and a cleanup would clobber the editor's
  // registration when it mounts (child effects run first).
  const editorMounted = !!designId && !!chosenDesign;
  useEffect(() => {
    if (editorMounted) return;
    ctx.setCanProceed(false);
  }, [ctx, editorMounted]);

  useEffect(() => {
    if (editorMounted) return;
    ctx.setSubmitHandler(async () => ({ ok: !!designId }));
  }, [ctx, designId, editorMounted]);

  // Same preview surface as the editor pane and the review step: EditorCard
  // rendered against the TARGET program values, so a points card shows the
  // drafted reward ladder and a stamp card the drafted goal.
  const previewProps =
    toType === 'points'
      ? {
          pointsRewards: targetDraft.pointsRewards,
          pointsBalance: defaultPointsSampleBalance(targetDraft.pointsRewards),
        }
      : {
          totalStamps: targetDraft.totalStamps,
          previewStamps: Math.max(1, Math.floor(targetDraft.totalStamps * 0.3)),
        };

  const header = (
    <header className="flex flex-col gap-1">
      <h2 className="wiz-h font-semibold text-[var(--foreground)]">
        {toType === 'points' ? t('titleToPoints') : t('titleToStamp')}
      </h2>
      <p className="wiz-body text-[#7A7A7A]">{t('subtitle')}</p>
    </header>
  );

  if (isLoading || (creating && !designId)) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex items-center gap-2 py-10 text-[14px] text-[#7A7A7A]">
          <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" />
          {t('creating')}
        </div>
      </div>
    );
  }

  // ── Reactivation picker ─────────────────────────────────────────────────
  if (!designId && matching.length > 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div>
          <p className="text-[14px] font-semibold text-[var(--foreground)]">
            {t('picker.title', { count: matching.length })}
          </p>
          <p className="mt-0.5 text-[13px] text-[#7A7A7A]">{t('picker.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-6 min-[560px]:grid-cols-2">
          {matching.map((design) => (
            <div key={design.id} className="flex flex-col gap-3">
              <EditorCard design={design} {...previewProps} />
              <span className="truncate px-0.5 text-[13px] font-medium text-[var(--foreground)]">
                {design.name}
              </span>
              <div className="mt-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDesignId(design.id);
                    setMode('editor');
                  }}
                  className="flex-1 rounded-[10px] bg-[var(--accent)] px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  {t('picker.modify')}
                </button>
                <button
                  type="button"
                  onClick={() => void duplicateAndEdit(design)}
                  disabled={duplicatingId !== null}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[13px] font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] disabled:opacity-60"
                >
                  {duplicatingId === design.id && (
                    <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" />
                  )}
                  {t('picker.duplicate')}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void createNewDraft()}
            disabled={creating}
            className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--paper)] p-4 text-[13px] font-medium text-[#7A7A7A] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
          >
            {creating ? (
              <SpinnerGapIcon className="h-5 w-5 animate-spin" weight="bold" />
            ) : (
              <PlusIcon className="h-5 w-5" weight="bold" />
            )}
            {t('picker.designNew')}
          </button>
        </div>
      </div>
    );
  }

  // ── Embedded editor on the created conversion draft ─────────────────────
  return (
    <div className="flex flex-col gap-6">
      {header}
      {needsStrips && designId && !stripsReady && (
        <InfoBox variant="note" message={t('stripPending')} />
      )}
      {matching.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setDesignId(null);
            setMode(null);
          }}
          className="w-fit text-[13px] font-medium text-[var(--accent)] hover:underline"
        >
          {t('picker.changeChoice')}
        </button>
      )}
      {chosenDesign ? (
        <ConvertDesignEditor
          design={chosenDesign}
          targetDraft={targetDraft}
          stripsReady={stripsReady}
        />
      ) : (
        <div className="flex items-center gap-2 py-10 text-[14px] text-[#7A7A7A]">
          <SpinnerGapIcon className="h-4 w-4 animate-spin" weight="bold" />
          {t('creating')}
        </div>
      )}
    </div>
  );
}
