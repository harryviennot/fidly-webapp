"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Question,
  ChatCircleDots,
  DeviceMobile,
  ArrowSquareOut,
} from "@phosphor-icons/react";

import {
  AdaptiveMenu,
  MenuRow,
  MenuSeparator,
  useAdaptiveMenuClose,
} from "@/components/reusables/search-bar/adaptive-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { resolveLocale, type ChangelogRelease } from "@/api/changelog";
import { useChangelogModal } from "./changelog-modal-provider";
import { showcaseChangelogUrl } from "./changelog-shared";
import { ContactDialog } from "./contact-dialog";
import { DownloadAppDialog } from "./download-app-dialog";

/** A dialog/modal opened from a menu must wait for the menu (a bottom sheet on
 *  mobile) to finish closing — otherwise Radix's overlapping scroll-lock leaves
 *  the new layer invisible. Defer past the sheet's close animation. */
const closeDelay = (isMobile: boolean) => (isMobile ? 320 : 10);

/** The "What's new" mini timeline: the two latest releases (open the modal) plus
 *  a "View changelog" link, connected by a Linear-style spine — a mini echo of
 *  the showcase changelog. One block (continuous line, no per-item gaps). */
function WhatsNewTimeline({
  releases,
  locale,
  delay,
}: {
  releases: ChangelogRelease[];
  locale: string;
  delay: number;
}) {
  const close = useAdaptiveMenuClose();
  const t = useTranslations();
  const { openRelease } = useChangelogModal();

  const items: {
    key: string;
    label: string;
    external: boolean;
    run: () => void;
  }[] = [
    ...releases.slice(0, 2).map((r) => ({
      key: r.id,
      label: resolveLocale(r.title_fr, r.title_en, r.title_es, locale),
      external: false,
      run: () => openRelease(r),
    })),
    {
      key: "__changelog__",
      label: t("changelog.viewAll"),
      external: true,
      run: () =>
        window.open(showcaseChangelogUrl(locale), "_blank", "noopener,noreferrer"),
    },
  ];

  return (
    <div className="px-1 pb-1">
      {items.map((item, i) => {
        const isFirst = i === 0;
        const isLast = i === items.length - 1;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.external) {
                item.run(); // synchronous — avoid the popup blocker
                close();
              } else {
                close();
                window.setTimeout(item.run, delay);
              }
            }}
            className="group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-1.5 pr-2 text-left transition-colors hover:bg-[var(--accent)]/10"
          >
            <span
              aria-hidden
              className="relative flex w-3.5 shrink-0 items-center justify-center self-stretch"
            >
              {/* One unbroken spine: every row paints the FULL-height line, so
                  consecutive segments meet with no gap. The dot sits on top
                  (no ring) so the line reads as continuous through each node. */}
              <span
                className={cn(
                  "absolute left-1/2 w-px -translate-x-1/2 bg-[var(--border-dark)]",
                  isFirst ? "top-1/2 bottom-0" : isLast ? "top-0 bottom-1/2" : "inset-y-0"
                )}
              />
              <span className="relative z-10 h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            <span className="flex-1 truncate text-sm text-[#5A5A5A] transition-colors group-hover:text-[var(--accent)]">
              {item.label}
            </span>
            {item.external && (
              <ArrowSquareOut className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Linear-style help menu — a compact "?" icon opening a device-adaptive menu
 * (the same flat dropdown / bottom-sheet the SearchBar filters use): Contact us,
 * Download apps, and a "What's new" mini timeline. An unseen dot on the icon
 * clears when the menu opens.
 */
export function HelpMenu() {
  const t = useTranslations();
  const locale = useLocale();
  const isMobile = useIsMobile();
  const { releases, unreadCount, markSeen } = useChangelogModal();
  const [contactOpen, setContactOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const delay = closeDelay(isMobile);

  return (
    <>
      <AdaptiveMenu
        label={t("support.title")}
        align="start"
        contentClassName="min-w-[248px]"
        onOpenChange={(open) => {
          if (open && unreadCount > 0) markSeen();
        }}
        trigger={
          <button
            type="button"
            aria-label={t("support.title")}
            className="relative flex h-8 w-8 items-center justify-center rounded-full pointer-finger-hover border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] data-[state=open]:bg-[var(--muted)] data-[state=open]:text-[var(--foreground)]"
          >
            <Question className="h-[18px] w-[18px]" weight="bold" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-2 ring-[var(--card)]" />
            )}
          </button>
        }
      >
        <MenuRow onSelect={() => window.setTimeout(() => setContactOpen(true), delay)}>
          <ChatCircleDots
            className="h-[18px] w-[18px] text-[var(--muted-foreground)]"
            weight="bold"
          />
          <span className="flex-1 text-sm text-[#5A5A5A]">
            {t("support.contactUs")}
          </span>
        </MenuRow>
        <MenuRow
          onSelect={() =>
            window.setTimeout(() => setDownloadOpen(true), delay)
          }
        >
          <DeviceMobile
            className="h-[18px] w-[18px] text-[var(--muted-foreground)]"
            weight="bold"
          />
          <span className="flex-1 text-sm text-[#5A5A5A]">
            {t("support.downloadApps")}
          </span>
        </MenuRow>

        {releases.length > 0 && (
          <>
            <MenuSeparator />
            <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t("support.whatsNew")}
            </div>
            <WhatsNewTimeline releases={releases} locale={locale} delay={delay} />
          </>
        )}
      </AdaptiveMenu>

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
      <DownloadAppDialog open={downloadOpen} onOpenChange={setDownloadOpen} />
    </>
  );
}
