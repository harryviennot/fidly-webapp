"use client";

import * as React from "react";
import { XIcon } from "@phosphor-icons/react";
import { Drawer as VaulDrawer } from "vaul";

import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Variant = "mobile" | "desktop";

const VariantContext = React.createContext<Variant>("desktop");

const useVariant = () => React.useContext(VariantContext);

interface ResponsiveSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  ariaTitle: string;
  ariaDescription?: string;
  desktopMaxWidth?: string;
  /** Mobile drawer height. Defaults to 94vh. */
  mobileHeight?: string;
}

export function ResponsiveSidePanel({
  open,
  onOpenChange,
  children,
  ariaTitle,
  ariaDescription,
  desktopMaxWidth = "520px",
  mobileHeight = "94vh",
}: ResponsiveSidePanelProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <VariantContext.Provider value="mobile">
        <VaulDrawer.Root
          open={open}
          onOpenChange={onOpenChange}
          dismissible
          handleOnly
        >
          <VaulDrawer.Portal>
            <VaulDrawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
            <VaulDrawer.Content
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden rounded-t-2xl bg-[var(--background)] outline-hidden"
              style={{ height: mobileHeight }}
            >
              <VaulDrawer.Title className="sr-only">{ariaTitle}</VaulDrawer.Title>
              {ariaDescription && (
                <VaulDrawer.Description className="sr-only">
                  {ariaDescription}
                </VaulDrawer.Description>
              )}
              {children}
            </VaulDrawer.Content>
          </VaulDrawer.Portal>
        </VaulDrawer.Root>
      </VariantContext.Provider>
    );
  }

  return (
    <VariantContext.Provider value="desktop">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex flex-col gap-0 p-0"
          style={{ maxWidth: desktopMaxWidth, width: "100%" }}
        >
          <SheetTitle className="sr-only">{ariaTitle}</SheetTitle>
          {ariaDescription && (
            <SheetDescription className="sr-only">
              {ariaDescription}
            </SheetDescription>
          )}
          {children}
        </SheetContent>
      </Sheet>
    </VariantContext.Provider>
  );
}

interface ResponsiveSidePanelHeaderProps {
  children: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
}

export function ResponsiveSidePanelHeader({
  children,
  rightActions,
  className,
}: ResponsiveSidePanelHeaderProps) {
  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--background)]",
        "px-4 py-3.5 md:px-5 md:py-4",
        className
      )}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {rightActions && <div className="flex items-center gap-2 shrink-0">{rightActions}</div>}
      <ResponsiveSidePanelClose />
    </div>
  );
}

function ResponsiveSidePanelClose() {
  const variant = useVariant();
  const button = (
    <button
      type="button"
      aria-label="Close"
      className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-[var(--muted-foreground)] hover:text-[#1A1A1A] hover:bg-[var(--muted)] transition-colors"
    >
      <XIcon className="h-4 w-4" weight="bold" />
    </button>
  );

  if (variant === "mobile") {
    return <VaulDrawer.Close asChild>{button}</VaulDrawer.Close>;
  }
  return <SheetClose asChild>{button}</SheetClose>;
}

interface ResponsiveSidePanelBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveSidePanelBody({
  children,
  className,
}: ResponsiveSidePanelBodyProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto overscroll-contain", className)}>
      {children}
    </div>
  );
}
