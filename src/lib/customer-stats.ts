import type { CustomerResponse, TransactionResponse } from '@/types';

export interface CustomerPageStats {
  totalCustomers: number;
  newThisWeek: number;
  stampsToday: number;
  redemptionsThisMonth: number;
}

export function calculateCustomerStats(
  customers: CustomerResponse[],
  transactions: TransactionResponse[]
): CustomerPageStats {
  const now = new Date();

  // New this week
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = customers.filter((c) => {
    if (!c.created_at) return false;
    return new Date(c.created_at) >= sevenDaysAgo;
  }).length;

  // Stamps today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const stampsToday = transactions.filter(
    (t) => t.type === 'stamp_added' && new Date(t.created_at) >= todayStart
  ).length;

  // Redemptions this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const redemptionsThisMonth = transactions.filter(
    (t) => t.type === 'reward_redeemed' && new Date(t.created_at) >= monthStart
  ).length;

  return {
    totalCustomers: customers.length,
    newThisWeek,
    stampsToday,
    redemptionsThisMonth,
  };
}
