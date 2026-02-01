'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserIcon, EnvelopeIcon, PhoneIcon } from '@phosphor-icons/react';

interface DataCollectionSettings {
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
}

interface DataCollectionSectionProps {
  embedded?: boolean;
}

export function DataCollectionSection({ embedded = false }: DataCollectionSectionProps) {
  const { currentBusiness, refetch } = useBusiness();
  const [settings, setSettings] = useState<DataCollectionSettings>({
    collect_name: false,
    collect_email: false,
    collect_phone: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentBusiness?.settings?.customer_data_collection) {
      setSettings({
        collect_name: currentBusiness.settings.customer_data_collection.collect_name ?? false,
        collect_email: currentBusiness.settings.customer_data_collection.collect_email ?? false,
        collect_phone: currentBusiness.settings.customer_data_collection.collect_phone ?? false,
      });
    }
  }, [currentBusiness]);

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

  const fields = [
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

  const content = (
    <div className="space-y-6">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold">Customer Data</h3>
          <p className="text-sm text-muted-foreground">
            Choose what information to collect during signup
          </p>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field) => {
          const Icon = field.icon;
          return (
            <div
              key={field.key}
              className="flex items-center justify-between p-4 border rounded-lg"
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
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Collecting no data enables anonymous mode - customers can sign up without providing any information.
      </p>
    </div>
  );

  if (embedded) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <Card id="data" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-lg">Customer Data</CardTitle>
        <CardDescription>
          Choose what information to collect during signup
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
