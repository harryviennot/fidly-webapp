'use client';

import { useBusiness } from '@/contexts/business-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircleIcon,
  CircleIcon,
  PaintBrushIcon,
  UserCircleIcon,
  MapPinIcon,
  BellIcon,
  ArrowRightIcon,
} from '@phosphor-icons/react';

interface OverviewSectionProps {
  embedded?: boolean;
  onNavigateToTab?: (tabId: string) => void;
  hasActiveCard?: boolean;
}

interface SetupStep {
  id: string;
  tabId?: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  action?: string;
}

export function OverviewSection({
  embedded = false,
  onNavigateToTab,
  hasActiveCard = false,
}: OverviewSectionProps) {
  const { currentBusiness } = useBusiness();

  const settings = currentBusiness?.settings;
  const isSetupComplete = settings?.onboarding_complete === true;

  // Check individual setup steps
  const hasDataCollection = Boolean(
    settings?.customer_data_collection?.collect_email ||
    settings?.customer_data_collection?.collect_name ||
    settings?.customer_data_collection?.collect_phone
  );

  // For now, locations is placeholder - will be connected to actual data later
  const hasLocation = false; // TODO: Connect to locations data

  // Notifications always have defaults, so we consider it "set up" if they exist
  const hasNotifications = true;

  const setupSteps: SetupStep[] = [
    {
      id: 'card',
      title: 'Design your loyalty card',
      description: hasActiveCard
        ? 'Your card is ready!'
        : 'Create a card design for your customers',
      icon: PaintBrushIcon,
      isComplete: hasActiveCard,
      action: hasActiveCard ? 'Edit Design' : 'Create Card',
    },
    {
      id: 'data',
      tabId: 'data',
      title: 'Set up customer data collection',
      description: 'Collect name or email to identify customers and resend lost passes',
      icon: UserCircleIcon,
      isComplete: hasDataCollection,
      action: 'Configure',
    },
    {
      id: 'location',
      tabId: 'locations',
      title: 'Add your business location',
      description: 'Enable location-based notifications when customers are nearby',
      icon: MapPinIcon,
      isComplete: hasLocation,
      action: 'Add Location',
    },
    {
      id: 'notifications',
      tabId: 'notifications',
      title: 'Configure notifications',
      description: 'Customize what customers see when they earn stamps and rewards',
      icon: BellIcon,
      isComplete: hasNotifications,
      action: 'Customize',
    },
  ];

  const completedSteps = setupSteps.filter(step => step.isComplete).length;
  const allComplete = completedSteps === setupSteps.length;

  const handleStepClick = (step: SetupStep) => {
    if (step.tabId && onNavigateToTab) {
      onNavigateToTab(step.tabId);
    }
    // For card design, would navigate to design editor - handled by parent
  };

  const handleSkipSetup = async () => {
    // TODO: Call API to set onboarding_complete = true
    console.log('Skip setup - would set onboarding_complete = true');
  };

  // Status Summary View (for returning users who completed setup)
  if (isSetupComplete || allComplete) {
    return (
      <div className={embedded ? 'p-6' : ''}>
        <div className="space-y-6">
          {embedded && (
            <div className="mb-2">
              <h3 className="font-semibold">Program Overview</h3>
              <p className="text-sm text-muted-foreground">
                Your loyalty program at a glance
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Customer Data</p>
              <div className="flex flex-wrap gap-1">
                {settings?.customer_data_collection?.collect_name && (
                  <Badge variant="secondary" className="text-xs">Name</Badge>
                )}
                {settings?.customer_data_collection?.collect_email && (
                  <Badge variant="secondary" className="text-xs">Email</Badge>
                )}
                {settings?.customer_data_collection?.collect_phone && (
                  <Badge variant="secondary" className="text-xs">Phone</Badge>
                )}
                {!hasDataCollection && (
                  <span className="text-xs text-muted-foreground">Anonymous mode</span>
                )}
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Locations</p>
              <p className="text-sm font-medium">
                {hasLocation ? '1 location' : 'No locations'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab?.('url')}
            >
              View QR Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab?.('data')}
            >
              Edit Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Getting Started View (for first-time users)
  return (
    <div className={embedded ? 'p-6' : ''}>
      <div className="space-y-6">
        {embedded && (
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Getting Started</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your loyalty program in a few steps
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {completedSteps}/{setupSteps.length} complete
              </Badge>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
          />
        </div>

        {/* Setup Steps */}
        <div className="space-y-3">
          {setupSteps.map((step, index) => {
            const Icon = step.icon;
            const StepIndicator = step.isComplete ? CheckCircleIcon : CircleIcon;

            return (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handleStepClick(step)}
              >
                <div className="mt-0.5">
                  <StepIndicator
                    className={`h-5 w-5 ${step.isComplete ? 'text-green-600' : 'text-muted-foreground'}`}
                    weight={step.isComplete ? 'fill' : 'regular'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className={`font-medium text-sm ${step.isComplete ? 'text-muted-foreground line-through' : ''}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
                {!step.isComplete && step.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step);
                    }}
                  >
                    {step.action}
                    <ArrowRightIcon className="ml-1 h-3 w-3" />
                  </Button>
                )}
                {step.isComplete && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Done
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Skip Setup */}
        <div className="pt-2 border-t">
          <button
            onClick={handleSkipSetup}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip setup and explore on your own →
          </button>
        </div>
      </div>
    </div>
  );
}
