"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QrCode, Megaphone, UserPlus } from "@phosphor-icons/react";

const actions = [
  {
    labelKey: "dashboard.qrCode",
    descKey: "dashboard.qrCodeDesc",
    icon: QrCode,
    href: "/program/settings",
  },
  {
    labelKey: "dashboard.sendCampaign",
    descKey: "dashboard.sendCampaignDesc",
    icon: Megaphone,
    href: "/program/notifications",
  },
  {
    labelKey: "dashboard.inviteEmployee",
    descKey: "dashboard.inviteEmployeeDesc",
    icon: UserPlus,
    href: "/team",
  },
];

interface QuickActionsProps {
  className?: string;
  delay?: number;
}

export function QuickActions({ className, delay = 0 }: QuickActionsProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-[13px] font-semibold text-[var(--foreground)] mb-3">
        {t("dashboard.quickActions")}
      </h3>

      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.labelKey}
              href={action.href}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--cream)] transition-all duration-150"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Icon className="w-[18px] h-[18px]" weight="bold" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#333]">
                  {t(action.labelKey)}
                </div>
                <div className="text-[10px] text-[#A5A5A5]">
                  {t(action.descKey)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
