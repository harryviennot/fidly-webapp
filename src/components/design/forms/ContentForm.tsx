'use client';

import { useTranslations } from 'next-intl';
import FieldEditor from '@/components/design/FieldEditor';
import { useDesignForm } from './DesignFormContext';

/**
 * Content section: front-of-card detail fields and the auxiliary slot.
 * Already mostly composed from `FieldEditor`; the only state it touches is
 * `formData.secondary_fields` and `formData.auxiliary_fields`.
 */
export function ContentForm() {
  const t = useTranslations('designEditor.editor');
  const { formData, updateField, bgHex, textHex } = useDesignForm();

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{t('contentDescription')}</p>
      <FieldEditor
        title={t('frontDetails')}
        fields={formData.secondary_fields || []}
        onChange={(f) => updateField('secondary_fields', f)}
        maxFields={3}
        cardBg={bgHex}
        cardText={textHex}
      />
      <FieldEditor
        title={t('additionalInfo')}
        fields={formData.auxiliary_fields || []}
        onChange={(f) => updateField('auxiliary_fields', f)}
        maxFields={3}
        cardBg={bgHex}
        cardText={textHex}
      />
    </div>
  );
}
