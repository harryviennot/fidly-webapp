'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash, Clock, Globe, Phone, Envelope, MapPin, TextT, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BusinessInfoEntry } from '@/types/business';

const INFO_TYPE_ICONS = {
  hours: Clock,
  website: Globe,
  phone: Phone,
  email: Envelope,
  address: MapPin,
  custom: TextT,
} as const;

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

  const addEntry = (type: InfoType) => {
    const defaultData = getDefaultData(type, t);
    const key = type === 'custom' ? `biz_custom_${crypto.randomUUID()}` : `biz_${type}`;
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

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">{t('noInfoYet')}</p>
      )}

      {value.map((entry, index) => (
        <InfoEntryEditor
          key={entry.key}
          entry={entry}
          index={index}
          total={value.length}
          onUpdate={(data) => updateEntry(index, data)}
          onRemove={() => removeEntry(index)}
          onMove={(direction) => moveEntry(index, direction)}
        />
      ))}

      {availableTypes.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t('addInfo')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            {availableTypes.map((type) => {
              const Icon = INFO_TYPE_ICONS[type];
              return (
                <DropdownMenuItem key={type} onClick={() => addEntry(type)}>
                  <Icon className="w-4 h-4 mr-2" />
                  {t(`types.${type}`)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
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
}: {
  entry: BusinessInfoEntry;
  index: number;
  total: number;
  onUpdate: (data: Record<string, unknown>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const t = useTranslations('settings.cardInfo');
  const Icon = INFO_TYPE_ICONS[entry.type] || TextT;
  const title = entry.type === 'custom'
    ? ((entry.data.label as string) || t('custom.title'))
    : t(`${entry.type}.title`);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {total > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onMove('up')}
                disabled={index === 0}
                title={t('moveUp')}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onMove('down')}
                disabled={index === total - 1}
                title={t('moveDown')}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

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
      className="h-9 text-sm"
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
    <div className="space-y-2">
      {schedule.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={row.days}
            onChange={(e) => updateRow(index, { days: e.target.value })}
            placeholder={t('daysPlaceholder')}
            className="h-8 text-sm w-28 shrink-0"
          />
          {row.closed ? (
            <span className="text-sm text-muted-foreground flex-1 text-center">{t('closed')}</span>
          ) : (
            <>
              <Input
                type="time"
                value={row.open}
                onChange={(e) => updateRow(index, { open: e.target.value })}
                className="h-8 text-sm w-[110px]"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="time"
                value={row.close}
                onChange={(e) => updateRow(index, { close: e.target.value })}
                className="h-8 text-sm w-[110px]"
              />
            </>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch
              checked={row.closed}
              onCheckedChange={(closed) => updateRow(index, { closed })}
              className="scale-75"
            />
            <span className="text-xs text-muted-foreground w-10">{t('closed')}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeRow(index)}
          >
            <Trash className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        {t('addRow')}
      </Button>
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
        className="h-9 text-sm"
      />
      <textarea
        value={(data.value as string) || ''}
        onChange={(e) => onChange({ ...data, value: e.target.value })}
        placeholder={t('valuePlaceholder')}
        rows={2}
        className="min-h-[36px] border border-input bg-background text-sm rounded-md px-3 py-2 w-full resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
