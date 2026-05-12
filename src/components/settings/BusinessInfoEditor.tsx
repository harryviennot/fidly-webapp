'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useEffect } from 'react';
import { Plus } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { BusinessInfoEntry } from '@/types/business';
import { BUSINESS_INFO_TYPE_ICONS } from '@/lib/business-info-utils';

const PRESET_TYPES = ['hours', 'website', 'phone', 'email', 'address'] as const;
const ALL_TYPES = [...PRESET_TYPES, 'custom'] as const;
type InfoType = (typeof ALL_TYPES)[number];

interface ScheduleRow {
  days: string;
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessInfoEditorProps {
  value: BusinessInfoEntry[];
  onChange: (entries: BusinessInfoEntry[]) => void;
}

export function BusinessInfoEditor({ value, onChange }: BusinessInfoEditorProps) {
  const t = useTranslations('settings.cardInfo');
  const usedPresetTypes = new Set(value.map((e) => e.type).filter((t) => t !== 'custom'));
  const availableTypes = ALL_TYPES.filter((type) => type === 'custom' || !usedPresetTypes.has(type));

  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<'up' | 'down' | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [addMenuOpen]);

  const addEntry = (type: InfoType) => {
    const defaultData = getDefaultData(type, t);
    // eslint-disable-next-line react-hooks/purity
    const uid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const key = type === 'custom' ? `biz_custom_${uid}` : `biz_${type}`;
    onChange([...value, { type, key, data: defaultData }]);
  };

  const updateEntry = (index: number, data: Record<string, unknown>) => {
    const updated = value.map((e, i) => (i === index ? { ...e, data } : e));
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveEntry = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.length) return;
    const updated = [...value];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  const animateMove = (index: number, direction: 'up' | 'down') => {
    const entry = value[index];
    if (!entry) return;
    setAnimatingId(entry.key);
    setAnimDir(direction);
    setTimeout(() => {
      moveEntry(index, direction);
      setAnimatingId(null);
      setAnimDir(null);
    }, 280);
  };

  const animateRemove = (index: number) => {
    const entry = value[index];
    if (!entry) return;
    setRemovingId(entry.key);
    setTimeout(() => {
      removeEntry(index);
      setRemovingId(null);
    }, 300);
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <div className="px-4 py-7 rounded-xl border-2 border-dashed border-[#DEDBD5] bg-[#FAFAF8] text-center">
          <div className="text-sm text-[#AAA]">{t('noInfoYet')}</div>
        </div>
      )}

      {value.map((entry, index) => (
        <InfoEntryEditor
          key={entry.key}
          entry={entry}
          index={index}
          total={value.length}
          onUpdate={(data) => updateEntry(index, data)}
          onRemove={() => animateRemove(index)}
          onMove={(direction) => animateMove(index, direction)}
          isAnimating={animatingId === entry.key}
          animDir={animatingId === entry.key ? animDir : null}
          isRemoving={removingId === entry.key}
        />
      ))}

      {availableTypes.length > 0 && (
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#D0CDC6] bg-[#FAFAF8] text-[#777] text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-[#F0EDE7] hover:border-[#C0BDB6] hover:text-[#555]"
          >
            <Plus className="w-3.5 h-3.5" /> {t('addInfo')}
          </button>
          {addMenuOpen && (
            <div
              className={cn(
                'absolute left-0 right-0 z-50 bg-white rounded-xl border border-[#EEEDEA] shadow-lg overflow-hidden p-1.5',
                // Drop down when there's little above the button (few entries),
                // pop up otherwise so the menu doesn't push content off-screen.
                value.length <= 1 ? 'top-full mt-2' : 'bottom-full mb-2'
              )}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-[#AAA] uppercase tracking-wider">
                Choose field type
              </div>
              {availableTypes.map((type) => {
                const Icon = BUSINESS_INFO_TYPE_ICONS[type];
                const alreadyAdded = type !== 'custom' && usedPresetTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => { if (!alreadyAdded) { addEntry(type); setAddMenuOpen(false); } }}
                    disabled={alreadyAdded}
                    className={`w-full px-3 py-2.5 rounded-lg border-none text-left flex items-center gap-3 transition-colors ${alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FAFAF8]'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F0EDE7] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#777]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#333]">{t(`types.${type}`)}</div>
                    </div>
                    {alreadyAdded && (
                      <span className="text-[9px] font-bold text-[#BBB] px-1.5 py-0.5 rounded bg-[#F0EDE7]">ADDED</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoEntryEditor({
  entry,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  isAnimating,
  animDir,
  isRemoving,
}: {
  entry: BusinessInfoEntry;
  index: number;
  total: number;
  onUpdate: (data: Record<string, unknown>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  isAnimating: boolean;
  animDir: 'up' | 'down' | null;
  isRemoving: boolean;
}) {
  const t = useTranslations('settings.cardInfo');
  const Icon = BUSINESS_INFO_TYPE_ICONS[entry.type as keyof typeof BUSINESS_INFO_TYPE_ICONS] || BUSINESS_INFO_TYPE_ICONS.custom;
  const title = entry.type === 'custom'
    ? ((entry.data.label as string) || t('custom.title'))
    : t(`${entry.type}.title`);

  let transform = 'translateY(0)';
  let opacity = 1;
  const transition = 'all 0.28s cubic-bezier(.16,1,.3,1)';
  if (isAnimating && animDir === 'up') transform = 'translateY(-8px)';
  else if (isAnimating && animDir === 'down') transform = 'translateY(8px)';
  if (isRemoving) { transform = 'translateX(40px)'; opacity = 0; }

  return (
    <div
      style={{ transform, opacity, transition }}
      className="flex flex-col gap-3 p-4 rounded-xl bg-[#FAFAF8] border border-[#F0EFEB]"
    >
      {/* Header row: arrows, icon, title, remove — all aligned on one line */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onMove('up')} disabled={index === 0}
            className="w-6 h-6 rounded-md border border-[#E8E5DE] bg-white flex items-center justify-center text-[#999] disabled:text-[#DDD] disabled:bg-[#F8F7F5] disabled:cursor-default hover:enabled:bg-[#F0EDE7] hover:enabled:text-[#555] transition-all"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8l4-4 4 4"/></svg>
          </button>
          <button
            onClick={() => onMove('down')} disabled={index === total - 1}
            className="w-6 h-6 rounded-md border border-[#E8E5DE] bg-white flex items-center justify-center text-[#999] disabled:text-[#DDD] disabled:bg-[#F8F7F5] disabled:cursor-default hover:enabled:bg-[#F0EDE7] hover:enabled:text-[#555] transition-all"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
          </button>
        </div>

        <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E5DE] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#777]" />
        </div>

        <div className="flex-1 min-w-0 text-sm font-semibold text-[#1A1A1A] truncate">
          {title}
        </div>

        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-lg border border-transparent bg-transparent flex items-center justify-center text-[#CCC] shrink-0 transition-all hover:text-red-500 hover:bg-red-50 hover:border-red-200"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l6 6M10 4l-6 6"/></svg>
        </button>
      </div>

      {/* Form row: takes full card width */}
      <div>
        {entry.type === 'hours' && (
          <HoursEditor data={entry.data} onChange={onUpdate} />
        )}
        {entry.type === 'website' && (
          <SimpleFieldEditor
            value={(entry.data.url as string) || ''}
            onChange={(url) => onUpdate({ url })}
            placeholder={t('website.urlPlaceholder')}
            type="url"
          />
        )}
        {entry.type === 'phone' && (
          <SimpleFieldEditor
            value={(entry.data.number as string) || ''}
            onChange={(number) => onUpdate({ number })}
            placeholder={t('phone.numberPlaceholder')}
            type="tel"
          />
        )}
        {entry.type === 'email' && (
          <SimpleFieldEditor
            value={(entry.data.email as string) || ''}
            onChange={(email) => onUpdate({ email })}
            placeholder={t('email.emailPlaceholder')}
            type="email"
          />
        )}
        {entry.type === 'address' && (
          <SimpleFieldEditor
            value={(entry.data.address as string) || ''}
            onChange={(address) => onUpdate({ address })}
            placeholder={t('address.addressPlaceholder')}
          />
        )}
        {entry.type === 'custom' && (
          <CustomFieldEditor
            data={entry.data}
            onChange={onUpdate}
          />
        )}
      </div>
    </div>
  );
}

function SimpleFieldEditor({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="h-10 text-sm px-3 py-2"
    />
  );
}

function HoursEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const t = useTranslations('settings.cardInfo.hours');
  const schedule = ((data.schedule as ScheduleRow[]) || []).map((row) => ({
    days: row.days || '',
    open: row.open || '09:00',
    close: row.close || '18:00',
    closed: row.closed || false,
  }));

  const updateSchedule = (newSchedule: ScheduleRow[]) => {
    onChange({ schedule: newSchedule });
  };

  const updateRow = (index: number, updates: Partial<ScheduleRow>) => {
    const updated = schedule.map((r, i) => (i === index ? { ...r, ...updates } : r));
    updateSchedule(updated);
  };

  const addRow = () => {
    updateSchedule([...schedule, { days: '', open: '09:00', close: '18:00', closed: false }]);
  };

  const removeRow = (index: number) => {
    updateSchedule(schedule.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {schedule.map((row, index) => (
        <div key={index} className="flex flex-col gap-3 p-4 rounded-lg bg-white border border-[#EEEDEA]">
          {/* Line 1: days input + remove */}
          <div className="flex items-center gap-2">
            <Input
              value={row.days}
              onChange={(e) => updateRow(index, { days: e.target.value })}
              placeholder={t('daysPlaceholder')}
              className="h-11 text-sm px-3 py-2 flex-1 min-w-0"
            />
            <button
              onClick={() => removeRow(index)}
              className="w-9 h-9 rounded-md border-none bg-transparent flex items-center justify-center text-[#999] shrink-0 hover:text-red-500 hover:bg-red-50 transition-all"
              aria-label="Remove row"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2l-10 10"/></svg>
            </button>
          </div>

          {/*
            Line 2: time range OR closed banner, plus the closed toggle.
            On mobile (<480px) the toggle drops below the time inputs so each
            row has its own line. On wider screens it sits inline on the right.
          */}
          <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-3">
            {row.closed ? (
              <div className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg bg-red-50 border border-red-200 min-h-[44px]">
                <span className="text-sm text-red-500 font-medium">{t('closed')}</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Input
                  type="time"
                  value={row.open}
                  onChange={(e) => updateRow(index, { open: e.target.value })}
                  className="h-11 text-sm px-3 py-2 flex-1 min-w-0"
                />
                <span className="text-[#999] text-sm shrink-0">–</span>
                <Input
                  type="time"
                  value={row.close}
                  onChange={(e) => updateRow(index, { close: e.target.value })}
                  className="h-11 text-sm px-3 py-2 flex-1 min-w-0"
                />
              </div>
            )}
            <label className="flex items-center gap-2 self-end min-[480px]:self-auto shrink-0 cursor-pointer">
              <Switch
                checked={row.closed}
                onCheckedChange={(closed) => updateRow(index, { closed })}
              />
              <span className="text-sm text-[#666] font-medium">{t('closed')}</span>
            </label>
          </div>
        </div>
      ))}
      <button
        onClick={addRow}
        className="w-full py-3 rounded-lg border-2 border-dashed border-[#D8D5CE] bg-[#FAFAF8] text-[#888] text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-[#F0EDE7] hover:border-[#C0BDB6] hover:text-[#555]"
      >
        <Plus className="w-3.5 h-3.5" /> {t('addRow')}
      </button>
    </div>
  );
}

function CustomFieldEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const t = useTranslations('settings.cardInfo.custom');
  return (
    <div className="space-y-2">
      <Input
        value={(data.label as string) || ''}
        onChange={(e) => onChange({ ...data, label: e.target.value })}
        placeholder={t('labelPlaceholder')}
        className="h-10 text-sm px-3 py-2"
      />
      <textarea
        value={(data.value as string) || ''}
        onChange={(e) => onChange({ ...data, value: e.target.value })}
        placeholder={t('valuePlaceholder')}
        rows={2}
        className="min-h-[40px] border border-[var(--border)] bg-white/50 dark:bg-white/5 text-sm rounded-xl px-3 py-2 w-full resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:border-[var(--accent)]"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />
    </div>
  );
}

function getDefaultData(type: InfoType, t: ReturnType<typeof useTranslations>): Record<string, unknown> {
  switch (type) {
    case 'hours':
      return {
        schedule: [
          { days: t('hours.defaultMonFri'), open: '09:00', close: '18:00', closed: false },
          { days: t('hours.defaultSat'), open: '10:00', close: '16:00', closed: false },
          { days: t('hours.defaultSun'), open: '', close: '', closed: true },
        ],
      };
    case 'website':
      return { url: '' };
    case 'phone':
      return { number: '' };
    case 'email':
      return { email: '' };
    case 'address':
      return { address: '' };
    case 'custom':
      return { label: '', value: '' };
  }
}
