/**
 * Template variable helpers for notification bodies.
 *
 * Mirrors `NotificationService.extract_variables` in the backend
 * (backend/app/services/programs/notifications.py). Keep in sync.
 */

export const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/** Extract the set of {{variable}} names referenced in a template string. */
export function extractVariables(template: string): Set<string> {
  const matches = template?.matchAll(VARIABLE_PATTERN) ?? [];
  const vars = new Set<string>();
  for (const match of matches) vars.add(match[1]);
  return vars;
}

/**
 * Validate that a custom template body uses the exact same set of variables
 * as the default. Returns `{ missing, extra }` of variable names; both empty
 * means the body is valid.
 *
 * Mirrors the backend `_validate_template_variables` check in
 * backend/app/api/routes/notifications.py.
 */
export function validateTemplateVariables(
  customBody: string,
  defaultBody: string
): { missing: string[]; extra: string[] } {
  const expected = extractVariables(defaultBody);
  const actual = extractVariables(customBody);
  const missing: string[] = [];
  const extra: string[] = [];
  for (const v of expected) if (!actual.has(v)) missing.push(v);
  for (const v of actual) if (!expected.has(v)) extra.push(v);
  return { missing: missing.sort(), extra: extra.sort() };
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
