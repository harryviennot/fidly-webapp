import type { CustomerResponse } from '@/types';

export type CustomerSegment = 'new' | 'regular' | 'vip' | 'close_to_reward' | 'at_risk';

export function classifyCustomer(
  customer: CustomerResponse,
  maxStamps: number,
  now = new Date()
): CustomerSegment {
  const stamps = customer.stamps;
  const createdAt = customer.created_at ? new Date(customer.created_at) : null;
  const lastActivity = customer.last_activity_at ?? customer.updated_at;
  const updatedAt = lastActivity ? new Date(lastActivity) : null;

  // Close to reward: within 2 stamps of max
  if (stamps >= maxStamps - 2 && stamps < maxStamps) {
    return 'close_to_reward';
  }

  // New: created less than 7 days ago
  if (createdAt) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (createdAt >= sevenDaysAgo) {
      return 'new';
    }
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
};

/** Avatar background colors per segment */
export const SEGMENT_AVATAR_COLORS: Record<CustomerSegment, string> = {
  new: '#3D7CAF',
  regular: '#5B8C5A',
  vip: '#C4883D',
  close_to_reward: '#4A7C59',
  at_risk: '#C75050',
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
    close_to_reward: 0,
    at_risk: 0,
  };

  for (const customer of customers) {
    const segment = classifyCustomer(customer, maxStamps, now);
    counts[segment]++;
  }

  return counts;
}
