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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
  /** Field name shown as the mobile sheet title (e.g. "Stamp icon"). */
  readonly label?: string;
}

/**
 * Compact icon field: a trigger row showing the current selection (rendered
 * exactly as it appears on the card) that opens the full searchable icon
 * library — the emoji-picker pattern. Keeps the Stamps form light while
 * every icon stays one tap away, so the same full library can back both the
 * stamp and the reward fields without overwhelming the form.
 *
 * Device-adaptive like the SearchBar menus: a collision-aware popover on
 * desktop, a bottom sheet with a taller list on phones.
 */
export function IconPickerField({
  value,
  onChange,
  accentColor = "#f97316",
  iconColor = "#ffffff",
  suggested,
  label,
}: IconPickerFieldProps) {
  const t = useTranslations("designEditor.iconPicker");
  const displayName = useIconDisplayName();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleChange = (icon: StampIconType) => {
    onChange(icon);
    setOpen(false);
  };

  const trigger = (
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
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] p-0 gap-0"
          // Radix focuses the first focusable on open — the search input —
          // which pops the keyboard and covers half the sheet. Let the user
          // reach for search deliberately instead.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-[15px] font-bold text-left">
              {label ?? t("title")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <IconLibrary
              value={value}
              onChange={handleChange}
              accentColor={accentColor}
              iconColor={iconColor}
              suggested={suggested}
              listClassName="max-h-[55dvh]"
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <IconLibrary
          value={value}
          onChange={handleChange}
          accentColor={accentColor}
          iconColor={iconColor}
          suggested={suggested}
        />
      </PopoverContent>
    </Popover>
  );
}
