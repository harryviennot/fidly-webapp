'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  WarningIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { WalletCard } from '@/components/card';
import { ScaledCardWrapper } from '@/components/design/ScaledCardWrapper';
import { PageHeader } from '@/components/redesign';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { useProgram } from '../layout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DataCollectionSettings {
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
}

export default function ProgramSettingsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const { program, activeDesign, loading, updateProgram } = useProgram();
  const t = useTranslations('loyaltyProgram');

  // Program info state
  const [programName, setProgramName] = useState('');
  const [totalStamps, setTotalStamps] = useState(10);
  const [rewardName, setRewardName] = useState('');
  const [savingProgram, setSavingProgram] = useState(false);
  const [saved, setSaved] = useState(false);

  // Dirty detection
  const isDirty = program ? (
    programName !== (program.name || '') ||
    totalStamps !== (program.config?.total_stamps ?? 10) ||
    rewardName !== (program.reward_name || '')
  ) : false;

  // Data collection state
  const [settings, setSettings] = useState<DataCollectionSettings>({
    collect_name: false,
    collect_email: false,
    collect_phone: false,
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

  // Sync data collection settings
  useEffect(() => {
    if (currentBusiness?.settings?.customer_data_collection) {
      const dc = currentBusiness.settings.customer_data_collection;
      setSettings({
        collect_name: dc.collect_name ?? false,
        collect_email: dc.collect_email ?? false,
        collect_phone: dc.collect_phone ?? false,
      });
    }
  }, [currentBusiness]);

  const handleSaveProgram = async () => {
    setSavingProgram(true);
    try {
      await updateProgram({
        name: programName,
        config: { total_stamps: totalStamps },
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

  const handleToggle = async (field: keyof DataCollectionSettings) => {
    if (!currentBusiness?.id) return;
    const newSettings = { ...settings, [field]: !settings[field] };
    setSettings(newSettings);
    setSavingSettings(true);
    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          customer_data_collection: newSettings,
        },
      });
      await refetch();
    } catch {
      setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
      toast.error(t('toasts.settingsFailed'));
    } finally {
      setSavingSettings(false);
    }
  };

  const isAnonymousMode = !settings.collect_name && !settings.collect_email && !settings.collect_phone;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px] animate-slide-up" style={{ animationDelay: '150ms' }}>
      {/* Header with save button */}
      <PageHeader
        title={t('programSettings')}
        subtitle={t('configureProgram')}
        action={
          <button
            onClick={handleSaveProgram}
            disabled={!isDirty && !saved}
            className={cn(
              'px-[22px] py-[9px] rounded-lg border-none text-[13px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-200',
              saved
                ? 'bg-[var(--success-light)] text-[#3D6B3D]'
                : isDirty
                  ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                  : 'bg-[var(--paper-hover)] text-[#999] cursor-not-allowed'
            )}
          >
            {saved ? <><CheckIcon className="w-3.5 h-3.5" /> {t('saving').replace('...', '')}</> : savingProgram ? t('saving') : t('saveProgram')}
          </button>
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
                          ? 'border-2 border-[var(--accent)] bg-[#F6FBF6]'
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

            {/* Stamps & Reward */}
            <div className="flex gap-3.5 flex-wrap mb-4">
              <div className="flex-[1_1_180px]">
                <label className="block text-[12px] font-semibold text-[#555] mb-1.5">{t('stampsToEarn')}</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={totalStamps}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v)) setTotalStamps(Math.max(2, Math.min(20, v)));
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-l-lg border border-r-0 border-[var(--border-medium)] bg-white text-[13px] text-[#1A1A1A] outline-none focus:border-[var(--accent)] transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <div className="px-3.5 py-2.5 rounded-r-lg border border-[var(--border-medium)] bg-[var(--paper)] text-[12px] text-[#8A8A8A] font-medium whitespace-nowrap">
                    {t('stampsLabel')}
                  </div>
                </div>
              </div>
              <div className="flex-[1_1_220px]">
                <label className="block text-[12px] font-semibold text-[#555] mb-1.5">{t('rewardLabel')}</label>
                <input
                  type="text"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  placeholder={t('rewardNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-medium)] bg-white text-[13px] text-[#1A1A1A] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            {/* Preview sentence */}
            <div className="px-4 py-3 rounded-lg bg-[var(--paper)] border border-[var(--border-light)] text-[13px] text-[#555] leading-[1.5]">
              <span className="text-[#8A8A8A]">{t('previewSentence')}</span>{' '}
              <span className="font-semibold text-[#1A1A1A]">
                {t('previewText', { stamps: totalStamps, reward: rewardName || 'reward' })}
              </span>
            </div>
          </div>

          {/* Data Collection */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 min-[1080px]:p-5 min-[1080px]:px-6 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="text-[16px] font-semibold text-[#1A1A1A] mb-1">{t('dataCollection')}</div>
            <div className="text-[12px] text-[#A0A0A0] mb-5">{t('dataCollectionDescription')}</div>

            <div className="flex flex-col gap-1.5">
              {dataFields.map((field) => (
                <div
                  key={field.key}
                  className={cn(
                    'flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] transition-all duration-200',
                    settings[field.key]
                      ? 'bg-[#F6FBF6] border-[1.5px] border-[#D4ECD4]'
                      : 'bg-[var(--paper)] border-[1.5px] border-[var(--border-light)]'
                  )}
                >
                  <span className="text-[22px] flex-shrink-0">{field.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Label className={cn(
                        'text-[14px] font-semibold',
                        settings[field.key] ? 'text-[#1A1A1A]' : 'text-[#888]'
                      )}>
                        {field.label}
                      </Label>
                      {field.recommended && (
                        <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[var(--success-light)] text-[var(--accent)]">
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
                  <Switch
                    checked={settings[field.key]}
                    onCheckedChange={() => handleToggle(field.key)}
                    disabled={savingSettings}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>

            {/* Anonymous mode warning */}
            {isAnonymousMode ? (
              <div className="flex items-start gap-2.5 mt-3 p-3.5 rounded-lg bg-[#FFF8F0] border border-[#F0DFC0]">
                <WarningIcon className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" weight="fill" />
                <div>
                  <div className="text-[13px] font-semibold text-[var(--warning)] mb-0.5">Anonymous Mode Active</div>
                  <div className="text-[12px] text-[#A08060] leading-[1.4]">{t('anonymousModeWarning')}</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-[var(--paper)] border border-[var(--border-light)] text-[12px] text-[#8A8A8A] leading-[1.5]">
                {t('anonymousModeNote')}
              </div>
            )}
          </div>
        </div>

        {/* Right column — sticky live preview */}
        <div className="w-full min-[1080px]:w-[290px] min-[1080px]:min-w-[290px] flex-shrink-0 animate-slide-up" style={{ animationDelay: '350ms' }}>
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
                        organization_name: programName || activeDesign.organization_name,
                        total_stamps: totalStamps,
                      }}
                      showQR={false}
                      showSecondaryFields={false}
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
                [t('overview.dataCollected'), isAnonymousMode ? t('anonymous') : [settings.collect_name && t('dataFields.name'), settings.collect_email && t('dataFields.email'), settings.collect_phone && t('dataFields.phone')].filter(Boolean).join(', ')],
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
