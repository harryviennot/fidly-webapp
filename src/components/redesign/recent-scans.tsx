"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { TransactionResponse } from "@/types";
import { cn } from "@/lib/utils";
import { TYPE_CONFIG, isCardLifecycleType } from "@/lib/transaction-constants";
import { TransactionIcon } from "@/components/activity/transaction-icon";

// Dashboard widget uses accent CSS vars for stamp_added/reward_redeemed delta badges
const WIDGET_TYPE_CONFIG = {
  ...TYPE_CONFIG,
  stamp_added: { ...TYPE_CONFIG.stamp_added, deltaBg: "bg-[var(--accent-light)]", deltaText: "text-[var(--accent)]" },
  reward_redeemed: { ...TYPE_CONFIG.reward_redeemed, deltaBg: "bg-[var(--accent-light)]", deltaText: "text-[var(--accent)]" },
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
  loading?: boolean;
  stampIcon?: string;
  rewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

function SmoothHeight({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const prevHeight = useRef<number | "auto">("auto");
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const newH = entry.contentRect.height;
      if (prevHeight.current !== "auto" && prevHeight.current !== newH) {
        setTransitioning(true);
      }
      prevHeight.current = newH;
      setHeight(newH);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "transition-[height] duration-300 ease-out",
        transitioning ? "overflow-hidden" : "overflow-visible"
      )}
      style={{ height: height === "auto" ? "auto" : height }}
      onTransitionEnd={() => setTransitioning(false)}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

function RecentScansSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-2.5 relative">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-[var(--muted)] animate-pulse shrink-0" />
            {i < 5 && <div className="w-[1.5px] flex-1 bg-[#E8E5DE]" />}
          </div>
          <div className="pb-1.5 flex-1 min-w-0 -mt-0.5">
            <div className="rounded-xl bg-[#FAFAF8] border border-[#F0EFEB] px-3.5 py-3">
              <div className="h-3.5 w-32 bg-[var(--muted)] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[var(--muted)] rounded animate-pulse mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentScans({
  transactions,
  className,
  delay = 0,
  loading,
  stampIcon: designStampIcon,
  rewardIcon: designRewardIcon,
  stampFilledColor,
  iconColor,
}: RecentScansProps) {
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

      <SmoothHeight>
        {loading ? (
          <RecentScansSkeleton />
        ) : (
          <div>
            {transactions.map((tx, i) => {
            const config = WIDGET_TYPE_CONFIG[tx.type] || WIDGET_TYPE_CONFIG.stamp_added;
            const metadata = tx.metadata as Record<string, string> | null;
            const customerName = metadata?.customer_name || "Customer";
            const voidReason = metadata?.void_reason;
            const isLast = i === transactions.length - 1;
            const deltaText =
              tx.stamp_delta > 0 ? `+${tx.stamp_delta}` : String(tx.stamp_delta);

            return (
              <div
                key={tx.id}
                className="flex gap-2.5 relative animate-slide-up"
                style={{ animationDelay: `${delay + 100 + i * 70}ms` }}
              >
                {/* Timeline icon + connecting line */}
                <div className="flex flex-col items-center">
                  <TransactionIcon
                    type={tx.type}
                    config={config}
                    size="sm"
                    designStampIcon={designStampIcon}
                    designRewardIcon={designRewardIcon}
                    stampFilledColor={stampFilledColor}
                    iconColor={iconColor}
                  />
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
                        {!isCardLifecycleType(tx.type) && (
                          <span
                            className={cn(
                              "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-[5px] shrink-0 ml-1.5 inline-block",
                              config.deltaBg,
                              config.deltaText
                            )}
                          >
                            {deltaText}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#B0B0B0] tabular-nums shrink-0 mt-0.5">
                        {formatTime(tx.created_at)}
                      </span>
                    </div>

                    {/* Bottom row: stamp transition · employee */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8A8A8A]">
                      {isCardLifecycleType(tx.type) ? (
                        <span className="capitalize">
                          {metadata?.wallet_type === "google" ? "Google Wallet" : "Apple Wallet"}
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold text-[#555] tabular-nums">
                            {tx.stamps_before}
                          </span>
                          <span>→</span>
                          <span className="font-semibold tabular-nums text-[#555]">
                            {tx.stamps_after}
                          </span>
                        </>
                      )}
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
        )}
      </SmoothHeight>
    </div>
  );
}
