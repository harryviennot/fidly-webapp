'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { WalletCard } from '@/components/card';
import { ScaledCardWrapper } from '@/components/design/ScaledCardWrapper';
import { PageHeader } from '@/components/redesign';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
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

import type { FieldCollectionMode } from '@/types/business';
import type { StampGoalImpact } from '@/types';

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
};

/** Normalise legacy boolean values to the new tri-state. */
function normalizeFieldMode(value: FieldCollectionMode | boolean | undefined): FieldCollectionMode {
  if (value === true) return 'required';
  if (value === false || value === undefined) return 'off';
  return value;
}

export default function ProgramSettingsPage() {
  const { currentBusiness } = useBusiness();
  const { program, activeDesign, loading, updateProgram } = useProgram();
  const t = useTranslations('loyaltyProgram');

  // ── Program details ──────────────────────────────────────────────────────
  const [programDetails, setProgramDetails] = useState<ProgramDetailsValue>(DEFAULT_PROGRAM_DETAILS);
  const [savingProgram, setSavingProgram] = useState(false);
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

  // Sync from program on load.
  useEffect(() => {
    if (!program) return;
    setProgramDetails({
      programName: program.name || '',
      totalStamps: program.config?.total_stamps ?? 10,
      rewardName: program.reward_name || '',
      initialStamps: program.config?.initial_stamps ?? 0,
      stackableRewards: program.config?.stackable_rewards ?? false,
      maxStackedRewards: program.config?.max_stacked_rewards ?? null,
    });
  }, [program]);

  const isDirty = program
    ? programDetails.programName !== (program.name || '') ||
      programDetails.totalStamps !== (program.config?.total_stamps ?? 10) ||
      programDetails.rewardName !== (program.reward_name || '') ||
      programDetails.initialStamps !== (program.config?.initial_stamps ?? 0) ||
      programDetails.stackableRewards !== (program.config?.stackable_rewards ?? false) ||
      programDetails.maxStackedRewards !== (program.config?.max_stacked_rewards ?? null)
    : false;

  // ── Pre-save impact dialog (goal change / stackable toggle-off) ──────────
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalDialogVariant, setGoalDialogVariant] = useState<StampGoalDialogVariant>('raise');
  const [goalImpact, setGoalImpact] = useState<StampGoalImpact | null>(null);

  const doSaveProgram = async (strategy?: GoalChangeStrategy) => {
    setSavingProgram(true);
    try {
      // Spread the existing config: the backend replaces the JSONB
      // wholesale, so a partial object would wipe keys we don't manage here.
      await updateProgram({
        name: programDetails.programName,
        config: {
          ...program?.config,
          total_stamps: programDetails.totalStamps,
          initial_stamps: programDetails.initialStamps,
          stackable_rewards: programDetails.stackableRewards,
          max_stacked_rewards: programDetails.maxStackedRewards,
          user_configured: true,
        },
        reward_name: programDetails.rewardName || null,
        ...(strategy ? { existing_customers_strategy: strategy } : {}),
      });
      setGoalDialogOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // toast already shown in layout
    } finally {
      setSavingProgram(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!currentBusiness?.id || !program?.id) return;

    const oldTotal = program.config?.total_stamps ?? 10;
    const totalChanged = programDetails.totalStamps !== oldTotal;
    const stackableTurnedOff =
      (program.config?.stackable_rewards ?? false) && !programDetails.stackableRewards;

    // No customer impact to surface: save directly.
    if (!totalChanged && !stackableTurnedOff) {
      await doSaveProgram();
      return;
    }

    setSavingProgram(true);
    try {
      const impact = await getStampGoalImpact(
        currentBusiness.id,
        program.id,
        programDetails.totalStamps
      );
      setSavingProgram(false);

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
      await doSaveProgram();
    } catch {
      // Impact preview failed: don't block the save, just apply the
      // backend's default (keep stamps / keep-and-drain).
      setSavingProgram(false);
      await doSaveProgram();
    }
  };

  // ── Data collection ──────────────────────────────────────────────────────
  const [dataCollection, setDataCollection] = useState<DataCollectionValue>(DEFAULT_DATA_COLLECTION);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (initialSyncDone.current) return;
    const dc = currentBusiness?.settings?.customer_data_collection;
    if (!dc) return;
    initialSyncDone.current = true;
    const normalized: DataCollectionValue = {
      collect_name: normalizeFieldMode(dc.collect_name),
      collect_email: normalizeFieldMode(dc.collect_email),
      collect_phone: normalizeFieldMode(dc.collect_phone),
    };
    setDataCollection(normalized);
    lastSavedRef.current = normalized;
  }, [currentBusiness]);

  // Debounced save — accumulate rapid toggles into one API call.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(dataCollection);
  settingsRef.current = dataCollection;
  const lastSavedRef = useRef<DataCollectionValue>(DEFAULT_DATA_COLLECTION);

  const scheduleSave = useCallback(() => {
    if (!currentBusiness?.id) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSavingSettings(true);
    debounceTimer.current = setTimeout(async () => {
      const latest = settingsRef.current;
      try {
        await updateBusiness(currentBusiness.id, {
          settings: {
            ...currentBusiness.settings,
            customer_data_collection: latest,
          },
        });
        lastSavedRef.current = latest;
        setSavedSettings(true);
        setTimeout(() => setSavedSettings(false), 2000);
      } catch {
        setDataCollection(lastSavedRef.current);
        toast.error(t('toasts.settingsFailed'));
      } finally {
        setSavingSettings(false);
      }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  const handleDataCollectionChange = (next: DataCollectionValue) => {
    setDataCollection(next);
    scheduleSave();
  };

  // ── Preview helpers ──────────────────────────────────────────────────────
  const isAnonymousMode =
    dataCollection.collect_name === 'off' &&
    dataCollection.collect_email === 'off' &&
    dataCollection.collect_phone === 'off';

  const loyaltyTypeLabel = t('stampsType');
  const summaryRows: Array<[string, string]> = [
    [t('overview.type'), loyaltyTypeLabel],
    [t('overview.stampsRequired'), `${programDetails.totalStamps}`],
    [t('overview.reward'), programDetails.rewardName || '—'],
    [
      t('overview.dataCollected'),
      isAnonymousMode
        ? t('anonymous')
        : [
            dataCollection.collect_name !== 'off' && t('dataFields.name'),
            dataCollection.collect_email !== 'off' && t('dataFields.email'),
            dataCollection.collect_phone !== 'off' && t('dataFields.phone'),
          ]
            .filter(Boolean)
            .join(', '),
    ],
  ];

  if (loading && !program) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: '150ms' }}>
      <PageHeader
        title={t('programSettings')}
        subtitle={t('configureProgram')}
        action={
          (isDirty || saved) && (
            <Button
              onClick={handleSaveProgram}
              disabled={savingProgram}
              variant={saved ? 'outline' : 'gradient'}
              className={cn(
                'transition-all duration-300 animate-slide-up',
                saved && 'border-[var(--accent)] text-[var(--accent)] rounded-full hover:bg-[var(--accent-light)]'
              )}
            >
              {saved ? (
                <>
                  <CheckIcon className="w-4 h-4" weight="bold" /> {t('saving').replace('...', '')}
                </>
              ) : (
                <>
                  <FloppyDiskIcon className="w-4 h-4" /> {savingProgram ? t('saving') : t('saveProgram')}
                </>
              )}
            </Button>
          )
        }
      />

      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">
          {/* Program Details card */}
          <section className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up">
            <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">{t('programDetails')}</div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('programDetailsSubtitle')}</div>
            <ProgramDetailsForm
              value={programDetails}
              onChange={setProgramDetails}
              activeDesign={activeDesign}
            />
          </section>

          {/* Data Collection card */}
          <section
            className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[16px] font-semibold text-[#1A1A1A]">{t('dataCollection')}</span>
              <span className="inline-grid [&>*]:col-start-1 [&>*]:row-start-1">
                <span
                  className={`text-[11px] text-[#A0A0A0] transition-opacity duration-300 ${savingSettings ? 'opacity-100 animate-pulse' : 'opacity-0'
                    }`}
                >
                  {t('saving')}
                </span>
                <span
                  className={`text-[11px] text-[var(--accent)] transition-opacity duration-300 ${savedSettings && !savingSettings ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  {t('toasts.settingsSaved')}
                </span>
              </span>
            </div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('dataCollectionDescription')}</div>
            <DataCollectionForm value={dataCollection} onChange={handleDataCollectionChange} />
          </section>
        </div>

        {/* Right column — sticky live preview */}
        <div
          className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col animate-slide-up"
          style={{ animationDelay: '350ms' }}
        >
          <div className="min-[1080px]:sticky min-[1080px]:top-5">
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] overflow-hidden">
              <div className="text-[15px] font-semibold text-[#1A1A1A] mb-3.5">{t('livePreview')}</div>

              {activeDesign ? (
                <div className="mb-3.5">
                  <ScaledCardWrapper baseWidth={254} aspectRatio={1.282} minScale={0.6}>
                    <WalletCard
                      design={{ ...activeDesign, total_stamps: programDetails.totalStamps }}
                      stamps={6}
                      showQR={false}
                      showSecondaryFields
                      className="[&>div]:[box-shadow:none_!important]"
                    />
                  </ScaledCardWrapper>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[160px] rounded-xl bg-[var(--muted)] border border-dashed border-[var(--border-dark)] mb-3.5">
                  <p className="text-xs text-[#A5A5A5]">No card yet</p>
                </div>
              )}

              <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wide mb-2">
                {t('programSummaryLabel')}
              </div>
              {summaryRows.map(([label, value], i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2"
                  style={{ borderBottom: i < summaryRows.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                >
                  <span className="text-[12px] text-[#8A8A8A]">{label}</span>
                  <span
                    className={cn(
                      'text-[12px] font-semibold',
                      label === t('overview.dataCollected') && isAnonymousMode ? 'text-[var(--warning)]' : 'text-[#1A1A1A]'
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <StampGoalChangeDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        variant={goalDialogVariant}
        impact={goalImpact}
        nextStackable={programDetails.stackableRewards}
        onConfirm={(strategy) => doSaveProgram(strategy)}
        isConfirming={savingProgram}
      />
    </div>
  );
}
