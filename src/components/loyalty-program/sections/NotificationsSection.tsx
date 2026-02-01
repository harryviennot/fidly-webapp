'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Crown, StampIcon, TrophyIcon, TargetIcon } from '@phosphor-icons/react';

interface NotificationTemplate {
  title: string;
  message: string;
}

interface NotificationTemplates {
  stamp: NotificationTemplate;
  milestone: NotificationTemplate;
  reward: NotificationTemplate;
}

const defaultTemplates: NotificationTemplates = {
  stamp: {
    title: 'Stamp Added!',
    message: 'You earned a stamp! {remaining} more to go.',
  },
  milestone: {
    title: 'Almost There!',
    message: 'Just {remaining} more stamps until your reward!',
  },
  reward: {
    title: 'Reward Ready!',
    message: 'Congratulations! You\'ve earned your reward. Show this to redeem.',
  },
};

const notificationTypes = [
  {
    key: 'stamp' as const,
    label: 'Stamp Notification',
    description: 'Sent when a customer receives a stamp',
    icon: StampIcon,
    variables: ['{remaining}', '{total}', '{customer_name}'],
  },
  {
    key: 'milestone' as const,
    label: 'Milestone Notification',
    description: 'Sent when customer is close to reward (2 stamps away)',
    icon: TargetIcon,
    variables: ['{remaining}', '{customer_name}'],
  },
  {
    key: 'reward' as const,
    label: 'Reward Notification',
    description: 'Sent when customer earns their reward',
    icon: TrophyIcon,
    variables: ['{reward_name}', '{customer_name}'],
  },
];

interface NotificationsSectionProps {
  embedded?: boolean;
}

export function NotificationsSection({ embedded = false }: NotificationsSectionProps) {
  const { currentBusiness, refetch } = useBusiness();
  const [templates, setTemplates] = useState<NotificationTemplates>(defaultTemplates);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const isProPlan = currentBusiness?.subscription_tier === 'pro';

  useEffect(() => {
    if (currentBusiness?.settings?.notification_templates) {
      setTemplates({
        ...defaultTemplates,
        ...(currentBusiness.settings.notification_templates as NotificationTemplates),
      });
    }
  }, [currentBusiness]);

  const handleSave = async (key: keyof NotificationTemplates) => {
    if (!currentBusiness?.id || !isProPlan) return;

    setSaving(true);
    try {
      await updateBusiness(currentBusiness.id, {
        settings: {
          ...currentBusiness.settings,
          notification_templates: templates,
        },
      });
      await refetch();
      setEditingKey(null);
    } catch (error) {
      console.error('Failed to save notification templates:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    key: keyof NotificationTemplates,
    field: keyof NotificationTemplate,
    value: string
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const content = (
    <div className="space-y-6">
      {embedded && (
        <div className="mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            Notifications
            {!isProPlan && (
              <Badge variant="secondary" className="text-xs font-normal">
                <Crown className="h-3 w-3 mr-1 text-amber-500" />
                Customizable on Pro
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure the push notifications sent to your customers
          </p>
        </div>
      )}
      {notificationTypes.map((type) => {
          const Icon = type.icon;
          const template = templates[type.key];
          const isEditing = editingKey === type.key;

          return (
            <div
              key={type.key}
              className="space-y-3 pb-6 border-b border-[var(--border)] last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </div>

              <div className="ml-12 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${type.key}-title`} className="text-xs text-muted-foreground">
                    Title
                  </Label>
                  {isProPlan && isEditing ? (
                    <Input
                      id={`${type.key}-title`}
                      value={template.title}
                      onChange={(e) => handleChange(type.key, 'title', e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <p
                      className="text-sm py-2 px-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => isProPlan && setEditingKey(type.key)}
                    >
                      {template.title}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${type.key}-message`} className="text-xs text-muted-foreground">
                    Message
                  </Label>
                  {isProPlan && isEditing ? (
                    <Textarea
                      id={`${type.key}-message`}
                      value={template.message}
                      onChange={(e) => handleChange(type.key, 'message', e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  ) : (
                    <p
                      className="text-sm py-2 px-3 bg-muted/50 rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => isProPlan && setEditingKey(type.key)}
                    >
                      {template.message}
                    </p>
                  )}
                </div>

                {isProPlan && isEditing && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-wrap gap-1">
                      {type.variables.map((variable) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={() => {
                            // Insert variable at cursor position (simplified: append)
                            handleChange(type.key, 'message', template.message + ' ' + variable);
                          }}
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingKey(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-xs text-[var(--accent)] font-medium hover:underline"
                        onClick={() => handleSave(type.key)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {!isProPlan && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    Upgrade to Pro to customize notification text
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );

  if (embedded) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <Card id="notifications" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Notifications
          {!isProPlan && (
            <Badge variant="secondary" className="text-xs font-normal">
              <Crown className="h-3 w-3 mr-1 text-amber-500" />
              Customizable on Pro
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure the push notifications sent to your customers
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
