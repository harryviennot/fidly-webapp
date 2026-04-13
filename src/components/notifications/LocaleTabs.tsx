'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/notification';

interface LocaleTabsProps {
  value: Locale;
  onValueChange: (value: Locale) => void;
  enContent: React.ReactNode;
  frContent: React.ReactNode;
  /** Show a dot indicator next to a locale whose body is empty */
  missingLocales?: Locale[];
  className?: string;
}

export function LocaleTabs({
  value,
  onValueChange,
  enContent,
  frContent,
  missingLocales = [],
  className,
}: LocaleTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as Locale)}
      className={className}
    >
      <TabsList>
        <TabsTrigger value="en" className="gap-1.5">
          EN
          {missingLocales.includes('en') && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              aria-label="Missing"
            />
          )}
        </TabsTrigger>
        <TabsTrigger value="fr" className="gap-1.5">
          FR
          {missingLocales.includes('fr') && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              aria-label="Missing"
            />
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="en" className={cn('mt-3')}>
        {enContent}
      </TabsContent>
      <TabsContent value="fr" className={cn('mt-3')}>
        {frContent}
      </TabsContent>
    </Tabs>
  );
}
