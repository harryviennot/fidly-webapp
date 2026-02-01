'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@phosphor-icons/react';
import { SettingsPageSkeleton } from '@/components/loyalty-program/skeletons/SettingsPageSkeleton';

interface DataCollectionSettings {
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
}

export default function SettingsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<DataCollectionSettings>({
    collect_name: false,
    collect_email: false,
    collect_phone: false,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const slug = currentBusiness?.url_slug || '';
  const fullUrl = `${baseUrl}/${slug}`;

  useEffect(() => {
    if (currentBusiness) {
      if (currentBusiness.settings?.customer_data_collection) {
        setSettings({
          collect_name: currentBusiness.settings.customer_data_collection.collect_name ?? false,
          collect_email: currentBusiness.settings.customer_data_collection.collect_email ?? false,
          collect_phone: currentBusiness.settings.customer_data_collection.collect_phone ?? false,
        });
      }
      setLoading(false);
    }
  }, [currentBusiness]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (field: keyof DataCollectionSettings) => {
    if (!currentBusiness?.id) return;

    const newSettings = { ...settings, [field]: !settings[field] };
    setSettings(newSettings);
    setSaving(true);

    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          customer_data_collection: newSettings,
        },
      });
      await refetch();
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSettings(settings); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const dataFields = [
    {
      key: 'collect_name' as const,
      label: 'Name',
      description: 'Collect customer names for personalization',
      icon: UserIcon,
    },
    {
      key: 'collect_email' as const,
      label: 'Email',
      description: 'Enable pass recovery and email notifications',
      icon: EnvelopeIcon,
    },
    {
      key: 'collect_phone' as const,
      label: 'Phone',
      description: 'Enable SMS notifications (coming soon)',
      icon: PhoneIcon,
    },
  ];

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your loyalty program settings
        </p>
      </div>

      {/* Business URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business URL</CardTitle>
          <CardDescription>
            Share this link for customers to get your loyalty card
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Your signup link</p>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="rounded-full">
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <QrCodeIcon className="h-4 w-4" />
            <span>QR code downloads are available in the scanner app</span>
          </div>
        </CardContent>
      </Card>

      {/* Customer Data Collection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Data Collection</CardTitle>
          <CardDescription>
            Choose what information to collect during signup
          </CardDescription>
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
                  disabled={saving}
                />
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground pt-2">
            Note: Collecting no data enables anonymous mode - customers can sign up without providing any information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
