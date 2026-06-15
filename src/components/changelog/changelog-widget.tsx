"use client";

import { Gift } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";

import { useChangelogModal } from "./changelog-modal-provider";

/**
 * Sidebar "What's new" entry. Surfaces ONLY when there's an unseen update;
 * clicking opens the centered modal (which marks it seen), after which this
 * self-hides. Reviewing past/dismissed updates happens via the Support popup.
 */
export function ChangelogWidget() {
  const t = useTranslations("changelog");
  const { open, unreadCount, isLoading } = useChangelogModal();

  if (isLoading || unreadCount === 0) return null;

  return (
    <button
      type="button"
      onClick={open}
      className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--muted)]"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
        <Gift className="h-4 w-4" weight="fill" />
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      </span>
      <span className="flex-1 truncate text-sm font-medium text-[var(--foreground)]">
        {t("trigger")}
      </span>
    </button>
  );
}
