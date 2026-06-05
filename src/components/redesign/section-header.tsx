import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SectionHeaderAction {
  label: string;
  /** Navigate to a route (renders a `<Link>`). Provide either `href` or `onClick`. */
  href?: string;
  /** Handle a click without navigating (renders a `<button>`). */
  onClick?: () => void;
}

interface SectionHeaderProps {
  title: string;
  /** Optional leading icon, e.g. `<Trophy weight="fill" className="h-4 w-4 text-[var(--accent)]" />`. */
  icon?: ReactNode;
  /** Optional element shown right after the title, e.g. a "New" badge. */
  badge?: ReactNode;
  /** Optional "see all" action on the right. Always renders with a trailing arrow. */
  action?: SectionHeaderAction;
  className?: string;
}

/**
 * Shared header row for dashboard widgets: a title on the left (with an optional
 * leading icon and trailing badge) and an optional "see all" action on the right.
 *
 * Mutualizes what used to be hand-rolled per widget, so the title weight/size and
 * the action link — always a 12px semibold accent link with a trailing arrow —
 * stay identical everywhere. The title truncates and the action keeps its width,
 * so a long title never pushes the action out of the row.
 */
export function SectionHeader({ title, icon, badge, action, className }: SectionHeaderProps) {
  const actionClass =
    "flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline";
  const actionInner = action && (
    <>
      {action.label}
      <ArrowRight className="h-3.5 w-3.5" weight="bold" />
    </>
  );

  return (
    <div className={cn("mb-3 flex items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        {icon}
        <h3 className="font-body truncate text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
        {badge}
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className={actionClass}>
            {actionInner}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={actionClass}>
            {actionInner}
          </button>
        ))}
    </div>
  );
}
