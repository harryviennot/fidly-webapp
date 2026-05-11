/**
 * Computes the "what changes if you downgrade to Starter" diff used in the
 * launch wizard's Plan step. Combines static facts about the Starter tier
 * (broadcasts disabled, etc.) with dynamic items derived from current usage
 * (number of customised templates / milestones).
 *
 * For the wizard the priority is honesty — be specific about what
 * disappears or resets so the user can decide with eyes open. Aligns with
 * the conversion-by-loss-aversion framing in the plan.
 */

export interface RevertItem {
  /** Stable key for tests + analytics. */
  key: string;
  /** Short label shown bold to the user. */
  label: string;
  /** One-line detail explaining the impact. */
  detail: string;
}

export interface ComputeRevertsArgs {
  /** Number of templates the user has customised away from defaults. */
  customNotificationTemplates?: number;
  /** Total custom milestones currently configured. */
  milestoneCount?: number;
  /** Whether the active design uses custom strip-background (Growth/Pro feature). */
  hasCustomStripBackground?: boolean;
  /** Number of additional designs beyond the first (Starter caps at 1). */
  extraDesignsCount?: number;
}

const STARTER_MILESTONE_CAP = 0;

/**
 * Returns the ordered list of reverts the user would experience on Starter.
 * Always-on facts come first; dynamic items follow only when they actually
 * apply (avoids noise like "0 milestones removed").
 */
export function computeStarterReverts(args: ComputeRevertsArgs = {}): RevertItem[] {
  const {
    customNotificationTemplates = 0,
    milestoneCount = 0,
    hasCustomStripBackground = false,
    extraDesignsCount = 0,
  } = args;

  const items: RevertItem[] = [
    {
      key: 'broadcasts',
      label: 'Broadcasts disabled',
      detail: 'Drafts stay, but you can\'t send broadcasts on Starter.',
    },
  ];

  if (customNotificationTemplates > 0) {
    items.push({
      key: 'custom_notifications',
      label: 'Custom notification messages reset',
      detail: `${customNotificationTemplates} customised template${customNotificationTemplates > 1 ? 's revert' : ' reverts'} to defaults.`,
    });
  }

  if (milestoneCount > STARTER_MILESTONE_CAP) {
    items.push({
      key: 'milestones',
      label: 'Custom milestones removed',
      detail: `All ${milestoneCount} milestone${milestoneCount > 1 ? 's' : ''} you've added will be deleted.`,
    });
  }

  if (extraDesignsCount > 0) {
    items.push({
      key: 'extra_designs',
      label: 'Extra card designs removed',
      detail: `Starter keeps your active card only. ${extraDesignsCount} other design${extraDesignsCount > 1 ? 's' : ''} will be deleted.`,
    });
  }

  if (hasCustomStripBackground) {
    items.push({
      key: 'strip_background',
      label: 'Card strip image removed',
      detail: 'Your card reverts to a solid stamp background.',
    });
  }

  return items;
}
