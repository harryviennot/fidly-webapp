import { ClockIcon, GlobeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, TextTIcon } from '@phosphor-icons/react';
import type { BusinessInfoEntry } from '@/types/business';
import type { PassField } from '@/types';

export const BUSINESS_INFO_TYPE_ICONS = {
  hours: ClockIcon,
  website: GlobeIcon,
  phone: PhoneIcon,
  email: EnvelopeIcon,
  address: MapPinIcon,
  custom: TextTIcon,
} as const;

const TYPE_LABELS: Record<string, string> = {
  hours: 'Store Hours',
  website: 'Website',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  custom: 'Custom',
};

/** Returns a plain English label for a business info entry (for card previews). */
export function getEntryLabel(entry: BusinessInfoEntry): string {
  return entry.type === 'custom'
    ? ((entry.data.label as string) || 'Custom')
    : (TYPE_LABELS[entry.type] || entry.type);
}

/** Returns a plain string preview value for a business info entry. */
export function getEntryPreview(entry: BusinessInfoEntry): string {
  switch (entry.type) {
    case 'website': return (entry.data.url as string) || '';
    case 'phone': return (entry.data.number as string) || '';
    case 'email': return (entry.data.email as string) || '';
    case 'address': return (entry.data.address as string) || '';
    case 'hours': {
      const schedule = (entry.data.schedule as Array<{ days: string; closed?: boolean }>) || [];
      return schedule.map((s) => s.days).join(', ');
    }
    case 'custom': return (entry.data.value as string) || '';
    default: return '';
  }
}

interface ScheduleRow {
  days: string;
  open?: string;
  close?: string;
  closed?: boolean;
}

/** Full-form value for the card back — schedules expand to multiline rows
 *  with open/close times, unlike `getEntryPreview` which is the compact
 *  one-line form used in the editor's toggle list. */
export function formatEntryBackValue(entry: BusinessInfoEntry): string {
  switch (entry.type) {
    case 'website':
      return (entry.data.url as string) || '';
    case 'phone':
      return (entry.data.number as string) || '';
    case 'email':
      return (entry.data.email as string) || '';
    case 'address':
      return (entry.data.address as string) || '';
    case 'custom':
      return (entry.data.value as string) || '';
    case 'hours': {
      const schedule = (entry.data.schedule as ScheduleRow[]) || [];
      return schedule
        .filter((row) => (row.days ?? '').trim().length > 0)
        .map((row) => {
          if (row.closed) return `${row.days}: —`;
          const open = (row.open ?? '').trim();
          const close = (row.close ?? '').trim();
          if (!open && !close) return row.days;
          return `${row.days}: ${open} – ${close}`;
        })
        .join('\n');
    }
    default:
      return '';
  }
}

/** Converts a business-info entry into a back-of-card PassField, using the
 *  per-type localised label (`t` must be the `settings.cardInfo.types`
 *  translator). Custom entries fall back to the user-typed label. */
export function entryToBackPassField(
  entry: BusinessInfoEntry,
  t: (key: string) => string
): PassField {
  const label =
    entry.type === 'custom'
      ? ((entry.data.label as string) || t('custom'))
      : t(entry.type);
  return {
    key: entry.key,
    label,
    value: formatEntryBackValue(entry),
  };
}
