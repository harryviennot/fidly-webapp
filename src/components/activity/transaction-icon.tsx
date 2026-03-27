import { StampIconSvg, type StampIconType } from "@/components/design/StampIconPicker";
import { type TransactionTypeConfig, isCardLifecycleType } from "@/lib/transaction-constants";
import type { TransactionType } from "@/types";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4", phosphorSize: 14 },
  md: { container: "w-9 h-9", icon: "w-4.5 h-4.5", phosphorSize: 16 },
} as const;

interface TransactionIconProps {
  type: TransactionType;
  config: TransactionTypeConfig;
  size: "sm" | "md";
  designStampIcon?: string;
  designRewardIcon?: string;
  stampFilledColor?: string;
  iconColor?: string;
}

export function TransactionIcon({
  type,
  config,
  size,
  designStampIcon,
  designRewardIcon,
  stampFilledColor,
  iconColor,
}: TransactionIconProps) {
  const s = SIZE_CLASSES[size];
  const hasDesignIcons = !!designStampIcon;

  if (hasDesignIcons && (type === "stamp_added" || type === "bonus_stamp")) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-full shrink-0", s.container)}
        style={{ backgroundColor: stampFilledColor }}
      >
        <StampIconSvg
          icon={designStampIcon as StampIconType}
          className={s.icon}
          color={iconColor}
        />
      </div>
    );
  }

  if (hasDesignIcons && type === "reward_redeemed") {
    return (
      <div className={cn("flex items-center justify-center rounded-full shrink-0 bg-emerald-500/15", s.container)}>
        <StampIconSvg
          icon={(designRewardIcon as StampIconType) ?? "gift"}
          className={s.icon}
          color="#10b981"
        />
      </div>
    );
  }

  if (hasDesignIcons && type === "stamp_voided") {
    return (
      <div className={cn("flex items-center justify-center rounded-full shrink-0 bg-red-500/15", s.container)}>
        <StampIconSvg
          icon={designStampIcon as StampIconType}
          className={s.icon}
          color="#ef4444"
        />
      </div>
    );
  }

  const Icon = config.icon;
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full shrink-0",
        s.container,
        config.bgColor
      )}
    >
      <Icon size={s.phosphorSize} weight={isCardLifecycleType(type) ? "fill" : "duotone"} className={config.iconColor} />
    </div>
  );
}
