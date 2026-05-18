import type { CardDesignCreate } from '@/types';

/**
 * Strip secondary / auxiliary / back fields whose label is empty before
 * persisting to the backend. The Content / Back FieldEditors now add rows
 * directly to the form (no pending-commit intermediate) so the user sees
 * real-time card updates, which means empty rows can pile up if a user
 * clicks "Add field" and then walks away. The card preview already hides
 * them; this util makes the API write match the preview.
 *
 * Fields with a label but empty value pass through — the user clearly
 * meant to add that field but didn't fill in the value yet.
 */
export function pruneEmptyLabelFields<T extends Pick<CardDesignCreate, 'secondary_fields' | 'auxiliary_fields' | 'back_fields'>>(
  data: T
): T {
  const isLabelled = (f: { label?: string | null }) =>
    typeof f.label === 'string' && f.label.trim().length > 0;
  return {
    ...data,
    secondary_fields: (data.secondary_fields ?? []).filter(isLabelled),
    auxiliary_fields: (data.auxiliary_fields ?? []).filter(isLabelled),
    back_fields: (data.back_fields ?? []).filter(isLabelled),
  };
}
