/**
 * Template variable helpers for notification bodies.
 *
 * Mirrors `NotificationService.extract_variables` in the backend
 * (backend/app/services/programs/notifications.py). Keep in sync.
 */

export const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/** Canonical variable keys stored in the backend. */
export const VARIABLE_KEYS = [
  'stamp_count',
  'total_stamps',
  'stamps_left',
  'reward_name',
  'business_name',
  'customer_first_name',
] as const;

export type VariableKey = (typeof VARIABLE_KEYS)[number];

export type Locale = 'en' | 'fr';

/**
 * Localized display names for each canonical variable. Purely a UI concern —
 * the backend only ever sees the canonical key. French users see
 * `{{tampons_max}}`, English users see `{{total_stamps}}`.
 */
export const VARIABLE_DISPLAY_NAMES: Record<Locale, Record<VariableKey, string>> = {
  en: {
    stamp_count: 'stamp_count',
    total_stamps: 'total_stamps',
    stamps_left: 'stamps_left',
    reward_name: 'reward_name',
    business_name: 'business_name',
    customer_first_name: 'customer_first_name',
  },
  fr: {
    stamp_count: 'tampons_actuels',
    total_stamps: 'tampons_max',
    stamps_left: 'tampons_restants',
    reward_name: 'nom_recompense',
    business_name: 'nom_entreprise',
    customer_first_name: 'prenom_client',
  },
};

export function isKnownVariable(key: string): key is VariableKey {
  return (VARIABLE_KEYS as readonly string[]).includes(key);
}

/**
 * Return the UI-facing name for a variable key. Unknown keys fall back
 * to the key itself so custom/legacy placeholders still render readably.
 */
export function getVariableDisplayName(key: string, locale: Locale): string {
  if (isKnownVariable(key)) {
    return VARIABLE_DISPLAY_NAMES[locale][key];
  }
  return key;
}

/** Extract the set of {{variable}} names referenced in a template string. */
export function extractVariables(template: string): Set<string> {
  const matches = template?.matchAll(VARIABLE_PATTERN) ?? [];
  const vars = new Set<string>();
  for (const match of matches) vars.add(match[1]);
  return vars;
}

/**
 * Render a template with sample values for preview.
 * Substitutes each `{{var}}` with a reasonable example.
 */
export function renderSamplePreview(
  template: string,
  overrides: Record<string, string> = {}
): string {
  const defaults: Record<string, string> = {
    stamp_count: '3',
    total_stamps: '10',
    stamps_left: '7',
    reward_name: 'Free Coffee',
    business_name: 'Your business',
    customer_first_name: 'Sarah',
  };
  const values = { ...defaults, ...overrides };
  return template.replace(VARIABLE_PATTERN, (_match, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}
