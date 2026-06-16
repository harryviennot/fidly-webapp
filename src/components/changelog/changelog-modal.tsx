"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLocale, useTranslations } from "next-intl";
import { ArrowSquareOut, X } from "@phosphor-icons/react";

import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CATEGORY_ORDER,
  resolveLocale,
  type ChangelogArea,
  type ChangelogRelease,
} from "@/api/changelog";
import {
  CATEGORY_ICON,
  CategoryAccordion,
  ChangelogHero,
  ChangelogItemRow,
  ChangelogMarkdown,
  formatReleaseDate,
  showcaseChangelogUrl,
} from "./changelog-shared";

/**
 * The "What's new" modal — a centered Dialog on desktop, a bottom Sheet on
 * mobile. Renders the SELECTED release (opened from the help menu). `open` is
 * controlled separately from `release` by the provider, so `release` stays set
 * through the zoom-out close animation. Built on the Radix primitive so the
 * shared DialogContent (used elsewhere) is untouched.
 */
export function ChangelogModal({
  open,
  release,
  areas,
  onOpenChange,
}: {
  open: boolean;
  release: ChangelogRelease | null;
  areas: ChangelogArea[];
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const t = useTranslations("changelog");
  const locale = useLocale();

  if (!release) return null;

  const areaBySlug = new Map(areas.map((a) => [a.slug, a]));
  const title = resolveLocale(release.title_fr, release.title_en, locale);
  const body = resolveLocale(release.body_fr, release.body_en, locale);
  const heroSrc = resolveLocale(release.image_url_fr, release.image_url_en, locale);
  const date = formatReleaseDate(release.published_at, locale);

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    list: release.changelog_items.filter((i) => i.category === cat),
  })).filter((g) => g.list.length > 0);

  // Slim Linear-style header: date · "Changelog" link · close. A 3-column grid
  // (1fr / auto / 1fr) centers the link to the modal width regardless of how
  // wide the date or the close button are.
  const header = (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-[var(--border)] px-4 py-3">
      <time className="min-w-0 justify-self-start truncate text-sm font-medium text-[var(--muted-foreground)]">
        {date}
      </time>
      <a
        href={showcaseChangelogUrl(locale)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 justify-self-center whitespace-nowrap text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
      >
        {t("changelogLink")}
        <ArrowSquareOut className="h-3.5 w-3.5" />
      </a>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label={t("close")}
        className="-mr-1.5 justify-self-end rounded-full p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const scrollBody = (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <h2 className="text-lg font-semibold leading-snug text-[var(--foreground)]">
        {title}
      </h2>

      {heroSrc && (
        <ChangelogHero src={heroSrc} alt={title || "Changelog"} className="mt-3" />
      )}

      {body && (
        <ChangelogMarkdown
          source={body}
          className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]"
        />
      )}

      {byCategory.length > 0 && (
        <div className="mt-5 space-y-4">
          {byCategory.map(({ cat, list }) => {
            if (cat === "feature") {
              const Icon = CATEGORY_ICON[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 text-[var(--accent)]"
                      weight="fill"
                    />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {t(`categories.${cat}`)}
                    </h3>
                  </div>
                  <ul className="mt-1 divide-y divide-[var(--border)]/60">
                    {list.map((item) => (
                      <ChangelogItemRow
                        key={item.id}
                        item={item}
                        area={item.area ? areaBySlug.get(item.area) : undefined}
                        locale={locale}
                        forTeamLabel={t("forTeam")}
                      />
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <CategoryAccordion
                key={cat}
                cat={cat}
                label={t(`categories.${cat}`)}
                items={list}
                areaBySlug={areaBySlug}
                locale={locale}
                forTeamLabel={t("forTeam")}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-t-3xl border-[var(--border)] bg-[var(--card)] p-0"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-[var(--border-dark)]" />
          {header}
          {scrollBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          {header}
          {scrollBody}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
