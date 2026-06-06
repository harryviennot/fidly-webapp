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
  // Red-tinted (not a neutral/white pill) so it reads as a destructive button
  // at a glance, even to someone who has never used the app.
  void: { color: "#C75050", bg: "#FDE8E4", border: "#F2CEC8", Icon: Prohibit },
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
    // Flat and tinted — the app's own button language (no gradient, no glow).
    // The primary (add / redeem) takes the room; the red-tinted "void" is
    // plainly a destructive button, with its own label, so a first-time user
    // knows exactly what it does.
    const isVoid = variant === "void";
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        title={label}
        className={cn(
          "inline-flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-semibold cursor-pointer select-none",
          "transition-all duration-150 hover:brightness-[0.97] active:brightness-95 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/5",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:brightness-100",
          isVoid ? "shrink-0 px-3.5" : "flex-1 px-3",
          className
        )}
        style={{ background: bg, color, border: `1px solid ${border}` }}
      >
        <span className="flex">
          {loading ? (
            <CircleNotch className="w-[18px] h-[18px] animate-spin" weight="bold" />
          ) : (
            <Icon className="w-[18px] h-[18px]" weight="fill" />
          )}
        </span>
        <span className="whitespace-nowrap">{label}</span>
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
