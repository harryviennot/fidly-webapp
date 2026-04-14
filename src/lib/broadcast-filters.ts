/**
 * Helpers for the broadcasts feature.
 *
 * - `describeFilter` turns a backend `target_filter` object into a list of
 *   human-readable chips for the list view, detail sheet, and wizard review.
 * - `computeThisMonthQuota` counts broadcasts that reserve quota in the
 *   current calendar month. Used by the Growth quota counter on the list
 *   page (Pro hides the counter entirely so this is never called).
 */

import type {
  Broadcast,
  BroadcastTargetFilter,
} from '@/types/notification';

export interface FilterChip {
  key: keyof BroadcastTargetFilter | 'all';
  label: string;
}

type Translator = (key: string, values?: Record<string, unknown>) => string;

/**
 * Human-readable chips for a `target_filter`. Order is deterministic so the
 * chips render the same way in the list row, detail sheet and review step.
 */
export function describeFilter(
  filter: BroadcastTargetFilter | null | undefined,
  t: Translator
): FilterChip[] {
  if (!filter || Object.keys(filter).length === 0 || filter.all) {
    return [{ key: 'all', label: t('audience.all') }];
  }

  const chips: FilterChip[] = [];
  const tf = t; // shorthand

  if (filter.enrolled_before_days !== undefined) {
    chips.push({
      key: 'enrolled_before_days',
      label: tf('audience.chip.enrolled_before_days', {
        n: filter.enrolled_before_days,
      }),
    });
  }
  if (filter.enrolled_after_days !== undefined) {
    chips.push({
      key: 'enrolled_after_days',
      label: tf('audience.chip.enrolled_after_days', {
        n: filter.enrolled_after_days,
      }),
    });
  }
  if (filter.stamp_count_min !== undefined) {
    chips.push({
      key: 'stamp_count_min',
      label: tf('audience.chip.stamp_count_min', { n: filter.stamp_count_min }),
    });
  }
  if (filter.stamp_count_max !== undefined) {
    chips.push({
      key: 'stamp_count_max',
      label: tf('audience.chip.stamp_count_max', { n: filter.stamp_count_max }),
    });
  }
  if (filter.has_redeemed) {
    chips.push({
      key: 'has_redeemed',
      label: tf('audience.chip.has_redeemed'),
    });
  }
  if (filter.inactive_days !== undefined) {
    chips.push({
      key: 'inactive_days',
      label: tf('audience.chip.inactive_days', { n: filter.inactive_days }),
    });
  }

  // Fallback — should not happen because `all: true` was caught above, but
  // keeps the list non-empty if the backend returned an unexpected shape.
  if (chips.length === 0) {
    chips.push({ key: 'all', label: t('audience.all') });
  }

  return chips;
}

/**
 * Count broadcasts that reserve quota in the current calendar month.
 * Matches backend rule: `status IN ('scheduled','sending','sent')` AND
 * `created_at` inside the current month.
 */
const QUOTA_STATUSES = new Set<Broadcast['status']>([
  'scheduled',
  'sending',
  'sent',
]);

export function computeThisMonthQuota(items: Broadcast[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let used = 0;
  for (const item of items) {
    if (!QUOTA_STATUSES.has(item.status)) continue;
    const createdAt = new Date(item.created_at);
    if (createdAt >= startOfMonth) used += 1;
  }
  return used;
}

/** Whether a broadcast row can be edited via the wizard. */
export function isEditable(status: Broadcast['status']): boolean {
  return status === 'draft' || status === 'scheduled';
}
