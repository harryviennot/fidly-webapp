"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  const hasActions = !!(actions?.length || action);

  const titleBlock = (
    <div className="min-w-0 md:flex-1 md:order-1">
      <h1 className="text-[24px] md:text-[28px] font-bold text-[#1A1A1A] tracking-tight leading-tight" style={{ letterSpacing: -0.5 }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-md text-[#A0A0A0] mt-0.5">{subtitle}</p>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col md:flex-row md:items-start md:justify-between md:gap-4", hasActions ? "gap-3" : "gap-1", className)}>
      {/* md:contents collapses this wrapper on desktop so trigger/actions flow into the parent flex with the title */}
      <div className="flex items-center justify-between gap-2 md:contents">
        <SidebarTrigger className="md:hidden -ml-2! shrink-0 size-9! hover:bg-transparent hover:text-current dark:hover:bg-transparent [&_svg]:size-5! [&_svg]:stroke-[2]" />
        {hasActions && (
          <div className="shrink-0 flex items-center gap-2 md:order-2">
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
      {titleBlock}
    </div>
  );
}
