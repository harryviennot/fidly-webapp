'use client';

import { cn } from '@/lib/utils';
import {
  LinkIcon,
  UserCircleIcon,
  MapPinIcon,
  BellIcon,
  Crown,
} from '@phosphor-icons/react';

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  proOnly?: boolean;
}

const sections: Section[] = [
  { id: 'business-url', label: 'Business URL', icon: LinkIcon },
  { id: 'data-collection', label: 'Customer Data', icon: UserCircleIcon },
  { id: 'locations', label: 'Locations', icon: MapPinIcon, proOnly: true },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
];

interface ProgramSettingsSidebarProps {
  activeSection: string;
  isProPlan: boolean;
}

export function ProgramSettingsSidebar({ activeSection, isProPlan }: ProgramSettingsSidebarProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="hidden md:block w-48 shrink-0">
      <div className="sticky top-[92px] space-y-1 pr-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
          Program Settings
        </h3>
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const isLocked = section.proOnly && !isProPlan;

          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2',
                isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/5'
              )}
            >
              <Icon className="h-4 w-4" weight={isActive ? 'fill' : 'regular'} />
              <span className="flex-1">{section.label}</span>
              {isLocked && (
                <Crown className="h-3.5 w-3.5 text-amber-500" weight="fill" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
