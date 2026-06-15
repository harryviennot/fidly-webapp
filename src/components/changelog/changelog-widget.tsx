"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Gift,
  ArrowSquareOut,
  Sparkle,
  ArrowUp,
  Bug,
} from "@phosphor-icons/react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChangelog } from "@/hooks/use-changelog";
import { areaChipClass } from "@/lib/changelog-areas";
import {
  CATEGORY_ORDER,
  resolveLocale,
  type ChangelogArea,
  type ChangelogCategory,
  type ChangelogItem,
  type ChangelogRelease,
} from "@/api/changelog";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<ChangelogCategory, typeof Sparkle> = {
  feature: Sparkle,
  improvement: ArrowUp,
  fix: Bug,
};

/** Strip the most common Markdown markers for a one-line excerpt. */
function plainExcerpt(md: string): string {
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function showcaseChangelogUrl(locale: string): string {
  const base = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
  return `${base}${locale === "en" ? "/en" : ""}/changelog`;
}

export function ChangelogWidget() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const t = useTranslations("changelog");
  const locale = useLocale();
  const { releases, areas, unreadCount, markSeen, isLoading } = useChangelog();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) markSeen();
  };

  const trigger = (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--muted)]"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <Gift className="h-4 w-4" weight="fill" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>
      <span className="flex-1 truncate text-sm font-medium text-[var(--foreground)]">
        {t("trigger")}
      </span>
    </button>
  );

  const panel = (
    <ChangelogPanel
      releases={releases}
      areas={areas}
      locale={locale}
      t={t}
      isLoading={isLoading}
    />
  );

  const footerLink = (
    <a
      href={showcaseChangelogUrl(locale)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] p-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--muted)]"
    >
      {t("viewAll")}
      <ArrowSquareOut className="h-4 w-4" />
    </a>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] gap-0 overflow-hidden rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b border-[var(--border)]">
            <SheetTitle>{t("title")}</SheetTitle>
          </SheetHeader>
          <div className="max-h-[60vh] overflow-y-auto">{panel}</div>
          {footerLink}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="flex max-h-[70vh] w-[380px] flex-col overflow-hidden p-0"
      >
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {t("title")}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">{panel}</div>
        {footerLink}
      </PopoverContent>
    </Popover>
  );
}

function ChangelogPanel({
  releases,
  areas,
  locale,
  t,
  isLoading,
}: {
  releases: ChangelogRelease[];
  areas: ChangelogArea[];
  locale: string;
  t: ReturnType<typeof useTranslations>;
  isLoading: boolean;
}) {
  const areaBySlug = new Map(areas.map((a) => [a.slug, a]));

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-[var(--muted)]"
          />
        ))}
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-[var(--muted-foreground)]">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {releases.map((release) => (
        <ReleaseBlock
          key={release.id}
          release={release}
          areaBySlug={areaBySlug}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}

function ReleaseBlock({
  release,
  areaBySlug,
  locale,
  t,
}: {
  release: ChangelogRelease;
  areaBySlug: Map<string, ChangelogArea>;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const title = resolveLocale(release.title_fr, release.title_en, locale);
  const body = resolveLocale(release.body_fr, release.body_en, locale);
  const date = release.published_at
    ? new Date(release.published_at).toLocaleDateString(
        locale === "fr" ? "fr-FR" : "en-US",
        { month: "short", day: "numeric" }
      )
    : "";

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    list: release.changelog_items.filter((i) => i.category === cat),
  })).filter((g) => g.list.length > 0);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        {release.version && (
          <span className="inline-flex items-center rounded bg-[var(--accent)]/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)]">
            v{release.version}
          </span>
        )}
        <span className="text-xs text-[var(--muted-foreground)]">{date}</span>
      </div>

      {title && (
        <h4 className="mt-2 text-sm font-semibold text-[var(--foreground)]">
          {title}
        </h4>
      )}

      {release.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={release.image_url}
          alt={title || "Changelog"}
          loading="lazy"
          className="mt-2 h-28 w-full rounded-lg border border-[var(--border)] object-cover"
        />
      )}

      {body && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {plainExcerpt(body)}
        </p>
      )}

      <div className="mt-3 space-y-3">
        {byCategory.map(({ cat, list }) => {
          const Icon = CATEGORY_ICON[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" weight="bold" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {t(`categories.${cat}`)}
                </span>
              </div>
              <ul className="mt-1 space-y-1.5">
                {list.map((item) => (
                  <ItemLine
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
        })}
      </div>
    </div>
  );
}

function ItemLine({
  item,
  area,
  locale,
  forTeamLabel,
}: {
  item: ChangelogItem;
  area: ChangelogArea | undefined;
  locale: string;
  forTeamLabel: string;
}) {
  const title = resolveLocale(item.title_fr, item.title_en, locale);
  const teamOnly = item.affects?.length === 1 && item.affects[0] === "scanner";
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-[var(--foreground)]">
      {area && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            areaChipClass(area.color)
          )}
        >
          {locale === "en" ? area.label_en : area.label_fr}
        </span>
      )}
      <span className="min-w-0">{title}</span>
      {teamOnly && (
        <span className="text-[10px] font-medium text-[var(--accent)]">
          {forTeamLabel}
        </span>
      )}
    </li>
  );
}
