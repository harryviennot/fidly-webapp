'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  WarningIcon,
  CheckIcon,
  FloppyDiskIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { WalletCard } from '@/components/card';
import { ScaledCardWrapper } from '@/components/design/ScaledCardWrapper';
import { StampIconSvg, type StampIconType } from '@/components/design/StampIconPicker';
import { computeCardColors } from '@/lib/card-utils';
import { PageHeader } from '@/components/redesign';
import { LoadingSpinner } from '@/components/reusables/loading-spinner';
import { InfoBox } from '@/components/reusables/info-box';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { useProgram } from '../layout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { FieldCollectionMode } from '@/types/business';

type DataCollectionField = 'collect_name' | 'collect_email' | 'collect_phone';

interface DataCollectionSettings {
  collect_name: FieldCollectionMode;
  collect_email: FieldCollectionMode;
  collect_phone: FieldCollectionMode;
}

/** Normalize legacy boolean values to the new tri-state */
function normalizeFieldMode(value: FieldCollectionMode | boolean | undefined): FieldCollectionMode {
  if (value === true) return 'required';
  if (value === false || value === undefined) return 'off';
  return value;
}

export default function ProgramSettingsPage() {
  const { currentBusiness } = useBusiness();
  const { program, activeDesign, loading, updateProgram } = useProgram();
  const t = useTranslations('loyaltyProgram');

  // Program info state
  const [programName, setProgramName] = useState('');
  const [totalStamps, setTotalStamps] = useState(10);
  const [rewardName, setRewardName] = useState('');
  const [savingProgram, setSavingProgram] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mark the program as user-configured when the owner visits this page,
  // even if they don't change anything. This signals they've seen the defaults.
  const markedAsConfigured = useRef(false);
  useEffect(() => {
    if (program?.id && !program.config?.user_configured && !markedAsConfigured.current) {
      markedAsConfigured.current = true;
      updateProgram({ config: { ...program.config, user_configured: true } }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  // Dirty detection
  const isDirty = program ? (
    programName !== (program.name || '') ||
    totalStamps !== (program.config?.total_stamps ?? 10) ||
    rewardName !== (program.reward_name || '')
  ) : false;

  // Data collection state
  const [settings, setSettings] = useState<DataCollectionSettings>({
    collect_name: 'off',
    collect_email: 'off',
    collect_phone: 'off',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Sync program data
  useEffect(() => {
    if (program) {
      setProgramName(program.name || '');
      setTotalStamps(program.config?.total_stamps ?? 10);
      setRewardName(program.reward_name || '');
    }
  }, [program]);

  // Sync data collection settings on initial load (handles legacy boolean values)
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (initialSyncDone.current) return;
    if (currentBusiness?.settings?.customer_data_collection) {
      initialSyncDone.current = true;
      const dc = currentBusiness.settings.customer_data_collection;
      const normalized = {
        collect_name: normalizeFieldMode(dc.collect_name),
        collect_email: normalizeFieldMode(dc.collect_email),
        collect_phone: normalizeFieldMode(dc.collect_phone),
      };
      setSettings(normalized);
      lastSavedRef.current = normalized;
    }
  }, [currentBusiness]);

  const handleSaveProgram = async () => {
    setSavingProgram(true);
    try {
      await updateProgram({
        name: programName,
        config: { total_stamps: totalStamps, user_configured: true },
        reward_name: rewardName || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // toast already shown in layout
    } finally {
      setSavingProgram(false);
    }
  };

  // Debounced save: accumulate rapid changes, send one API call
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const lastSavedRef = useRef(settings);

  const scheduleSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSavingSettings(true);
    debounceTimer.current = setTimeout(async () => {
      const latest = settingsRef.current;
      try {
        await updateBusiness(currentBusiness!.id, {
          settings: {
            ...currentBusiness!.settings,
            customer_data_collection: latest,
          },
        });
        lastSavedRef.current = latest;
      } catch {
        // Rollback to last successfully saved state
        setSettings(lastSavedRef.current);
        toast.error(t('toasts.settingsFailed'));
      } finally {
        setSavingSettings(false);
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  const handleToggle = (field: DataCollectionField) => {
    if (!currentBusiness?.id) return;
    setSettings(prev => ({ ...prev, [field]: prev[field] === 'off' ? 'required' as const : 'off' as const }));
    scheduleSave();
  };

  const handleRequiredToggle = (field: DataCollectionField) => {
    if (!currentBusiness?.id) return;
    setSettings(prev => ({ ...prev, [field]: prev[field] === 'required' ? 'optional' as const : 'required' as const }));
    scheduleSave();
  };

  const isAnonymousMode = settings.collect_name === 'off' && settings.collect_email === 'off' && settings.collect_phone === 'off';

  const dataFields = [
    {
      key: 'collect_name' as const,
      label: t('dataFields.name'),
      description: t('dataFields.nameDescription'),
      icon: '👤',
      fieldIcon: UserIcon,
      recommended: true,
    },
    {
      key: 'collect_email' as const,
      label: t('dataFields.email'),
      description: t('dataFields.emailDescription'),
      icon: '📧',
      fieldIcon: EnvelopeIcon,
      recommended: true,
    },
    {
      key: 'collect_phone' as const,
      label: t('dataFields.phone'),
      description: t('dataFields.phoneDescription'),
      icon: '📱',
      fieldIcon: PhoneIcon,
      recommended: false,
      comingSoon: true,
    },
  ];

  const loyaltyTypes = [
    { id: 'stamps', label: t('stampsType'), emoji: '⭐', desc: t('stampsTypeDesc'), tag: null },
    { id: 'points', label: t('pointsType'), emoji: '🎯', desc: t('pointsTypeDesc'), tag: t('comingSoonBadge') },
    { id: 'tiered', label: t('tieredType'), emoji: '🏆', desc: t('tieredTypeDesc'), tag: t('comingSoonBadge') },
  ];

  if (loading && !program) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: '150ms' }}>
      {/* Header with save button */}
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
                <><CheckIcon className="w-4 h-4" weight="bold" /> {t('saving').replace('...', '')}</>
              ) : (
                <><FloppyDiskIcon className="w-4 h-4" /> {savingProgram ? t('saving') : t('saveProgram')}</>
              )}
            </Button>
          )
        }
      />

      {/* Two-column layout */}
      <div className="flex gap-[14px] flex-col min-[1080px]:flex-row min-[1080px]:items-start">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-[14px] min-w-0">

          {/* Program Details */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up">
            <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">{t('programDetails')}</div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('programDetailsSubtitle')}</div>

            {/* Program Name */}
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#555] mb-1.5">{t('programName')}</label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder={t('programNamePlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-medium)] bg-white text-[13px] text-[#1A1A1A] outline-none transition-colors focus:border-[var(--accent)]"
              />
            </div>

            {/* Loyalty Type */}
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#555] mb-2">{t('loyaltyTypeLabel')}</label>
              <div className="flex gap-2 flex-wrap">
                {loyaltyTypes.map((lt) => {
                  const isActive = lt.id === 'stamps';
                  const isDisabled = lt.tag !== null;
                  return (
                    <button
                      key={lt.id}
                      disabled={isDisabled}
                      className={cn(
                        'flex-1 min-w-0 min-[1080px]:min-w-[140px] p-3.5 px-4 rounded-[10px] text-left transition-all duration-150 cursor-pointer',
                        'max-[767px]:min-w-full',
                        isActive
                          ? 'border-2 border-[var(--accent)] bg-[var(--accent-light)]'
                          : 'border-[1.5px] border-[var(--border)]',
                        isDisabled && 'bg-[var(--paper)] opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[20px]">{lt.emoji}</span>
                          <span className={cn('text-[14px] font-semibold', isActive ? 'text-[#1A1A1A]' : 'text-[#555]')}>
                            {lt.label}
                          </span>
                        </div>
                        {lt.tag && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[var(--paper-hover)] text-[#A0A0A0] tracking-wide">
                            {lt.tag}
                          </span>
                        )}
                        {isActive && !lt.tag && (
                          <div className="w-[18px] h-[18px] rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                            <CheckIcon className="w-2.5 h-2.5 text-white" weight="bold" />
                          </div>
                        )}
                      </div>
                      <div className="text-[11.5px] text-[#8A8A8A] leading-[1.4]">{lt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stamps to Earn */}
            {(() => {
              const stampIcon = (activeDesign?.stamp_icon || 'checkmark') as StampIconType;
              const rewardIcon = (activeDesign?.reward_icon || 'gift') as StampIconType;
              const colors = activeDesign ? computeCardColors(activeDesign) : null;
              const accentHex = colors?.accentHex ?? 'var(--accent)';
              const iconColorHex = colors?.iconColorHex ?? '#fff';

              return (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[12px] font-semibold text-[#555]">{t('stampsToEarn')}</label>
                    <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color: accentHex }}>{totalStamps}</span>
                  </div>

                  {/* Visual stamp dots — click to select */}
                  <div className="flex flex-wrap gap-[6px] mb-3">
                    {Array.from({ length: 21 }, (_, i) => {
                      const n = i + 1;
                      const isActive = n <= totalStamps;
                      const isLast = n === totalStamps;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => { if (n >= 2) setTotalStamps(n); }}
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-none',
                            !isActive && 'scale-[0.85] hover:scale-95',
                          )}
                          style={{
                            backgroundColor: isActive ? accentHex : 'var(--border)',
                            boxShadow: isActive ? `0 2px 8px ${accentHex}40` : 'none',
                            transitionDelay: isActive ? `${Math.min(i * 15, 150)}ms` : '0ms',
                          }}
                        >
                          {isActive ? (
                            <StampIconSvg
                              icon={isLast ? rewardIcon : stampIcon}
                              className="w-3.5 h-3.5"
                              color={iconColorHex}
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-[#BBB]">{n}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min={2}
                    max={21}
                    value={totalStamps}
                    onChange={(e) => setTotalStamps(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:transition-shadow [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-grab"
                    style={{
                      background: `linear-gradient(to right, ${accentHex} ${((totalStamps - 2) / 19) * 100}%, var(--border) ${((totalStamps - 2) / 19) * 100}%)`,
                      // Thumb color via CSS custom property workaround
                      // @ts-expect-error -- CSS custom property for slider thumb
                      '--thumb-color': accentHex,
                      WebkitAppearance: 'none',
                    }}
                  />
                  <style>{`
                    input[type="range"]::-webkit-slider-thumb {
                      background: ${accentHex} !important;
                      box-shadow: 0 2px 6px ${accentHex}50;
                    }
                    input[type="range"]::-webkit-slider-thumb:hover {
                      box-shadow: 0 2px 10px ${accentHex}70;
                    }
                    input[type="range"]::-moz-range-thumb {
                      background: ${accentHex} !important;
                      box-shadow: 0 2px 6px ${accentHex}50;
                    }
                  `}</style>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#BBB]">2</span>
                    <span className="text-[10px] text-[#BBB]">21</span>
                  </div>
                </div>
              );
            })()}

            {/* Reward */}
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#555] mb-1.5">{t('rewardLabel')}</label>
              <input
                type="text"
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                placeholder={t('rewardNamePlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-medium)] bg-white text-[13px] text-[#1A1A1A] outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            {/* Preview sentence */}
            <div className="px-4 py-3 rounded-lg bg-[var(--paper)] border border-[var(--border-light)] text-[13px] text-[#555] leading-[1.5]">
              <span className="text-[#8A8A8A]">{t('previewSentence')}</span>{' '}
              <span className="font-semibold text-[#1A1A1A]">
                {t('previewText', { stamps: totalStamps, reward: rewardName || t('rewardFallback') })}
              </span>
            </div>
          </div>

          {/* Data Collection */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[16px] font-semibold text-[#1A1A1A]">{t('dataCollection')}</span>
              {savingSettings && <span className="text-[11px] text-[#A0A0A0] animate-pulse">{t('saving')}</span>}
            </div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('dataCollectionDescription')}</div>

            <div className="flex flex-col gap-1.5">
              {dataFields.map((field) => {
                const mode = settings[field.key];
                const isEnabled = mode !== 'off';
                return (
                  <div
                    key={field.key}
                    className="flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]"
                  >
                    <span className="text-[22px] flex-shrink-0">{field.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Label className={cn(
                          'text-[14px] font-semibold',
                          isEnabled ? 'text-[#1A1A1A]' : 'text-[#888]'
                        )}>
                          {field.label}
                        </Label>
                        {field.recommended && (
                          <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[var(--accent-light)] text-[var(--accent)]">
                            {t('recommended').toUpperCase()}
                          </span>
                        )}
                        {field.comingSoon && (
                          <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[var(--paper-hover)] text-[#A0A0A0]">
                            {t('comingSoonBadge')}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#8A8A8A] leading-[1.4]">{field.description}</p>
                    </div>
                    {/* Required/Optional sub-toggle */}
                    {isEnabled && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Switch
                          checked={mode === 'required'}
                          onCheckedChange={() => handleRequiredToggle(field.key)}
                          className="scale-75 flex-shrink-0"
                        />
                        <span className={cn(
                          'text-[11px] font-medium whitespace-nowrap',
                          mode === 'required' ? 'text-[#1A1A1A]' : 'text-[#8A8A8A]'
                        )}>
                          {mode === 'required' ? t('requiredField') : t('optionalField')}
                        </span>
                      </div>
                    )}
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(field.key)}
                      className="flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>

            {/* Anonymous mode warning */}
            {isAnonymousMode ? (
              <InfoBox
                variant="warning"
                icon={<WarningIcon className="w-4 h-4 text-[var(--warning)]" weight="fill" />}
                title={t('anonymousModeTitle')}
                message={t('anonymousModeWarning')}
                className="mt-3"
              />
            ) : (
              <InfoBox
                variant="note"
                message={t('anonymousModeNote')}
                className="mt-3 px-3.5 py-2.5 text-[12px] leading-[1.5]"
              />
            )}
          </div>
        </div>

        {/* Right column — sticky live preview */}
        <div className="hidden min-[1080px]:flex w-[290px] min-w-[290px] flex-shrink-0 flex-col animate-slide-up" style={{ animationDelay: '350ms' }}>
          <div className="min-[1080px]:sticky min-[1080px]:top-5">
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] overflow-hidden">
              <div className="text-[15px] font-semibold text-[#1A1A1A] mb-3.5">{t('livePreview')}</div>

              {/* Card preview */}
              {activeDesign ? (
                <div className="mb-3.5">
                  <ScaledCardWrapper baseWidth={254} aspectRatio={1.282} minScale={0.6}>
                    <WalletCard
                      design={{
                        ...activeDesign,
                        total_stamps: totalStamps,
                      }}
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

              {/* Program Summary */}
              <div className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wide mb-2">
                {t('programSummaryLabel')}
              </div>
              {[
                [t('overview.type'), loyaltyTypes.find(lt => lt.id === 'stamps')?.label],
                [t('overview.stampsRequired'), `${totalStamps}`],
                [t('overview.reward'), rewardName || '—'],
                [t('overview.dataCollected'), isAnonymousMode ? t('anonymous') : [settings.collect_name !== 'off' && t('dataFields.name'), settings.collect_email !== 'off' && t('dataFields.email'), settings.collect_phone !== 'off' && t('dataFields.phone')].filter(Boolean).join(', ')],
              ].map(([label, value], i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2"
                  style={{ borderBottom: i < 3 ? '1px solid var(--border-light)' : 'none' }}
                >
                  <span className="text-[12px] text-[#8A8A8A]">{label}</span>
                  <span className={cn(
                    'text-[12px] font-semibold',
                    label === t('overview.dataCollected') && isAnonymousMode ? 'text-[var(--warning)]' : 'text-[#1A1A1A]'
                  )}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
