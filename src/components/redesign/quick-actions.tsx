"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QrCode, Megaphone, UserPlus, LockSimple } from "@phosphor-icons/react";
import { useBusiness } from "@/contexts/business-context";
import { useEntitlements } from "@/hooks/useEntitlements";

interface QuickActionsProps {
  className?: string;
  delay?: number;
}

export function QuickActions({ className, delay = 0 }: QuickActionsProps) {
  const t = useTranslations();
  const { currentRole } = useBusiness();
  const { hasFeature } = useEntitlements();

  // Team management is owner/admin only — staff never see the invite action.
  const canManageTeam = currentRole === "owner" || currentRole === "admin";
  // Broadcasts unlock on Growth. Keep the action visible but flag the lock so
  // it reads as an honest upsell rather than a surprise paywall on tap.
  const canBroadcast = hasFeature("notifications.broadcast");

  const actions = [
    {
      key: "qr",
      labelKey: "dashboard.qrCode",
      descKey: "dashboard.qrCodeDesc",
      icon: QrCode,
      href: "/program",
    },
    {
      key: "broadcast",
      labelKey: "dashboard.sendCampaign",
      descKey: "dashboard.sendCampaignDesc",
      icon: Megaphone,
      href: "/program/broadcasts",
      lockedTag: canBroadcast ? undefined : t("dashboard.growthPlan"),
    },
    ...(canManageTeam
      ? [
          {
            key: "team",
            labelKey: "dashboard.inviteEmployee",
            descKey: "dashboard.inviteEmployeeDesc",
            icon: UserPlus,
            href: "/team",
            lockedTag: undefined,
          },
        ]
      : []),
  ];

  return (
    <div
      className={cn(
        "bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="font-body text-[15px] font-semibold text-[var(--foreground)] mb-3">
        {t("dashboard.quickActions")}
      </h3>

      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.key}
              href={action.href}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--cream)] transition-all duration-150"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Icon className="w-[18px] h-[18px]" weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#333]">
                  {t(action.labelKey)}
                </div>
                <div className="text-[10px] text-[#A5A5A5]">
                  {t(action.descKey)}
                </div>
              </div>
              {action.lockedTag && (
                <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full">
                  <LockSimple className="w-3 h-3" weight="bold" />
                  {action.lockedTag}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
