"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { useChangelog } from "@/hooks/use-changelog";
import type { ChangelogRelease } from "@/api/changelog";
import { ChangelogModal } from "./changelog-modal";

interface ChangelogModalContextValue {
  /** Open the "What's new" modal on a specific release. */
  openRelease: (release: ChangelogRelease) => void;
  /** Recent published releases (newest first) — for the help menu's list. */
  releases: ChangelogRelease[];
  unreadCount: number;
  isLoading: boolean;
  /** Drop the unread count to 0 (called when the help menu is opened). */
  markSeen: () => void;
}

const ChangelogModalContext = createContext<ChangelogModalContextValue | null>(
  null
);

/**
 * Owns the single "What's new" modal so any release can be opened from the help
 * menu's What's-new list. `open` is tracked separately from the selected
 * release, so the release stays mounted through the modal's close animation.
 */
export function ChangelogModalProvider({ children }: { children: ReactNode }) {
  const { releases, areas, unreadCount, markSeen, isLoading } = useChangelog();
  const [selected, setSelected] = useState<ChangelogRelease | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <ChangelogModalContext.Provider
      value={{
        openRelease: (r) => {
          setSelected(r);
          setOpen(true);
        },
        releases,
        unreadCount,
        isLoading,
        markSeen,
      }}
    >
      {children}
      <ChangelogModal
        open={open}
        release={selected}
        areas={areas}
        onOpenChange={setOpen}
      />
    </ChangelogModalContext.Provider>
  );
}

export function useChangelogModal(): ChangelogModalContextValue {
  const ctx = useContext(ChangelogModalContext);
  if (!ctx) {
    throw new Error(
      "useChangelogModal must be used within a ChangelogModalProvider"
    );
  }
  return ctx;
}
