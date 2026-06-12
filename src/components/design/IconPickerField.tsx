"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CaretDown } from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  IconLibrary,
  StampIconSvg,
  useIconDisplayName,
  type StampIconType,
} from "@/components/design/StampIconPicker";

interface IconPickerFieldProps {
  readonly value: StampIconType;
  readonly onChange: (icon: StampIconType) => void;
  readonly accentColor?: string;
  readonly iconColor?: string;
  /** Ids pinned in a "Suggested" section above the categories. */
  readonly suggested?: StampIconType[];
}

/**
 * Compact icon field: a trigger row showing the current selection (rendered
 * exactly as it appears on the card) that opens the full searchable icon
 * library in a popover — the emoji-picker pattern. Keeps the Stamps form
 * light while every icon stays one click away, so the same full library can
 * back both the stamp and the reward fields without overwhelming the form.
 */
export function IconPickerField({
  value,
  onChange,
  accentColor = "#f97316",
  iconColor = "#ffffff",
  suggested,
}: IconPickerFieldProps) {
  const t = useTranslations("designEditor.iconPicker");
  const displayName = useIconDisplayName();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted/40 transition-colors"
        >
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <StampIconSvg icon={value} className="w-4 h-4" color={iconColor} />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-sm font-medium truncate">
              {displayName(value)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t("change")}
            </span>
          </span>
          <CaretDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <IconLibrary
          value={value}
          onChange={(icon) => {
            onChange(icon);
            setOpen(false);
          }}
          accentColor={accentColor}
          iconColor={iconColor}
          suggested={suggested}
        />
      </PopoverContent>
    </Popover>
  );
}
