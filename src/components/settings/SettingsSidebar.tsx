'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
  activeSection: string;
}

export function SettingsSidebar({ activeSection }: SettingsSidebarProps) {
  const t = useTranslations('settings.sidebar');

  const sections = [
    { id: 'business-info', label: t('businessInfo') },
    { id: 'language', label: t('language') },
    { id: 'theme', label: t('theme') },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="hidden md:block w-48 shrink-0">
      <div className="sticky top-[92px] space-y-1 pr-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={cn(
              'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
              activeSection === section.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/5'
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
