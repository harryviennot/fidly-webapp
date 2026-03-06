"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-[24px] md:text-[28px] font-bold text-[#1A1A1A] tracking-tight leading-tight" style={{ letterSpacing: -0.5 }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-md text-[#A0A0A0] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
