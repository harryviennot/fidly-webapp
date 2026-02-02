'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBusiness } from '@/contexts/business-context';
import { updateBusiness } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StampIcon, TrophyIcon, TargetIcon, MegaphoneSimpleIcon, CheckCircleIcon, UsersIcon, CalendarBlankIcon } from '@phosphor-icons/react';
import { NotificationsPageSkeleton } from '@/components/loyalty-program/skeletons/NotificationsPageSkeleton';
import { ProBadge } from '@/components/loyalty-program/ProFeatureGate';
import { NotificationCard, NotificationTemplate, Variable } from '@/components/loyalty-program/notifications';

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

const notificationTypes: Array<{
  key: 'stamp' | 'milestone' | 'reward';
  label: string;
  description: string;
  icon: typeof StampIcon;
  variables: Variable[];
}> = [
  {
    key: 'stamp',
    label: 'Stamp Earned',
    description: 'Sent when a customer receives a stamp',
    icon: StampIcon,
    variables: [
      { key: '{remaining}', label: 'Stamps remaining until reward', example: '3' },
      { key: '{total}', label: 'Total stamps needed', example: '10' },
      { key: '{customer_name}', label: "Customer's name", example: 'Sarah' },
    ],
  },
  {
    key: 'milestone',
    label: 'Milestone',
    description: 'Sent when customer is 2 stamps away from reward',
    icon: TargetIcon,
    variables: [
      { key: '{remaining}', label: 'Stamps remaining until reward', example: '2' },
      { key: '{customer_name}', label: "Customer's name", example: 'Sarah' },
    ],
  },
  {
    key: 'reward',
    label: 'Reward Ready',
    description: 'Sent when customer earns their reward',
    icon: TrophyIcon,
    variables: [
      { key: '{reward_name}', label: 'Name of the reward', example: 'Free Coffee' },
      { key: '{customer_name}', label: "Customer's name", example: 'Sarah' },
    ],
  },
];

export default function NotificationsPage() {
  const { currentBusiness, refetch } = useBusiness();
  const [templates, setTemplates] = useState<NotificationTemplates>(defaultTemplates);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Autosave with debounce
  const saveTemplates = useCallback(
    async (newTemplates: NotificationTemplates) => {
      if (!currentBusiness?.id || !isProPlan) return;

      setSaveStatus('saving');
      try {
        await updateBusiness(currentBusiness.id, {
          settings: {
            ...currentBusiness.settings,
            notification_templates: newTemplates,
          },
        });
        await refetch();
        setSaveStatus('saved');
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Failed to save notification templates:', error);
        setSaveStatus('idle');
      }
    },
    [currentBusiness, isProPlan, refetch]
  );

  const handleTemplateChange = useCallback(
    (key: keyof NotificationTemplates, field: keyof NotificationTemplate, value: string | boolean) => {
      const newTemplates = {
        ...templates,
        [key]: {
          ...templates[key],
          [field]: value,
        },
      };
      setTemplates(newTemplates);

      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveTemplates(newTemplates);
      }, 1000);
    },
    [templates, saveTemplates]
  );

  const handleExpandChange = (key: string, expanded: boolean) => {
    setExpandedKey(expanded ? key : null);
  };

  if (loading) {
    return <NotificationsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Configure the push notifications sent to your customers
          </p>
        </div>
        {/* Save status indicator */}
        {saveStatus !== 'idle' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saveStatus === 'saving' && (
              <>
                <div className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-500" weight="fill" />
                <span className="text-green-600 dark:text-green-500">Saved</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Push Notifications section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Automated Notifications
          </h2>
          {!isProPlan && <ProBadge />}
        </div>

        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <NotificationCard
              key={type.key}
              type={type.key}
              label={type.label}
              description={type.description}
              icon={type.icon}
              template={templates[type.key]}
              variables={type.variables}
              isExpanded={expandedKey === type.key}
              onExpandChange={(expanded) => handleExpandChange(type.key, expanded)}
              onTemplateChange={(field, value) => handleTemplateChange(type.key, field, value)}
              isProPlan={isProPlan}
              appName={currentBusiness?.name}
            />
          ))}
        </div>
      </div>

      {/* Promotional Notifications - Coming Soon */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5" />

          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                  <MegaphoneSimpleIcon className="w-5 h-5 text-white" weight="fill" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Promotional Notifications
                    <ProBadge />
                  </CardTitle>
                  <CardDescription>
                    Send custom promotional messages to drive engagement
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-muted/80">
                Coming Soon
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FeaturePreview
                icon={MegaphoneSimpleIcon}
                title="Custom Messages"
                description="Send personalized promotional messages to all your customers"
              />
              <FeaturePreview
                icon={UsersIcon}
                title="Audience Targeting"
                description="Target active, inactive, or customers near their reward"
              />
              <FeaturePreview
                icon={CalendarBlankIcon}
                title="Scheduled Sends"
                description="Schedule promotions to send at the perfect time"
              />
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

function FeaturePreview({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MegaphoneSimpleIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
