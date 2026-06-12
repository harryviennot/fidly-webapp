import type { CustomerResponse } from '@/types';

export type CustomerSegment = 'new' | 'regular' | 'vip' | 'reward_ready' | 'close_to_reward' | 'at_risk' | 'ghost';

export function classifyCustomer(
  customer: CustomerResponse,
  maxStamps: number,
  now = new Date()
): CustomerSegment {
  const stamps = customer.stamps;
  const createdAt = customer.created_at ? new Date(customer.created_at) : null;
  const lastActivity = customer.last_activity_at ?? customer.updated_at;
  const updatedAt = lastActivity ? new Date(lastActivity) : null;

  // Reward ready: holds something redeemable right now — banked rewards
  // (stackable rewards) or a full card. Checked before close_to_reward:
  // "has a reward waiting" beats "is close to the next one".
  if ((customer.rewards ?? 0) > 0 || stamps >= maxStamps) {
    return 'reward_ready';
  }

  // Close to reward: within 2 stamps of max
  if (stamps >= maxStamps - 2 && stamps < maxStamps) {
    return 'close_to_reward';
  }

  // New: created less than 14 days ago
  if (createdAt) {
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    if (createdAt >= fourteenDaysAgo) {
      return 'new';
    }
  }

  // Ghost: never came back after getting the card (0 stamps, past the "new" window)
  if (stamps === 0) {
    return 'ghost';
  }

  // At risk: no activity in 30+ days and has stamps
  if (updatedAt && stamps > 0) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (updatedAt < thirtyDaysAgo) {
      return 'at_risk';
    }
  }

  // VIP: 3+ redemptions
  if ((customer.total_redemptions ?? 0) >= 3) {
    return 'vip';
  }

  return 'regular';
}

interface SegmentConfig {
  labelKey: string;
  /** Hex text color */
  color: string;
  /** Hex background color */
  bg: string;
}

const SEGMENT_CONFIGS: Record<CustomerSegment, SegmentConfig> = {
  new: {
    labelKey: 'segments.new',
    color: '#3D7CAF',
    bg: '#E4F0F8',
  },
  regular: {
    labelKey: 'segments.regular',
    color: '#3D6B3D',
    bg: '#E8F5E4',
  },
  vip: {
    labelKey: 'segments.vip',
    color: '#C4883D',
    bg: '#FFF3E0',
  },
  reward_ready: {
    labelKey: 'segments.rewardReady',
    color: '#8A5A2B',
    bg: '#FBEED9',
  },
  close_to_reward: {
    labelKey: 'segments.closeToReward',
    color: '#3D6B3D',
    bg: '#E8F5E4',
  },
  at_risk: {
    labelKey: 'segments.atRisk',
    color: '#C75050',
    bg: '#FDE8E4',
  },
  ghost: {
    labelKey: 'segments.ghost',
    color: '#6B6B6B',
    bg: '#EDECEA',
  },
};

/** Avatar background colors per segment */
export const SEGMENT_AVATAR_COLORS: Record<CustomerSegment, string> = {
  new: '#3D7CAF',
  regular: '#5B8C5A',
  vip: '#C4883D',
  reward_ready: '#B07B3E',
  close_to_reward: '#4A7C59',
  at_risk: '#C75050',
  ghost: '#9A9A9A',
};

export function getSegmentConfig(segment: CustomerSegment): SegmentConfig {
  return SEGMENT_CONFIGS[segment];
}

export function countBySegment(
  customers: CustomerResponse[],
  maxStamps: number
): Record<CustomerSegment, number> {
  const now = new Date();
  const counts: Record<CustomerSegment, number> = {
    new: 0,
    regular: 0,
    vip: 0,
    reward_ready: 0,
    close_to_reward: 0,
    at_risk: 0,
    ghost: 0,
  };

  for (const customer of customers) {
    const segment = classifyCustomer(customer, maxStamps, now);
    counts[segment]++;
  }

  return counts;
}
