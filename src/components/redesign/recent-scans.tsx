"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { TransactionResponse } from "@/types";
import { cn } from "@/lib/utils";

const ACTION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  stamp_added: { bg: "#E8F5E4", color: "#3D6B3D", label: "Stamped" },
  reward_redeemed: { bg: "#FFF3E0", color: "#C4883D", label: "Reward!" },
  stamp_voided: { bg: "#FDE8E4", color: "#C75050", label: "Voided" },
  bonus_stamp: { bg: "#E4F0F8", color: "#4A7C59", label: "Bonus" },
  stamps_adjusted: { bg: "#F0EDE7", color: "#8A8A8A", label: "Adjusted" },
};

const AVATAR_COLORS = [
  "#4A7C59", "#C4883D", "#3D7CAF", "#8A6BBE", "#C75050", "#2D8B75",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface RecentScansProps {
  transactions: TransactionResponse[];
  className?: string;
  delay?: number;
}

export function RecentScans({ transactions, className, delay = 0 }: RecentScansProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px_20px] animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
          {t("dashboard.recentScans")}
        </h3>
        <Link
          href="/activity"
          className="text-xs text-[var(--accent)] font-medium hover:underline"
        >
          {t("dashboard.viewAll")}
        </Link>
      </div>

      <div className="divide-y divide-[var(--border-light)]">
        {transactions.map((tx) => {
          const action = ACTION_STYLES[tx.type] || ACTION_STYLES.stamp_added;
          const customerName = tx.metadata?.customer_name as string || "Customer";
          const initial = customerName.charAt(0).toUpperCase();
          const avatarBg = getAvatarColor(customerName);

          return (
            <div key={tx.id} className="flex items-center gap-3 py-2.5">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-semibold"
                style={{ background: avatarBg }}
              >
                {initial}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-[#333] truncate">
                    {customerName}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ background: action.bg, color: action.color }}
                  >
                    {action.label}
                  </span>
                </div>
                <div className="text-[11px] text-[#A5A5A5] flex items-center gap-1">
                  <span>
                    {tx.stamps_before}→{tx.stamps_after} stamps
                  </span>
                  {tx.employee_name && (
                    <>
                      <span className="text-[#D8D5CE]">·</span>
                      <span>by {tx.employee_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Time */}
              <span className="text-[11px] text-[#B0B0B0] shrink-0">
                {formatTime(tx.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
