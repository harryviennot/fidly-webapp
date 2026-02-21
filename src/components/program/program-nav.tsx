'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/program/details', labelKey: 'nav.details' as const },
  { href: '/program/design', labelKey: 'nav.design' as const },
];

export function ProgramNav() {
  const pathname = usePathname();
  const t = useTranslations('loyaltyProgram');

  return (
    <nav className="flex gap-1 border-b">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              'hover:text-foreground',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {t(item.labelKey)}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
