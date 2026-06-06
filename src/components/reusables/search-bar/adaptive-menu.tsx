"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Device-adaptive menu shell used by FilterDropdown + SortControl.
 *  - Phones (<768px): a bottom `Sheet` — full-width, scrollable, big tap targets.
 *  - Tablet / desktop: the restyled flat `DropdownMenu`, collision-aware.
 * Rows render the right element for the active surface via context, so callers
 * compose with the same `<MenuRow>` / `<MenuSeparator>` regardless of device.
 */

interface AdaptiveMenuCtx {
  asSheet: boolean;
  close: () => void;
}

const AdaptiveMenuContext = React.createContext<AdaptiveMenuCtx>({
  asSheet: false,
  close: () => {},
});

export interface AdaptiveMenuProps {
  /** The trigger element — must forward ref + spread props (use `asChild`). */
  trigger: React.ReactNode;
  /** Title shown on the mobile sheet header. */
  label: string;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  contentClassName?: string;
}

export function AdaptiveMenu({
  trigger,
  label,
  children,
  align = "start",
  contentClassName,
}: AdaptiveMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  if (isMobile) {
    return (
      <AdaptiveMenuContext.Provider value={{ asSheet: true, close }}>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl border-t border-[var(--border)] bg-[var(--card)] p-0 max-h-[80vh] gap-0"
          >
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-[15px] font-bold text-[#1A1A1A] text-left">
                {label}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </SheetContent>
        </Sheet>
      </AdaptiveMenuContext.Provider>
    );
  }

  return (
    <AdaptiveMenuContext.Provider value={{ asSheet: false, close }}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          collisionPadding={12}
          className={cn("min-w-[220px]", contentClassName)}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </AdaptiveMenuContext.Provider>
  );
}

export interface MenuRowProps {
  selected?: boolean;
  /** Render as a small, muted row (the "Clear" footer). */
  muted?: boolean;
  /** Keep the menu open after selecting (multi-select). */
  keepOpen?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

export function MenuRow({
  selected,
  muted,
  keepOpen,
  onSelect,
  children,
}: MenuRowProps) {
  const { asSheet, close } = React.useContext(AdaptiveMenuContext);

  if (asSheet) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect();
          if (!keepOpen) close();
        }}
        className={cn(
          "flex items-center gap-2.5 w-full rounded-lg px-2.5 text-left transition-colors",
          "min-h-[44px] text-[14px] text-[#1A1A1A] active:bg-[var(--accent)]/10",
          selected && "text-[var(--accent)] font-medium",
          muted && "min-h-[40px] text-[12px] text-[var(--muted-foreground)] font-normal"
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        if (keepOpen) e.preventDefault();
        onSelect();
      }}
      className={cn(
        "gap-2.5",
        selected && "text-[var(--accent)]",
        muted && "text-[11px] text-[var(--muted-foreground)]"
      )}
    >
      {children}
    </DropdownMenuItem>
  );
}

export function MenuSeparator() {
  const { asSheet } = React.useContext(AdaptiveMenuContext);
  if (asSheet) return <div className="my-1 mx-2.5 h-px bg-[var(--border)]" />;
  return <DropdownMenuSeparator />;
}
