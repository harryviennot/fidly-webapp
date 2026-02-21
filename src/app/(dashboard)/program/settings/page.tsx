'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  FloppyDiskIcon,
  Minus,
  Plus,
  TrophyIcon,
  StampIcon,
  TagIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StampProgress } from '@/components/customers/stamp-progress';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { useProgram } from '../layout';
import { toast } from 'sonner';

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
  const [rewardDescription, setRewardDescription] = useState('');
  const [savingProgram, setSavingProgram] = useState(false);

  // Dirty detection
  const isDirty = program ? (
    programName !== (program.name || '') ||
    totalStamps !== (program.config?.total_stamps ?? 10) ||
    rewardName !== (program.reward_name || '') ||
    rewardDescription !== (program.reward_description || '')
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
      setRewardDescription(program.reward_description || '');
    }
  }, [program]);

  // Sync data collection settings from backend (single source of truth)
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
        reward_description: rewardDescription || null,
      });
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
      icon: UserIcon,
      recommended: true,
    },
    {
      key: 'collect_email' as const,
      label: t('dataFields.email'),
      description: t('dataFields.emailDescription'),
      icon: EnvelopeIcon,
      recommended: true,
    },
    {
      key: 'collect_phone' as const,
      label: t('dataFields.phone'),
      description: t('dataFields.phoneDescription'),
      icon: PhoneIcon,
      recommended: false,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('programSettings')}</h2>
        <p className="text-muted-foreground">{t('configureProgram')}</p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Program Name — left */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                <TagIcon className="w-5 h-5" weight="duotone" />
              </div>
              <CardTitle className="text-base">{t('programInfo')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t('programName')}</Label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder={t('programNamePlaceholder')}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t('programType')}</Label>
              <div className="flex items-center h-11">
                <Badge variant="secondary" className="text-sm px-3 py-1">{t('stampCard')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stamps — right, visual centerpiece */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-violet-100 text-violet-600">
                <StampIcon className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <CardTitle className="text-base">{t('totalStamps')}</CardTitle>
                <CardDescription className="text-sm">{t('stampsDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center gap-5">
            {/* Editable counter */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setTotalStamps(Math.max(2, totalStamps - 1))}
                className="w-11 h-11 rounded-full border-2 border-input flex items-center justify-center hover:bg-muted hover:border-foreground/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={totalStamps <= 2}
              >
                <Minus className="w-5 h-5" weight="bold" />
              </button>
              <div className="text-center">
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={totalStamps}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v)) setTotalStamps(Math.max(2, Math.min(20, v)));
                  }}
                  className="w-20 text-center text-4xl font-bold tabular-nums bg-transparent border-b-2 border-transparent hover:border-input focus:border-[var(--accent)] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('stampsLabel')}</p>
              </div>
              <button
                type="button"
                onClick={() => setTotalStamps(Math.min(20, totalStamps + 1))}
                className="w-11 h-11 rounded-full border-2 border-input flex items-center justify-center hover:bg-muted hover:border-foreground/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={totalStamps >= 20}
              >
                <Plus className="w-5 h-5" weight="bold" />
              </button>
            </div>
            {/* Inline stamp preview */}
            <div className="w-full">
              <StampProgress
                count={totalStamps}
                total={totalStamps}
                design={activeDesign}
                size="md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reward — spans full width */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                <TrophyIcon className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <CardTitle className="text-base">{t('rewardTitle')}</CardTitle>
                <CardDescription className="text-sm">{t('rewardSubtitle')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('rewardName')}</Label>
                <Input
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  placeholder={t('rewardNamePlaceholder')}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('rewardDescription')}</Label>
                <Input
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder={t('rewardDescriptionPlaceholder')}
                  className="h-11 text-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Collection — spans full width */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t('dataCollection')}</CardTitle>
            <CardDescription className="text-sm">{t('dataCollectionDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dataFields.map((field) => {
                const Icon = field.icon;
                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-4 border rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">{field.label}</Label>
                          {field.recommended && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('recommended')}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{field.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings[field.key]}
                      onCheckedChange={() => handleToggle(field.key)}
                      disabled={savingSettings}
                      className="ml-3 flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>
            {isAnonymousMode ? (
              <div className="flex gap-3 p-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
                <WarningIcon className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" weight="fill" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{t('anonymousModeWarning')}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pt-4">{t('anonymousModeNote')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div
        className={`sticky bottom-0 -mx-4 px-4 transition-all duration-300 ${
          isDirty
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-muted-foreground">{t('unsavedChanges')}</span>
          </div>
          <Button
            onClick={handleSaveProgram}
            disabled={savingProgram}
            className="rounded-full"
            size="sm"
          >
            <FloppyDiskIcon className="w-4 h-4 mr-2" />
            {savingProgram ? t('saving') : t('saveProgram')}
          </Button>
        </div>
      </div>
    </div>
  );
}
