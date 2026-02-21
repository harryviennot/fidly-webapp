'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  FloppyDiskIcon,
  Minus,
  Plus,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { useProgram } from '../layout';
import { toast } from 'sonner';

interface DataCollectionSettings {
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
}

export default function ProgramDetailsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const { program, loading, updateProgram } = useProgram();
  const t = useTranslations('loyaltyProgram');

  // Program info state
  const [programName, setProgramName] = useState('');
  const [totalStamps, setTotalStamps] = useState(10);
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [savingProgram, setSavingProgram] = useState(false);

  // URL state
  const [copied, setCopied] = useState(false);

  // Data collection state
  const [settings, setSettings] = useState<DataCollectionSettings>({
    collect_name: false,
    collect_email: false,
    collect_phone: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const baseUrl = globalThis.window === undefined ? '' : globalThis.window.location.origin;
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;

  // Sync program data
  useEffect(() => {
    if (program) {
      setProgramName(program.name || '');
      setTotalStamps(program.config?.total_stamps ?? 10);
      setRewardName(program.reward_name || '');
      setRewardDescription(program.reward_description || '');
    }
  }, [program]);

  // Sync data collection settings
  useEffect(() => {
    if (currentBusiness?.settings?.customer_data_collection) {
      setSettings({
        collect_name: currentBusiness.settings.customer_data_collection.collect_name ?? false,
        collect_email: currentBusiness.settings.customer_data_collection.collect_email ?? false,
        collect_phone: currentBusiness.settings.customer_data_collection.collect_phone ?? false,
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success(t('linkCopied'));
    setTimeout(() => setCopied(false), 2000);
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

  const dataFields = [
    {
      key: 'collect_name' as const,
      label: t('dataFields.name'),
      description: t('dataFields.nameDescription'),
      icon: UserIcon,
    },
    {
      key: 'collect_email' as const,
      label: t('dataFields.email'),
      description: t('dataFields.emailDescription'),
      icon: EnvelopeIcon,
    },
    {
      key: 'collect_phone' as const,
      label: t('dataFields.phone'),
      description: t('dataFields.phoneDescription'),
      icon: PhoneIcon,
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
      {/* Program Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('programInfo')}</CardTitle>
          <CardDescription>{t('configureProgram')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('programName')}</Label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder={t('programNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('programType')}</Label>
              <div className="flex items-center h-9">
                <Badge variant="secondary">{t('stampCard')}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('totalStamps')}</Label>
            <div className="flex items-center justify-between w-full max-w-xs">
              <button
                type="button"
                onClick={() => setTotalStamps(Math.max(2, totalStamps - 1))}
                className="w-10 h-10 rounded-full border border-input flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={totalStamps <= 2}
              >
                <Minus className="w-4 h-4" weight="bold" />
              </button>
              <span className="text-xl font-semibold">
                {totalStamps}
              </span>
              <button
                type="button"
                onClick={() => setTotalStamps(Math.min(20, totalStamps + 1))}
                className="w-10 h-10 rounded-full border border-input flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={totalStamps >= 20}
              >
                <Plus className="w-4 h-4" weight="bold" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('rewardName')}</Label>
              <Input
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                placeholder={t('rewardNamePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('rewardDescription')}</Label>
            <Input
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder={t('rewardDescriptionPlaceholder')}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProgram}
              disabled={savingProgram}
              className="rounded-full"
            >
              <FloppyDiskIcon className="w-4 h-4 mr-2" />
              {savingProgram ? t('saving') : t('saveProgram')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('businessUrl')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('signupLink')}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="rounded-full"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground break-all font-mono bg-background/50 p-2 rounded">
              {fullUrl}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <QrCodeIcon className="h-4 w-4" />
            <span>{t('qrCodeHint')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Data Collection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dataCollection')}</CardTitle>
          <CardDescription>{t('dataCollectionDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataFields.map((field) => {
            const Icon = field.icon;
            return (
              <div
                key={field.key}
                className="flex items-center justify-between p-4 border rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[field.key]}
                  onCheckedChange={() => handleToggle(field.key)}
                  disabled={savingSettings}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-2">{t('anonymousModeNote')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
