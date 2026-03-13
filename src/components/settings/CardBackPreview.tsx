'use client';

import { useTranslations } from 'next-intl';
import type { BusinessInfoEntry } from '@/types/business';
import { BUSINESS_INFO_TYPE_ICONS } from '@/lib/business-info-utils';

interface CardBackPreviewProps {
  businessName: string;
  logoUrl?: string | null;
  fields: BusinessInfoEntry[];
  accentColor: string;
  backgroundColor: string;
  locale: string;
}


const LOCALE_DISPLAY: Record<string, string> = {
  fr: '🇫🇷 Français',
  en: '🇬🇧 English',
};

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

type TFunction = ReturnType<typeof useTranslations>;

function getTypeLabel(type: string, customLabel: string | undefined, t: TFunction): string {
  switch (type) {
    case 'hours': return t('typeHours');
    case 'website': return t('typeWebsite');
    case 'phone': return t('typePhone');
    case 'email': return t('typeEmail');
    case 'address': return t('typeAddress');
    case 'custom': return (customLabel as string) || t('typeInfo');
    default: return type;
  }
}

function getFieldValue(entry: BusinessInfoEntry, t: TFunction): { label: string; content: React.ReactNode } {
  const label = getTypeLabel(entry.type, entry.data.label as string | undefined, t);

  switch (entry.type) {
    case 'hours': {
      const schedule = (entry.data.schedule as Array<{
        days: string;
        open: string;
        close: string;
        closed: boolean;
      }>) || [];
      return {
        label,
        content: schedule.length === 0 ? (
          <span className="text-[#CCC] italic">{t('notSet')}</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {schedule.map((row, i) => (
              <div key={i} className="flex justify-between text-[11px] leading-[1.4]">
                <span className="text-[#555] font-medium">{row.days || '—'}</span>
                <span className={row.closed ? 'text-red-400 font-medium' : 'text-[#888]'}>
                  {row.closed ? t('closed') : `${formatTime(row.open)} – ${formatTime(row.close)}`}
                </span>
              </div>
            ))}
          </div>
        ),
      };
    }
    case 'website':
      return { label, content: <span className="text-[11.5px] text-[#555] break-all leading-[1.4]">{(entry.data.url as string) || <span className="text-[#CCC] italic">{t('notSet')}</span>}</span> };
    case 'phone':
      return { label, content: <span className="text-[11.5px] text-[#555] leading-[1.4]">{(entry.data.number as string) || <span className="text-[#CCC] italic">{t('notSet')}</span>}</span> };
    case 'email':
      return { label, content: <span className="text-[11.5px] text-[#555] leading-[1.4]">{(entry.data.email as string) || <span className="text-[#CCC] italic">{t('notSet')}</span>}</span> };
    case 'address':
      return { label, content: <span className="text-[11.5px] text-[#555] leading-[1.4]">{(entry.data.address as string) || <span className="text-[#CCC] italic">{t('notSet')}</span>}</span> };
    case 'custom':
      return { label, content: <span className="text-[11.5px] text-[#555] leading-[1.4]">{(entry.data.value as string) || <span className="text-[#CCC] italic">{t('notSet')}</span>}</span> };
    default:
      return { label, content: null };
  }
}

export function CardBackPreview({
  businessName,
  logoUrl,
  fields,
  accentColor,
  backgroundColor,
  locale,
}: CardBackPreviewProps) {
  const t = useTranslations('settings.cardBackPreview');

  return (
    <div className="bg-white rounded-xl border border-[#EEEDEA] p-5 overflow-hidden">
      <div className="text-[15px] font-semibold text-[#1A1A1A] mb-1">{t('title')}</div>
      <div className="text-[11px] text-[#A0A0A0] mb-4">{t('subtitle')}</div>

      {/* Card mockup */}
      <div className="bg-[#FAFAF8] rounded-2xl border border-[#EEEDEA] p-4 mb-4">
        {/* Header strip */}
        <div
          className="flex items-center gap-2 mb-3 pb-3"
          style={{ borderBottom: `2px solid ${accentColor}20` }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={businessName}
              className="w-7 h-7 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {businessName.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <div className="text-[13px] font-bold text-[#1A1A1A] leading-tight">
              {businessName || 'Your Business'}
            </div>
            <div className="text-[9px] text-[#AAA]">{t('loyaltyCard')}</div>
          </div>
        </div>

        {/* Fields */}
        {fields.length === 0 ? (
          <div className="py-3 text-center text-[11px] text-[#CCC]">{t('noFields')}</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {fields.map((entry) => {
              const Icon = BUSINESS_INFO_TYPE_ICONS[entry.type as keyof typeof BUSINESS_INFO_TYPE_ICONS] || BUSINESS_INFO_TYPE_ICONS.custom;
              const { label, content } = getFieldValue(entry, t);
              return (
                <div key={entry.key} className="flex items-start gap-2">
                  <Icon className="w-3 h-3 text-[#AAA] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-semibold text-[#AAA] uppercase tracking-wide mb-0.5">
                      {label}
                    </div>
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings summary */}
      <div className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-2">{t('settingsLabel')}</div>
      <div className="flex flex-col divide-y divide-[#F8F7F5]">
        <div className="flex justify-between items-center py-1.5">
          <span className="text-[12px] text-[#8A8A8A]">{t('language')}</span>
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            {LOCALE_DISPLAY[locale] || locale}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-[12px] text-[#8A8A8A]">{t('backFields')}</span>
          <span className="text-[12px] font-semibold text-[#1A1A1A]">
            {fields.length} {fields.length !== 1 ? t('fields') : t('field')}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-[12px] text-[#8A8A8A]">{t('accent')}</span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded"
              style={{ backgroundColor: accentColor, border: '1px solid rgba(0,0,0,0.1)' }}
            />
            <span className="text-[12px] font-semibold text-[#1A1A1A] font-mono">{accentColor}</span>
          </div>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-[12px] text-[#8A8A8A]">{t('background')}</span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded"
              style={{ backgroundColor: backgroundColor, border: '1px solid rgba(0,0,0,0.1)' }}
            />
            <span className="text-[12px] font-semibold text-[#1A1A1A] font-mono">{backgroundColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
