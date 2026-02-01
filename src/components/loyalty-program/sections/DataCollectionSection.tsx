'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserIcon, EnvelopeIcon, PhoneIcon } from '@phosphor-icons/react';

interface DataCollectionConfig {
  collect_name: boolean;
  collect_email: boolean;
  collect_phone: boolean;
}

const defaultConfig: DataCollectionConfig = {
  collect_name: false,
  collect_email: true,
  collect_phone: false,
};

interface DataCollectionSectionProps {
  embedded?: boolean;
}

export function DataCollectionSection({ embedded = false }: DataCollectionSectionProps) {
  const { currentBusiness, refetch } = useBusiness();
  const [config, setConfig] = useState<DataCollectionConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentBusiness?.settings?.customer_data_collection) {
      setConfig(currentBusiness.settings.customer_data_collection as DataCollectionConfig);
    }
  }, [currentBusiness]);

  const handleToggle = async (field: keyof DataCollectionConfig) => {
    if (!currentBusiness?.id) return;

    const newConfig = { ...config, [field]: !config[field] };
    setConfig(newConfig);
    setSaving(true);

    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          customer_data_collection: newConfig,
        },
      });
      await refetch();
    } catch (error) {
      // Revert on error
      setConfig(config);
      console.error('Failed to save data collection settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      key: 'collect_name' as const,
      label: 'Name',
      description: 'Personalize notifications and passes with customer names',
      icon: UserIcon,
    },
    {
      key: 'collect_email' as const,
      label: 'Email',
      description: 'Identify customers and resend lost passes via email',
      icon: EnvelopeIcon,
    },
    {
      key: 'collect_phone' as const,
      label: 'Phone Number',
      description: 'Enable SMS notifications and account recovery',
      icon: PhoneIcon,
    },
  ];

  const content = (
    <div className="space-y-4">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold">Customer Data Collection</h3>
          <p className="text-sm text-muted-foreground">
            Choose what information to collect when customers sign up
          </p>
        </div>
      )}
      {fields.map((field) => {
        const Icon = field.icon;
        return (
          <div
            key={field.key}
            className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <Label htmlFor={field.key} className="font-medium cursor-pointer">
                  {field.label}
                </Label>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            </div>
            <Switch
              id={field.key}
              checked={config[field.key]}
              onCheckedChange={() => handleToggle(field.key)}
              disabled={saving}
            />
          </div>
        );
      })}

      <div className="pt-2">
        <p className="text-xs text-muted-foreground">
          {!config.collect_name && !config.collect_email && !config.collect_phone
            ? 'Customers can get a card without providing any information (anonymous mode)'
            : 'Customers will fill out a simple form before getting their card'}
        </p>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <Card id="data-collection" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-lg">Customer Data Collection</CardTitle>
        <CardDescription>
          Choose what information to collect when customers sign up for their loyalty card
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
