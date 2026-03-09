"use client";

import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  delay?: number;
  className?: string;
}

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  subtitle,
  change,
  positive,
  icon,
  iconBg,
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-[16px_18px] animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#8A8A8A]">{title}</span>
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--accent)]"
          style={{ background: iconBg || "var(--accent-light)" }}
        >
          {icon}
        </div>
      </div>
      <div className="text-[28px] font-bold text-[#1A1A1A] tracking-tight leading-none mb-2" style={{ letterSpacing: -0.5 }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        {subtitle && (
          <span className="text-[#A5A5A5]">{subtitle}</span>
        )}
        {change && (
          <span
            className={cn(
              "font-semibold flex items-center gap-0.5",
              positive ? "text-[var(--accent)]" : "text-[#C75050]"
            )}
          >
            <span className="text-[8px]">{positive ? "▲" : "▼"}</span>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
