"use client";

import { Stamp, Gift, Prohibit, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CustomerActionVariant = "stamp" | "redeem" | "void";
export type CustomerActionSize = "sm" | "lg";

/** Single source of truth for the three customer-action colorways, shared by
 *  the table row (sm) and the detail-sheet quick actions (lg). */
const ACTION_VARIANTS: Record<
  CustomerActionVariant,
  { color: string; bg: string; border: string; Icon: typeof Stamp }
> = {
  stamp: { color: "#4A7C59", bg: "#E8F5E4", border: "#C8E6C4", Icon: Stamp },
  redeem: { color: "#C4883D", bg: "#FFF3E0", border: "#F0DFC0", Icon: Gift },
  void: { color: "#C75050", bg: "#fff", border: "#DEDBD5", Icon: Prohibit },
};

interface CustomerActionButtonProps {
  variant: CustomerActionVariant;
  size: CustomerActionSize;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  /** sm only: keep the button icon-only even on wide screens (no label at xl). */
  iconOnly?: boolean;
  className?: string;
}

export function CustomerActionButton({
  variant,
  size,
  label,
  onClick,
  disabled,
  loading,
  iconOnly,
  className,
}: CustomerActionButtonProps) {
  const { color, bg, border, Icon } = ACTION_VARIANTS[variant];
  const isDisabled = disabled || loading;

  const base =
    "inline-flex items-center justify-center cursor-pointer transition-all duration-150 " +
    "hover:-translate-y-px hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-black/10 disabled:opacity-40 disabled:cursor-not-allowed " +
    "disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100";

  if (size === "lg") {
    // Strong hierarchy: the primary action (add / redeem) is a wide, premium
    // gradient pill with a soft glow and lift; "void" shrinks to a compact
    // icon button that only flushes red on intent — so the rare corrective
    // action is always within reach but never competes for attention.
    const isVoid = variant === "void";
    const gradient =
      variant === "redeem"
        ? "linear-gradient(135deg, #D89A4A, #BF7E33)"
        : "linear-gradient(135deg, #5A9568, #467453)";
    const glow =
      variant === "redeem"
        ? "hover:shadow-[0_10px_24px_-8px_rgba(196,136,61,0.55)]"
        : "hover:shadow-[0_10px_24px_-8px_rgba(74,124,89,0.55)]";

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold cursor-pointer select-none",
          "transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          isVoid
            ? "shrink-0 w-12 text-[#A8A29A] bg-[#F4F3F0] hover:bg-[#FBEEED] hover:text-[#C75050] focus-visible:ring-[#C75050]/30"
            : cn(
                "flex-1 text-white text-[13.5px] shadow-md hover:-translate-y-0.5",
                "disabled:hover:translate-y-0 focus-visible:ring-[var(--accent)]",
                glow
              ),
          className
        )}
        style={isVoid ? undefined : { background: gradient }}
      >
        <span className="flex">
          {loading ? (
            <CircleNotch className="w-5 h-5 animate-spin" weight="bold" />
          ) : (
            <Icon className="w-5 h-5" weight={isVoid ? "bold" : "fill"} />
          )}
        </span>
        {!isVoid && <span className="whitespace-nowrap">{label}</span>}
      </button>
    );
  }

  // sm — compact pill for the table row. Collapses to an icon-only square when
  // the table is tight and grows to icon + label once its @container has room.
  // Container-driven (not viewport breakpoints) so it adapts continuously to the
  // space actually available, regardless of the sidebar. `iconOnly` forces the
  // square form everywhere.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={label}
      className={cn(
        base,
        "gap-1 rounded-md text-[11px] font-medium w-7 h-7",
        !iconOnly && "@[56rem]:w-auto @[56rem]:h-auto @[56rem]:px-2.5 @[56rem]:py-1",
        className
      )}
      style={{ border: `1px solid ${border}`, background: bg, color }}
    >
      {loading ? (
        <CircleNotch className="w-3.5 h-3.5 shrink-0 animate-spin" weight="bold" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" weight="bold" />
      )}
      {!iconOnly && <span className="hidden @[56rem]:inline whitespace-nowrap">{label}</span>}
    </button>
  );
}
