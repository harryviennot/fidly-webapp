'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlusIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import DesignEditorV2, { type DesignEditorRef } from '@/components/design/DesignEditorV2';
import { WalletCard, ScaledCardWrapper } from '@/components/card';
import { InfoBox } from '@/components/reusables/info-box';
import { useWizardDraft, useWizardStep } from '@/components/onboarding/wizard-context';
import { useDesignReady } from '@/components/onboarding/chapters/first-stamp/useDesignReady';
import { useBusiness } from '@/contexts/business-context';
import { useDesigns, designKeys } from '@/hooks/use-designs';
import { createDesign } from '@/api/designs';
import { defaultPointsSampleBalance } from '@/lib/card-utils';
import type { CardDesign, CardDesignCreate } from '@/types';
import { useConvertWizard } from '../convert-context';
import { readTargetDraft } from '../target-draft';

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
  const [mode, setMode] = useWizardDraft<DesignMode>('design.mode', () => null);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const editorRef = useRef<DesignEditorRef>(null);

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

  // Continue is allowed once a design is chosen (and, for stamp targets, its
  // strips finished rendering).
  const canProceed = !!designId && (!needsStrips || stripsReady);
  useEffect(() => {
    ctx.setCanProceed(canProceed);
  }, [ctx, canProceed]);

  // Save pending editor work before advancing.
  useEffect(() => {
    ctx.setSubmitHandler(async () => {
      if (!designId) return { ok: false };
      if (mode === 'editor' && editorRef.current?.isDirty) {
        const ok = await editorRef.current.handleSave();
        if (!ok) return { ok: false };
      }
      return { ok: true };
    });
    return () => ctx.setSubmitHandler(null);
  }, [ctx, designId, mode]);

  const header = (
    <header className="flex flex-col gap-1">
      <h2 className="text-[22px] font-semibold text-[var(--foreground)]">
        {toType === 'points' ? t('titleToPoints') : t('titleToStamp')}
      </h2>
      <p className="text-[14px] text-[#7A7A7A]">{t('subtitle')}</p>
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
        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
          {matching.map((design) => (
            <button
              key={design.id}
              type="button"
              onClick={() => {
                setDesignId(design.id);
                setMode('reactivate');
              }}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:border-[var(--accent)]"
            >
              <ScaledCardWrapper dynamicHeight>
                <WalletCard
                  design={design}
                  showQR={false}
                  showSecondaryFields
                  pointsRewards={toType === 'points' ? targetDraft.pointsRewards : undefined}
                  pointsBalance={
                    toType === 'points'
                      ? defaultPointsSampleBalance(targetDraft.pointsRewards)
                      : undefined
                  }
                  totalStamps={toType === 'stamp' ? targetDraft.totalStamps : undefined}
                  stamps={toType === 'stamp' ? Math.min(4, targetDraft.totalStamps) : undefined}
                />
              </ScaledCardWrapper>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                  {design.name}
                </span>
                <span className="flex-shrink-0 text-[12px] font-semibold text-[var(--accent)]">
                  {t('picker.reactivate')}
                </span>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => void createNewDraft()}
            disabled={creating}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--paper)] p-4 text-[13px] font-medium text-[#7A7A7A] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
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

  // ── Reactivated design chosen ───────────────────────────────────────────
  if (designId && mode === 'reactivate') {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {chosenDesign && (
          <div className="mx-auto w-full max-w-[360px]">
            <ScaledCardWrapper dynamicHeight>
              <WalletCard
                design={chosenDesign}
                showQR={false}
                showSecondaryFields
                pointsRewards={toType === 'points' ? targetDraft.pointsRewards : undefined}
                pointsBalance={
                  toType === 'points'
                    ? defaultPointsSampleBalance(targetDraft.pointsRewards)
                    : undefined
                }
                totalStamps={toType === 'stamp' ? targetDraft.totalStamps : undefined}
                stamps={toType === 'stamp' ? Math.min(4, targetDraft.totalStamps) : undefined}
              />
            </ScaledCardWrapper>
          </div>
        )}
        <InfoBox variant="info" message={t('chosen')} />
        {needsStrips && !stripsReady && (
          <InfoBox variant="note" message={t('stripPending')} />
        )}
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
        <DesignEditorV2
          ref={editorRef}
          design={chosenDesign}
          hideActivate
          programType={toType}
          programTotalStamps={toType === 'stamp' ? targetDraft.totalStamps : undefined}
          programName={program.name}
          programRewardName={toType === 'stamp' ? targetDraft.rewardName : null}
          programRewards={toType === 'points' ? targetDraft.pointsRewards : undefined}
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
