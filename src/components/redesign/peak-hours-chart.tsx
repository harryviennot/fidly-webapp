"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

const PLACEHOLDER_DATA = [
  { h: "8", v: 12 }, { h: "9", v: 28 }, { h: "10", v: 35 },
  { h: "11", v: 42 }, { h: "12", v: 67 }, { h: "1", v: 55 },
  { h: "2", v: 38 }, { h: "3", v: 30 }, { h: "4", v: 22 },
  { h: "5", v: 18 }, { h: "6", v: 14 }, { h: "7", v: 8 },
];


interface PeakHoursChartProps {
  data?: { h: string; v: number }[];
  className?: string;
  delay?: number;
}

export function PeakHoursChart({
  data = PLACEHOLDER_DATA,
  className,
  delay = 0,
}: PeakHoursChartProps) {
  const t = useTranslations("dashboard");

  // Read accent palette from CSS vars (resolved at render time after applyTheme)
  const style = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const accent = style?.getPropertyValue("--accent").trim() || "#f97316";
  const accent300 = style?.getPropertyValue("--accent-300").trim() || "#fdba74";
  const accent100 = style?.getPropertyValue("--accent-100").trim() || "#ffedd5";

  function getBarColor(value: number) {
    if (value > 55) return accent;
    if (value > 35) return accent300;
    return accent100;
  }

  // Find peak hour
  const peak = data.reduce((max, d) => (d.v > max.v ? d : max), data[0]);

  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-[18px] animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
        {t("peakHours")}
      </h3>
      <p className="text-[11px] text-[#A5A5A5] mb-3">
        {t("peakHoursSubtitle")}
      </p>

      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="h"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "#AAA" }}
            interval={1}
          />
          <Bar dataKey="v" radius={[3, 3, 0, 0]} animationDuration={800} animationBegin={600}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.v)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-[#888] mt-2">
        {t("busiest")}{" "}
        <span className="text-[var(--accent)] font-semibold">
          {peak.h} {parseInt(peak.h) < 12 ? "AM" : "PM"}
        </span>
      </p>
    </div>
  );
}
