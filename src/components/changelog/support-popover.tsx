"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Question, WhatsappLogo, Sparkle, ArrowSquareOut } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveLocale } from "@/api/changelog";
import { useChangelogModal } from "./changelog-modal-provider";
import { formatReleaseDate, showcaseChangelogUrl } from "./changelog-shared";

const WHATSAPP_URL = "https://wa.me/33649370470";

/**
 * Sidebar "Support" entry. Opens a small popup (popover on desktop, bottom
 * sheet on mobile) with a WhatsApp contact button and — as the permanent
 * re-entry point for the changelog — a "latest update" row that reopens the
 * What's New modal (so users can revisit what they dismissed).
 */
export function SupportPopover() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const { open: openChangelog, latestRelease } = useChangelogModal();

  // Native button (forwardRef-safe) styled to match the other sidebar rows,
  // so it can anchor the Radix popover. Mirrors BusinessSwitcher's approach.
  const triggerButton = (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2 rounded-md p-2 text-left text-sm text-[var(--muted-foreground)] transition-all duration-200 hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] data-[state=open]:bg-[var(--muted)] data-[state=open]:text-[var(--foreground)]"
    >
      <Question className="h-[18px] w-[18px]" weight="bold" />
      <span className="text-[#5A5A5A]">{t("nav.support")}</span>
    </button>
  );

  const latestTitle = latestRelease
    ? resolveLocale(latestRelease.title_fr, latestRelease.title_en, locale)
    : "";

  const content = (
    <div className="flex flex-col">
      {latestRelease && (
        <>
          <button
            type="button"
            onClick={() => {
              openChangelog();
              setOpen(false);
            }}
            className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-[var(--muted)]"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <Sparkle className="h-3.5 w-3.5" weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t("support.latestUpdate")}
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-medium text-[var(--foreground)]">
                {latestTitle}
              </span>
              <span className="block text-[11px] text-[var(--muted-foreground)]">
                {formatReleaseDate(latestRelease.published_at, locale)}
              </span>
            </span>
          </button>
          <div className="h-px bg-[var(--border)]" />
        </>
      )}

      <div className="p-2.5">
        <Button
          asChild
          size="sm"
          className="w-full justify-center gap-1.5 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
        >
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <WhatsappLogo className="h-4 w-4" weight="fill" />
            {t("support.whatsapp")}
          </a>
        </Button>
        <a
          href={showcaseChangelogUrl(locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          {t("changelog.viewAll")}
          <ArrowSquareOut className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <SidebarMenuItem>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{triggerButton}</SheetTrigger>
          <SheetContent
            side="bottom"
            aria-describedby={undefined}
            className="gap-0 rounded-t-3xl border-[var(--border)] bg-[var(--card)] pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          >
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-[var(--border-dark)]" />
            <SheetTitle className="px-3 pt-1 text-sm font-semibold text-[var(--foreground)]">
              {t("support.title")}
            </SheetTitle>
            {content}
          </SheetContent>
        </Sheet>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-64 overflow-hidden rounded-xl p-0"
        >
          <div className="border-b border-[var(--border)] px-3 py-2.5">
            <p className="text-xs font-semibold text-[var(--foreground)]">
              {t("support.title")}
            </p>
          </div>
          {content}
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}
