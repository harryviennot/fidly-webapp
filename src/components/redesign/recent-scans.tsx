"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  StampIcon,
  GiftIcon,
  ProhibitIcon,
  StarIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { StampIconSvg, type StampIconType } from "@/components/design/StampIconPicker";
import type { TransactionResponse, TransactionType } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  TransactionType,
  {
    icon: typeof StampIcon;
    iconColor: string;
    bgColor: string;
    deltaBg: string;
    deltaText: string;
  }
> = {
  stamp_added: {
    icon: StampIcon,
    iconColor: "text-[var(--accent)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  reward_redeemed: {
    icon: GiftIcon,
    iconColor: "text-[var(--stamp-sand)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E8F5E4]",
    deltaText: "text-[#4A7C59]",
  },
  stamp_voided: {
    icon: ProhibitIcon,
    iconColor: "text-[var(--stamp-coral)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#FDE8E4]",
    deltaText: "text-[#C75050]",
  },
  bonus_stamp: {
    icon: StarIcon,
    iconColor: "text-[var(--stamp-sage)]",
    bgColor: "bg-[var(--accent-light)]",
    deltaBg: "bg-[#E4F0F8]",
    deltaText: "text-[#3D7CAF]",
  },
  stamps_adjusted: {
    icon: SlidersHorizontalIcon,
    iconColor: "text-[var(--muted-foreground)]",
    bgColor: "bg-[var(--background-subtle)]",
    deltaBg: "bg-[#F0EDE7]",
    deltaText: "text-[#8A8A8A]",
  },
};

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
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

export function RecentScans({
  transactions,
  className,
  delay = 0,
  stampIcon: designStampIcon,
  rewardIcon: designRewardIcon,
  stampFilledColor,
  iconColor,
}: RecentScansProps) {
  const t = useTranslations();
  const hasDesignIcons = !!designStampIcon;

  const renderIcon = (tx: TransactionResponse) => {
    const type = tx.type;
    const config = TYPE_CONFIG[type];

    if (hasDesignIcons && (type === "stamp_added" || type === "bonus_stamp")) {
      return (
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: stampFilledColor }}
        >
          <StampIconSvg
            icon={designStampIcon as StampIconType}
            className="w-4 h-4"
            color={iconColor}
          />
        </div>
      );
    }

    if (hasDesignIcons && type === "reward_redeemed") {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-emerald-500/15">
          <StampIconSvg
            icon={(designRewardIcon as StampIconType) ?? "gift"}
            className="w-4 h-4"
            color="#10b981"
          />
        </div>
      );
    }

    if (hasDesignIcons && type === "stamp_voided") {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 bg-red-500/15">
          <StampIconSvg
            icon={designStampIcon as StampIconType}
            className="w-4 h-4"
            color="#ef4444"
          />
        </div>
      );
    }

    const Icon = config.icon;
    return (
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
          config.bgColor
        )}
      >
        <Icon size={14} weight="duotone" className={config.iconColor} />
      </div>
    );
  };

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

      <div>
        {transactions.map((tx, i) => {
          const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.stamp_added;
          const metadata = tx.metadata as Record<string, string> | null;
          const customerName = metadata?.customer_name || "Customer";
          const voidReason = metadata?.void_reason;
          const isLast = i === transactions.length - 1;
          const deltaText =
            tx.stamp_delta > 0 ? `+${tx.stamp_delta}` : String(tx.stamp_delta);

          return (
            <div key={tx.id} className="flex gap-2.5 relative">
              {/* Timeline icon + connecting line */}
              <div className="flex flex-col items-center">
                {renderIcon(tx)}
                {!isLast && <div className="w-[1.5px] flex-1 bg-[#E8E5DE]" />}
              </div>

              {/* Content card */}
              <div className="pb-1.5 flex-1 min-w-0 -mt-0.5">
                <div className="rounded-xl bg-[#FAFAF8] border border-[#F0EFEB] px-3.5 py-2.5">
                  {/* Top row: customer + delta + time */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[12.5px] font-semibold text-[#1A1A1A] truncate">
                        {customerName}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-[5px] shrink-0 ml-1.5 inline-block",
                          config.deltaBg,
                          config.deltaText
                        )}
                      >
                        {deltaText}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#B0B0B0] tabular-nums shrink-0 mt-0.5">
                      {formatTime(tx.created_at)}
                    </span>
                  </div>

                  {/* Bottom row: stamp transition · employee */}
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8A8A8A]">
                    <span className="font-semibold text-[#555] tabular-nums">
                      {tx.stamps_before}
                    </span>
                    <span>→</span>
                    <span className="font-semibold tabular-nums text-[#555]">
                      {tx.stamps_after}
                    </span>
                    {tx.employee_name && (
                      <>
                        <span className="text-[#D8D5CE]">·</span>
                        <span>by {tx.employee_name}</span>
                      </>
                    )}
                  </div>

                  {/* Void reason */}
                  {voidReason && (
                    <p className="text-[10px] text-[#8A8A8A] mt-1 italic line-clamp-1">
                      {voidReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
