'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Crown, StampIcon, TrophyIcon, TargetIcon, MegaphoneIcon } from '@phosphor-icons/react';
import { NotificationsPageSkeleton } from '@/components/loyalty-program/skeletons/NotificationsPageSkeleton';
import { ProBadge } from '@/components/loyalty-program/ProFeatureGate';

interface NotificationTemplate {
  title: string;
  message: string;
  enabled?: boolean;
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
    enabled: true,
  },
  milestone: {
    title: 'Almost There!',
    message: 'Just {remaining} more stamps until your reward!',
    enabled: true,
  },
  reward: {
    title: 'Reward Ready!',
    message: "Congratulations! You've earned your reward. Show this to redeem.",
    enabled: true,
  },
};

const notificationTypes = [
  {
    key: 'stamp' as const,
    label: 'Stamp Earned',
    description: 'Sent when a customer receives a stamp',
    icon: StampIcon,
    variables: ['{remaining}', '{total}', '{customer_name}'],
  },
  {
    key: 'milestone' as const,
    label: 'Milestone',
    description: 'Sent when customer is 2 stamps away from reward',
    icon: TargetIcon,
    variables: ['{remaining}', '{customer_name}'],
  },
  {
    key: 'reward' as const,
    label: 'Reward Ready',
    description: 'Sent when customer earns their reward',
    icon: TrophyIcon,
    variables: ['{reward_name}', '{customer_name}'],
  },
];

export default function NotificationsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const [templates, setTemplates] = useState<NotificationTemplates>(defaultTemplates);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isProPlan = currentBusiness?.subscription_tier === 'pro';

  useEffect(() => {
    if (currentBusiness) {
      if (currentBusiness.settings?.notification_templates) {
        setTemplates({
          ...defaultTemplates,
          ...(currentBusiness.settings.notification_templates as NotificationTemplates),
        });
      }
      setLoading(false);
    }
  }, [currentBusiness]);

  const handleSave = async () => {
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
    value: string | boolean
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return <NotificationsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Configure the push notifications sent to your customers
        </p>
      </div>

      {/* Notification templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Push Notifications
            {!isProPlan && <ProBadge />}
          </CardTitle>
          <CardDescription>
            Customize the messages your customers receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <Switch
                    checked={template.enabled !== false}
                    onCheckedChange={(checked) => {
                      if (isProPlan) {
                        handleChange(type.key, 'enabled', checked);
                      }
                    }}
                    disabled={!isProPlan}
                  />
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
                              handleChange(type.key, 'message', template.message + ' ' + variable);
                            }}
                          >
                            {variable}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingKey(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
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
        </CardContent>
      </Card>

      {/* Promotional Notifications - Pro only */}
      <Card className={!isProPlan ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MegaphoneIcon className="w-5 h-5" />
            Promotional Notifications
            <ProBadge />
          </CardTitle>
          <CardDescription>
            Send custom promotional messages to all your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 border-2 border-dashed rounded-xl">
            <MegaphoneIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Send targeted promotions to drive engagement
            </p>
            <p className="text-xs text-muted-foreground">
              Coming soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
