'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  HouseIcon,
  LinkIcon,
  UserCircleIcon,
  MapPinIcon,
  BellIcon,
  Crown,
} from '@phosphor-icons/react';
import { OverviewSection } from './sections/OverviewSection';
import { BusinessUrlSection } from './sections/BusinessUrlSection';
import { DataCollectionSection } from './sections/DataCollectionSection';
import { LocationsSection } from './sections/LocationsSection';
import { NotificationsSection } from './sections/NotificationsSection';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  proOnly?: boolean;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: HouseIcon },
  { id: 'url', label: 'Business URL', icon: LinkIcon },
  { id: 'data', label: 'Customer Data', icon: UserCircleIcon },
  { id: 'locations', label: 'Locations', icon: MapPinIcon, proOnly: true },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
];

interface ProgramSettingsCardProps {
  isProPlan: boolean;
  hasActiveCard?: boolean;
}

export function ProgramSettingsCard({ isProPlan, hasActiveCard = false }: ProgramSettingsCardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');

  // Measure and animate content height changes
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [activeTab]);

  const handleNavigateToTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewSection
            embedded
            onNavigateToTab={handleNavigateToTab}
            hasActiveCard={hasActiveCard}
          />
        );
      case 'url':
        return <BusinessUrlSection embedded />;
      case 'data':
        return <DataCollectionSection embedded />;
      case 'locations':
        return <LocationsSection embedded />;
      case 'notifications':
        return <NotificationsSection embedded />;
      default:
        return null;
    }
  };

  return (
    <Card className="flex-1 overflow-hidden">
      {/* Tabs Header */}
      <div className="border-b border-[var(--border)] bg-muted/30">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isLocked = tab.proOnly && !isProPlan;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                  'hover:bg-muted/50',
                  isActive
                    ? 'text-[var(--accent)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" weight={isActive ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{tab.label}</span>
                {isLocked && (
                  <Crown className="h-3 w-3 text-amber-500" weight="fill" />
                )}
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content with smooth height transition */}
      <CardContent className="p-0 overflow-hidden">
        <div
          className="transition-[height] duration-200 ease-out"
          style={{ height: contentHeight === 'auto' ? 'auto' : contentHeight }}
        >
          <div ref={contentRef}>
            {renderContent()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
