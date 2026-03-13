import { ClockIcon, GlobeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, TextTIcon } from '@phosphor-icons/react';
import type { BusinessInfoEntry } from '@/types/business';

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
