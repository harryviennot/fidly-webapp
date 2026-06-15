"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { useChangelog } from "@/hooks/use-changelog";
import type { ChangelogRelease } from "@/api/changelog";
import { ChangelogModal } from "./changelog-modal";

interface ChangelogModalContextValue {
  /** Open the modal (and mark the latest release seen if it was unread). */
  open: () => void;
  close: () => void;
  isOpen: boolean;
  /** Latest published release, for the "review what you dismissed" entry. */
  latestRelease: ChangelogRelease | null;
  unreadCount: number;
  isLoading: boolean;
}

const ChangelogModalContext = createContext<ChangelogModalContextValue | null>(
  null
);

/**
 * Owns the single "What's new" modal so it can be opened from two places — the
 * conditional sidebar trigger AND the Support popup (the permanent re-entry
 * point). Mounted once inside the dashboard layout. Mark-seen lives here, so
 * opening from Support after the update is already seen is a harmless no-op.
 */
export function ChangelogModalProvider({ children }: { children: ReactNode }) {
  const { releases, areas, unreadCount, markSeen, isLoading } = useChangelog();
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    setIsOpen(true);
    if (unreadCount > 0) markSeen();
  };

  return (
    <ChangelogModalContext.Provider
      value={{
        open,
        close: () => setIsOpen(false),
        isOpen,
        latestRelease: releases[0] ?? null,
        unreadCount,
        isLoading,
      }}
    >
      {children}
      <ChangelogModal
        open={isOpen}
        onOpenChange={setIsOpen}
        releases={releases}
        areas={areas}
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
