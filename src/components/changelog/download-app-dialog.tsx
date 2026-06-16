"use client";

import { useTranslations } from "next-intl";
import { AppleLogo, GooglePlayLogo, CaretRight } from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const APP_STORE_URL = "https://apps.apple.com/app/id6761758382";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.hryvnt.stampeo";

/**
 * "Get the scanner app" — opened from the help menu's Download apps row. Mirrors
 * the ContactDialog: a centered Dialog with two store options (App Store /
 * Google Play) linking straight to the listings, instead of bouncing through
 * the showcase feature page.
 */
export function DownloadAppDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-5">
        <DialogHeader>
          <DialogTitle>{t("support.downloadTitle")}</DialogTitle>
          <DialogDescription>
            {t("support.downloadDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-light)]/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--foreground)]/[0.06] text-[var(--foreground)]">
              <AppleLogo className="h-5 w-5" weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--foreground)]">
                App Store
              </span>
              <span className="block truncate text-[13px] text-[var(--muted-foreground)]">
                iPhone, iPad
              </span>
            </span>
            <CaretRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </a>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[#34A853]/50 hover:bg-[#34A853]/[0.06]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34A853]/10 text-[#1E8E3E]">
              <GooglePlayLogo className="h-5 w-5" weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--foreground)]">
                Google Play
              </span>
              <span className="block truncate text-[13px] text-[var(--muted-foreground)]">
                Android
              </span>
            </span>
            <CaretRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
