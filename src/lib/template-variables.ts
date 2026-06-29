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
  'rewards_count',
  'reward_name',
  'business_name',
  'customer_first_name',
  'store_location',
  // Points programs (resolved by build_field_context in the backend).
  'points_balance',
  'points_to_next',
  'next_reward_name',
] as const;

export type VariableKey = (typeof VARIABLE_KEYS)[number];

/** Variables only available on the Pro tier. The backend strips these at
 *  render time on non-Pro tiers (`_strip_pro_only_vars`) so customers
 *  don't see raw `{{...}}` syntax in their wallet pass. The UI surfaces
 *  the chip as disabled with an upsell tooltip. */
export const PRO_ONLY_VARIABLES: ReadonlySet<VariableKey> = new Set([
  'store_location',
]);

export type Locale = 'en' | 'fr' | 'es';

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
    rewards_count: 'rewards_count',
    reward_name: 'reward_name',
    business_name: 'business_name',
    customer_first_name: 'customer_first_name',
    store_location: 'store_location',
    points_balance: 'points_balance',
    points_to_next: 'points_to_next',
    next_reward_name: 'next_reward_name',
  },
  fr: {
    stamp_count: 'tampons_actuels',
    total_stamps: 'tampons_max',
    stamps_left: 'tampons_restants',
    rewards_count: 'recompenses_en_attente',
    reward_name: 'nom_recompense',
    business_name: 'nom_entreprise',
    customer_first_name: 'prenom_client',
    store_location: 'lieu_magasin',
    points_balance: 'points_actuels',
    points_to_next: 'points_restants',
    next_reward_name: 'prochaine_recompense',
  },
  es: {
    stamp_count: 'sellos_actuales',
    total_stamps: 'sellos_total',
    stamps_left: 'sellos_restantes',
    rewards_count: 'recompensas_pendientes',
    reward_name: 'nombre_recompensa',
    business_name: 'nombre_comercio',
    customer_first_name: 'nombre_cliente',
    store_location: 'lugar_establecimiento',
    points_balance: 'puntos_actuales',
    points_to_next: 'puntos_restantes',
    next_reward_name: 'siguiente_recompensa',
  },
};

export function isKnownVariable(key: string): key is VariableKey {
  return (VARIABLE_KEYS as readonly string[]).includes(key);
}

/** The stamp-program variable set (order = display order). */
const STAMP_VARIABLE_KEYS: VariableKey[] = [
  'stamp_count',
  'total_stamps',
  'stamps_left',
  'rewards_count',
  'reward_name',
  'business_name',
  'customer_first_name',
];

/**
 * Which {{variables}} a surface should offer for the active program. Stamp
 * programs never see points variables and vice-versa — a points business used
 * to be offered stamp_count / total_stamps / stamps_left, which are meaningless
 * for it. For points the reward variable is type-of-ladder dependent: a single
 * reward exposes {{reward_name}} (the lone reward), a multi-reward ladder
 * exposes {{next_reward_name}} (the immediate objective) and hides reward_name.
 *
 * `includeStoreLocation` adds the Pro-only {{store_location}} chip (notification
 * surfaces show it, gated; pass fields strip it entirely so they omit it).
 */
export function programVariableKeys(opts: {
  type: 'stamp' | 'points' | undefined;
  rewardCount?: number;
  includeStoreLocation?: boolean;
}): VariableKey[] {
  const { type, rewardCount = 0, includeStoreLocation = false } = opts;
  const keys: VariableKey[] =
    type === 'points'
      ? [
          'points_balance',
          'points_to_next',
          rewardCount > 1 ? 'next_reward_name' : 'reward_name',
          'business_name',
          'customer_first_name',
        ]
      : [...STAMP_VARIABLE_KEYS];
  if (includeStoreLocation) keys.push('store_location');
  return keys;
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
    rewards_count: '1',
    reward_name: 'Free Coffee',
    business_name: 'Your business',
    customer_first_name: 'Sarah',
    store_location: 'Westside',
    points_balance: '120',
    points_to_next: '80',
    next_reward_name: 'Free Coffee',
  };
  const values = { ...defaults, ...overrides };
  return template.replace(VARIABLE_PATTERN, (_match, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}
