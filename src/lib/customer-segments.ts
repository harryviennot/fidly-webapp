import type { CustomerResponse } from '@/types';

export type CustomerSegment = 'new' | 'regular' | 'vip' | 'close_to_reward' | 'at_risk';

export function classifyCustomer(
  customer: CustomerResponse,
  maxStamps: number,
  now = new Date()
): CustomerSegment {
  const stamps = customer.stamps;
  const createdAt = customer.created_at ? new Date(customer.created_at) : null;
  const updatedAt = customer.updated_at ? new Date(customer.updated_at) : null;

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
  color: string;
  bgColor: string;
}

const SEGMENT_CONFIGS: Record<CustomerSegment, SegmentConfig> = {
  new: {
    labelKey: 'segments.new',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  regular: {
    labelKey: 'segments.regular',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
  },
  vip: {
    labelKey: 'segments.vip',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  close_to_reward: {
    labelKey: 'segments.closeToReward',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
  at_risk: {
    labelKey: 'segments.atRisk',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
  },
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
