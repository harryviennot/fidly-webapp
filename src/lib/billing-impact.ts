import type { PreviewDowngradeResponse } from '@/api/billing';

/**
 * Features the backend's preview-downgrade response reports as "lost" but
 * which aren't actually shipped yet — keep this aligned with
 * `DowngradeConfirmDialog`'s `HIDDEN_FEATURES` set. Listing them here would
 * otherwise scare the user about capabilities they never had access to.
 */
const HIDDEN_FEATURES = new Set([
  'programs.events',
  'programs.multiple',
  'designs.scheduled',
  'locations.multiple',
  'locations.geofencing',
  'locations.analytics',
  'analytics.advanced',
]);

/**
 * Returns true when a downgrade preview would actually surface a change the
 * user can perceive — concrete resource impact (team / designs over the
 * tier cap), notification impact (custom templates disabled, scheduled
 * broadcasts cancelled, milestones removed), or a feature loss that isn't
 * in the hidden / not-yet-shipped set.
 *
 * Mirrors the visibility logic inside `DowngradeConfirmDialog` so the
 * wizard can short-circuit straight to the commit when there's nothing
 * for the dialog to tell the user.
 */
export function hasMaterialDowngradeImpact(
  preview: PreviewDowngradeResponse
): boolean {
  const impact = preview.impact ?? {};
  const teamAffected = (impact['team.max_members']?.affected ?? 0) > 0;
  const designsAffected = (impact['designs.max_active']?.affected ?? 0) > 0;
  const ni = preview.notification_impact;
  const notificationImpact =
    !!ni &&
    (ni.custom_templates_disabled > 0 ||
      ni.milestones_disabled > 0 ||
      ni.scheduled_broadcasts_cancelled > 0);
  const featureImpact = (preview.features_lost ?? []).some(
    (k) => !HIDDEN_FEATURES.has(k)
  );
  return teamAffected || designsAffected || notificationImpact || featureImpact;
}
