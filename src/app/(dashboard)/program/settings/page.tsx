'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/components/redesign';
import { SaveBar } from '@/components/reusables/save-bar';
import { SettingsPageSkeleton } from '@/components/loyalty-program/skeletons/SettingsPageSkeleton';
import {
  ProgramDetailsForm,
  type ProgramDetailsValue,
} from '@/components/program/forms/ProgramDetailsForm';
import {
  DataCollectionForm,
  type DataCollectionValue,
} from '@/components/program/forms/DataCollectionForm';
import {
  StampGoalChangeDialog,
  type GoalChangeStrategy,
  type StampGoalDialogVariant,
} from '@/components/program/StampGoalChangeDialog';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { getStampGoalImpact } from '@/api/programs';
import { useProgram } from '../layout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { normalizeFieldMode } from '@/lib/customer-data-collection';
import { currencySymbol } from '@/lib/currency';
import { isPointsProgram, isStampProgram } from '@/types';
import type { FieldCollectionMode } from '@/types/business';
import type { LoyaltyProgram, StampGoalImpact } from '@/types';

const DEFAULT_DATA_COLLECTION: DataCollectionValue = {
  collect_name: 'off',
  collect_email: 'off',
  collect_phone: 'off',
};

const DEFAULT_PROGRAM_DETAILS: ProgramDetailsValue = {
  programName: '',
  totalStamps: 10,
  rewardName: '',
  initialStamps: 0,
  stackableRewards: false,
  maxStackedRewards: null,
  pointsRate: 1,
  pointsRewards: [],
  maxBalance: null,
};

/** Project a program row into the form's value shape, by type. */
function programToDetails(program: LoyaltyProgram): ProgramDetailsValue {
  const points = isPointsProgram(program);
  const stamp = isStampProgram(program);
  return {
    programName: program.name || '',
    totalStamps: stamp ? program.config.total_stamps ?? 10 : 10,
    rewardName: program.reward_name || '',
    initialStamps: stamp ? program.config.initial_stamps ?? 0 : 0,
    stackableRewards: stamp ? program.config.stackable_rewards ?? false : false,
    maxStackedRewards: stamp ? program.config.max_stacked_rewards ?? null : null,
    pointsRate: points ? program.config.points_per_currency_unit ?? 1 : 1,
    pointsRewards: points ? program.config.rewards ?? [] : [],
    maxBalance: points ? program.config.max_balance ?? null : null,
  };
}

function readDataCollection(
  dc: Partial<Record<keyof DataCollectionValue, FieldCollectionMode | boolean>> | undefined
): DataCollectionValue {
  return {
    collect_name: normalizeFieldMode(dc?.collect_name),
    collect_email: normalizeFieldMode(dc?.collect_email),
    collect_phone: normalizeFieldMode(dc?.collect_phone),
  };
}

export default function ProgramSettingsPage() {
  const { currentBusiness, currentRole, refetch } = useBusiness();
  const { program, activeDesign, loading, updateProgram } = useProgram();
  const t = useTranslations('loyaltyProgram');
  const tConversion = useTranslations('conversion.entry');
  const isPoints = isPointsProgram(program);
  const currency = currencySymbol(currentBusiness?.country, currentBusiness?.primary_locale);

  // ── Program details ──────────────────────────────────────────────────────
  const [programDetails, setProgramDetails] = useState<ProgramDetailsValue>(DEFAULT_PROGRAM_DETAILS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mark the program as user-configured on first visit, even if nothing changes.
  const markedAsConfigured = useRef(false);
  useEffect(() => {
    if (program?.id && !program.config?.user_configured && !markedAsConfigured.current) {
      markedAsConfigured.current = true;
      updateProgram({ config: { ...program.config, user_configured: true } }).catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  // Sync from program on load (and after a save refreshes it).
  useEffect(() => {
    if (!program) return;
    setProgramDetails(programToDetails(program));
  }, [program]);

  const programDirty = program
    ? JSON.stringify(programDetails) !== JSON.stringify(programToDetails(program))
    : false;

  // ── Data collection ──────────────────────────────────────────────────────
  const [dataCollection, setDataCollection] = useState<DataCollectionValue>(DEFAULT_DATA_COLLECTION);
  // Persisted baseline, seeded from the business and updated on save.
  const [savedDataCollection, setSavedDataCollection] =
    useState<DataCollectionValue>(DEFAULT_DATA_COLLECTION);

  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (initialSyncDone.current) return;
    const dc = currentBusiness?.settings?.customer_data_collection;
    if (!dc) return;
    initialSyncDone.current = true;
    const normalized = readDataCollection(dc);
    setDataCollection(normalized);
    setSavedDataCollection(normalized);
  }, [currentBusiness]);

  const dataCollectionDirty =
    JSON.stringify(dataCollection) !== JSON.stringify(savedDataCollection);

  const isDirty = programDirty || dataCollectionDirty;

  // ── Pre-save impact dialog (goal change / stackable toggle-off) ──────────
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalDialogVariant, setGoalDialogVariant] = useState<StampGoalDialogVariant>('raise');
  const [goalImpact, setGoalImpact] = useState<StampGoalImpact | null>(null);

  /** Persist both sections. Program errors toast in the layout; data errors here. */
  const doSave = async (strategy?: GoalChangeStrategy) => {
    if (!currentBusiness?.id) return;
    setSaving(true);
    let ok = true;

    if (programDirty) {
      try {
        // Spread the existing config: the backend replaces the JSONB
        // wholesale, so a partial object would wipe keys we don't manage here.
        const config = isPoints
          ? {
              ...program?.config,
              points_per_currency_unit: programDetails.pointsRate ?? 1,
              rewards: programDetails.pointsRewards ?? [],
              max_balance: programDetails.maxBalance ?? null,
              user_configured: true,
            }
          : {
              ...program?.config,
              total_stamps: programDetails.totalStamps,
              initial_stamps: programDetails.initialStamps,
              stackable_rewards: programDetails.stackableRewards,
              max_stacked_rewards: programDetails.maxStackedRewards,
              user_configured: true,
            };
        await updateProgram({
          name: programDetails.programName,
          config,
          reward_name: isPoints ? null : programDetails.rewardName || null,
          ...(strategy ? { existing_customers_strategy: strategy } : {}),
        });
      } catch {
        ok = false; // toast already shown in layout
      }
    }

    if (ok && dataCollectionDirty) {
      try {
        await updateBusiness(currentBusiness.id, {
          settings: {
            ...currentBusiness.settings,
            customer_data_collection: dataCollection,
          },
        });
        setSavedDataCollection(dataCollection);
        refetch().catch(() => { });
      } catch {
        ok = false;
        toast.error(t('toasts.settingsFailed'));
      }
    }

    if (ok) {
      setGoalDialogOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!currentBusiness?.id || !program?.id) return;

    // Points programs have no stamp-goal concept — the impact dialog (raise /
    // lower goal, stackable toggle-off) is stamp-only. Save directly.
    if (isPoints || !isStampProgram(program)) {
      await doSave();
      return;
    }

    const oldTotal = program.config.total_stamps ?? 10;
    const totalChanged = programDetails.totalStamps !== oldTotal;
    const stackableTurnedOff =
      (program.config.stackable_rewards ?? false) && !programDetails.stackableRewards;

    // Nothing in the program touches existing customers: save directly.
    if (!programDirty || (!totalChanged && !stackableTurnedOff)) {
      await doSave();
      return;
    }

    setSaving(true);
    try {
      const impact = await getStampGoalImpact(
        currentBusiness.id,
        program.id,
        programDetails.totalStamps
      );
      setSaving(false);

      if (totalChanged && impact.direction === 'raise' && impact.affected_count > 0) {
        setGoalImpact(impact);
        setGoalDialogVariant('raise');
        setGoalDialogOpen(true);
        return;
      }
      if (totalChanged && impact.direction === 'lower' && impact.affected_count > 0) {
        setGoalImpact(impact);
        setGoalDialogVariant('lower');
        setGoalDialogOpen(true);
        return;
      }
      if (stackableTurnedOff && impact.banked_rewards_count > 0) {
        setGoalImpact(impact);
        setGoalDialogVariant('stackable_off');
        setGoalDialogOpen(true);
        return;
      }
      await doSave();
    } catch {
      // Impact preview failed: don't block the save, apply the backend's
      // default (keep stamps / keep-and-drain).
      setSaving(false);
      await doSave();
    }
  };

  /** Discard unsaved edits in both sections, back to last-saved values. */
  const handleRevert = () => {
    if (program) setProgramDetails(programToDetails(program));
    setDataCollection(savedDataCollection);
  };

  // ── Recap helpers ─────────────────────────────────────────────────────────
  const isAnonymousMode =
    dataCollection.collect_name === 'off' &&
    dataCollection.collect_email === 'off' &&
    dataCollection.collect_phone === 'off';

  const rewardLabel = programDetails.rewardName.trim() || t('rewardFallback');

  const dataCollectedValue = isAnonymousMode
    ? t('anonymous')
    : [
        dataCollection.collect_name !== 'off' && t('dataFields.name'),
        dataCollection.collect_email !== 'off' && t('dataFields.email'),
        dataCollection.collect_phone !== 'off' && t('dataFields.phone'),
      ]
        .filter(Boolean)
        .join(', ');

  const summaryRows: Array<[string, string]> = useMemo(
    () =>
      isPoints
        ? [
            [t('overview.type'), t('pointsType')],
            [
              t('points.summary.rate'),
              t('points.summary.rateValue', {
                currency,
                points: programDetails.pointsRate ?? 1,
              }),
            ],
            [
              t('points.summary.rewards'),
              `${programDetails.pointsRewards?.length ?? 0}`,
            ],
            [
              t('points.summary.cap'),
              programDetails.maxBalance != null
                ? t('points.summary.capValue', { max: programDetails.maxBalance })
                : t('points.summary.noCap'),
            ],
            [t('overview.dataCollected'), dataCollectedValue],
          ]
        : [
            [t('overview.type'), t('stampsType')],
            [t('overview.stampsRequired'), `${programDetails.totalStamps}`],
            [t('overview.reward'), programDetails.rewardName.trim() || '—'],
            [t('overview.dataCollected'), dataCollectedValue],
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPoints, programDetails, dataCollectedValue, currency]
  );

  const designHref = activeDesign ? `/design/${activeDesign.id}` : '/program/templates';

  if (loading && !program) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader title={t('programSettings')} subtitle={t('configureProgram')} />

      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Program Details card */}
          <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
            <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">{t('programDetails')}</div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('programDetailsSubtitle')}</div>
            <ProgramDetailsForm
              value={programDetails}
              onChange={setProgramDetails}
              activeDesign={activeDesign}
              loyaltyType={program?.type ?? 'stamp'}
              currency={currency}
            />
          </section>

          {/* Data Collection card */}
          <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
            <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">{t('dataCollection')}</div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('dataCollectionDescription')}</div>
            <DataCollectionForm value={dataCollection} onChange={setDataCollection} />
          </section>

          {/* Program type switch — the conversion wizard's entry point. Owner
              only: the wizard restructures every customer's balance. */}
          {currentRole === 'owner' && program && (
            <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6">
              <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">
                {tConversion('title')}
              </div>
              <div className="text-[12px] text-[#A0A0A0] mb-3">
                {isPoints ? tConversion('currentPoints') : tConversion('currentStamp')}
              </div>
              <p className="text-[13px] leading-[1.5] text-[#555]">{tConversion('body')}</p>
              <Link
                href="/convert"
                className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {isPoints ? tConversion('ctaToStamp') : tConversion('ctaToPoints')}
                <ArrowRightIcon className="h-4 w-4" weight="bold" />
              </Link>
            </section>
          )}
        </div>

        {/* Right column — recap (sticky on desktop, inline at the bottom on mobile) */}
        <div className="w-full min-[1080px]:w-[290px] min-[1080px]:min-w-[290px] flex-shrink-0 flex flex-col">
          <div className="min-[1080px]:sticky min-[1080px]:top-5">
            <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px]">
              <div className="text-[15px] font-semibold text-[#1A1A1A] mb-2.5">{t('recap.title')}</div>

              {/* Plain-language rule */}
              <p className="text-[13px] leading-[1.5] text-[#555]">
                {isPoints
                  ? t.rich('points.recap.earn', {
                      currency,
                      points: programDetails.pointsRate ?? 1,
                      b: (chunks) => <strong className="font-semibold text-[#1A1A1A]">{chunks}</strong>,
                    })
                  : t.rich('recap.earn', {
                      reward: rewardLabel,
                      stamps: programDetails.totalStamps,
                      b: (chunks) => <strong className="font-semibold text-[#1A1A1A]">{chunks}</strong>,
                    })}
              </p>
              {!isPoints && programDetails.initialStamps > 0 && (
                <p className="text-[13px] leading-[1.5] text-[#555] mt-1.5">
                  {t('recap.headStart', { count: programDetails.initialStamps })}
                </p>
              )}

              {/* Summary rows */}
              <div className="mt-4 pt-1">
                {summaryRows.map(([label, value], i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center gap-3 py-2"
                    style={{ borderBottom: i < summaryRows.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                  >
                    <span className="text-[12px] text-[#8A8A8A] flex-shrink-0">{label}</span>
                    <span
                      className={cn(
                        'text-[12px] font-semibold text-right',
                        label === t('overview.dataCollected') && isAnonymousMode
                          ? 'text-[var(--warning)]'
                          : 'text-[#1A1A1A]'
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={designHref}
                className="mt-3.5 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                {t('overview.editDesign')}
                <ArrowRightIcon className="w-3.5 h-3.5" weight="bold" />
              </Link>
            </section>
          </div>
        </div>
      </div>

      <SaveBar
        dirty={isDirty}
        saving={saving}
        saved={saved}
        onSave={handleSave}
        onRevert={handleRevert}
        saveLabel={t('saveProgram')}
        savingLabel={t('saving')}
        savedLabel={t('saved')}
        revertLabel={t('revert')}
        message={isDirty ? t('unsavedChanges') : undefined}
        className="-mx-4 md:-mx-6 -mb-4 md:-mb-6"
      />

      <StampGoalChangeDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        variant={goalDialogVariant}
        impact={goalImpact}
        nextStackable={programDetails.stackableRewards}
        onConfirm={(strategy) => doSave(strategy)}
        isConfirming={saving}
      />
    </div>
  );
}
