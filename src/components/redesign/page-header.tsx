"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  /** Structured action buttons — rendered with consistent styling */
  actions?: PageHeaderAction[];
  /** Fully custom action slot (legacy) — use `actions` for standardized buttons */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, action, className }: PageHeaderProps) {
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
      {(actions?.length || action) && (
        <div className="shrink-0 flex items-center gap-2">
          {actions?.map((a, i) => {
            const isPrimary = a.variant !== "secondary";
            return (
              <Button
                key={i}
                variant={isPrimary ? "gradient" : "outline"}
                className={cn("rounded-full", !isPrimary && "text-[var(--foreground)]")}
                onClick={a.onClick}
                disabled={a.disabled}
                {...(a.href ? { asChild: true } : {})}
              >
                {a.href ? (
                  <a href={a.href}>
                    {a.icon}
                    {a.label}
                  </a>
                ) : (
                  <>
                    {a.icon}
                    {a.label}
                  </>
                )}
              </Button>
            );
          })}
          {action}
        </div>
      )}
    </div>
  );
}
