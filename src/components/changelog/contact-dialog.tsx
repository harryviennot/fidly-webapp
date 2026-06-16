"use client";

import { useTranslations } from "next-intl";
import { EnvelopeSimple, WhatsappLogo, CaretRight } from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBusiness } from "@/contexts/business-context";

const SUPPORT_EMAIL = "support@stampeo.app";
const WHATSAPP_URL = "https://wa.me/33649370470";

/**
 * "How would you like to reach us?" — opened from the help menu's Contact us
 * row. Email prefills the subject with the business slug so support can route
 * it; WhatsApp opens a chat. Centered Dialog, on-brand.
 */
export function ContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const { currentBusiness } = useBusiness();
  const slug = currentBusiness?.url_slug ?? "";
  const subject = t("support.contactEmailSubject", { slug });
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-5">
        <DialogHeader>
          <DialogTitle>{t("support.contactTitle")}</DialogTitle>
          <DialogDescription>
            {t("support.contactDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5">
          <a
            href={mailto}
            onClick={() => onOpenChange(false)}
            className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-light)]/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <EnvelopeSimple className="h-5 w-5" weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--foreground)]">
                {t("support.contactEmail")}
              </span>
              <span className="block truncate text-[13px] text-[var(--muted-foreground)]">
                {SUPPORT_EMAIL}
              </span>
            </span>
            <CaretRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.06]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#1FA855]">
              <WhatsappLogo className="h-5 w-5" weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--foreground)]">
                {t("support.whatsapp")}
              </span>
              <span className="block truncate text-[13px] text-[var(--muted-foreground)]">
                WhatsApp
              </span>
            </span>
            <CaretRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
