"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  WarningCircle,
  UserCircle,
  CreditCard,
  Bell,
  Megaphone,
  Steps,
  CalendarCheck,
  UsersThree,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePreviewDowngrade } from "@/hooks/useBilling";
import type { PreviewDowngradeResponse } from "@/api/billing";
import { Skeleton } from "@/components/ui/skeleton";

// ── Features not yet developed — hide from downgrade preview ────
const HIDDEN_FEATURES = new Set([
  "programs.events",
  "programs.multiple",
  "designs.scheduled",
  "locations.multiple",
  "locations.geofencing",
  "locations.analytics",
  "analytics.advanced",
]);

// ── Map feature keys to sidebar-matching icons ──────────────────
const FEATURE_ICON: Record<string, PhosphorIcon> = {
  "notifications.broadcast": Megaphone,
  "notifications.type": Bell,
  "notifications.scheduled": CalendarCheck,
  "notifications.segmentation": UsersThree,
  "team.employee_tracking": UserCircle,
};

interface DowngradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTier: string;
  currentTier: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function DowngradeConfirmDialog({
  open,
  onOpenChange,
  newTier,
  currentTier,
  onConfirm,
  isConfirming = false,
}: DowngradeConfirmDialogProps) {
  const t = useTranslations("billing");
  const preview = usePreviewDowngrade();

  useEffect(() => {
    if (open && newTier) {
      preview.mutate(newTier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, newTier]);

  const data: PreviewDowngradeResponse | undefined = preview.data ?? undefined;
  const ni = data?.notification_impact;

  // Filter features_lost to only show real, non-redundant features
  const visibleFeatures = (data?.features_lost ?? []).filter((key) => {
    if (HIDDEN_FEATURES.has(key)) return false;
    // Skip if notification_impact already conveys this concretely
    if (key === "notifications.type" && ni && ni.custom_templates_disabled > 0) return false;
    if (key === "notifications.broadcast" && ni && ni.scheduled_broadcasts_cancelled > 0) return false;
    return true;
  });

  // Build the list of impact items to render
  const dataItems: { icon: PhosphorIcon; message: string }[] = [];

  if (data?.impact["team.max_members"]) {
    dataItems.push({
      icon: UserCircle,
      message: t("downgradeImpactMembers", {
        affected: data.impact["team.max_members"].affected,
        current: data.impact["team.max_members"].current,
      }),
    });
  }

  if (data?.impact["designs.max_active"]) {
    dataItems.push({
      icon: CreditCard,
      message: t("downgradeImpactDesigns", {
        affected: data.impact["designs.max_active"].affected,
        current: data.impact["designs.max_active"].current,
      }),
    });
  }

  if (ni && ni.custom_templates_disabled > 0) {
    dataItems.push({
      icon: Bell,
      message: t("downgradeImpactCustomTemplates", {
        count: ni.custom_templates_disabled,
      }),
    });
  }

  if (ni && ni.milestones_disabled > 0) {
    const cap = ni.milestones_new_cap_per_program ?? 0;
    dataItems.push({
      icon: Steps,
      message: cap > 0
        ? t("downgradeImpactMilestonesCapped", { disabled: ni.milestones_disabled, cap })
        : t("downgradeImpactMilestonesAll", { disabled: ni.milestones_disabled }),
    });
  }

  if (ni && ni.scheduled_broadcasts_cancelled > 0) {
    dataItems.push({
      icon: Megaphone,
      message: t("downgradeImpactScheduledBroadcasts", {
        count: ni.scheduled_broadcasts_cancelled,
      }),
    });
  }

  // Feature losses — use specific human-readable messages
  const featureItems: { icon: PhosphorIcon; message: string }[] = visibleFeatures.map((key) => {
    const labelKey = `downgradeFeatureLost.${key.replace(/\./g, "_")}` as Parameters<typeof t>[0];
    return {
      icon: FEATURE_ICON[key] ?? Bell,
      message: t(labelKey),
    };
  });

  const hasImpact = dataItems.length > 0 || featureItems.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-12 h-12 rounded-full bg-[var(--warning-light)] flex items-center justify-center text-[var(--warning)] mb-3.5">
              <WarningCircle size={24} weight="fill" />
            </div>
            <AlertDialogTitle>
              {t("confirmDowngradeTitle", { to: newTier })}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t("confirmDowngradeDescription", { from: currentTier, to: newTier })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasImpact && (
          <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-light)]/50 p-4 space-y-3 text-sm">
            <p className="font-semibold text-[var(--foreground)]">
              {t("downgradeImpactTitle")}
            </p>

            {/* Data impacts — concrete changes with real numbers */}
            {dataItems.length > 0 && (
              <ul className="space-y-2.5 text-[var(--foreground)]">
                {dataItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 mt-0.5 shrink-0 flex items-center justify-center text-[var(--warning)]">
                        <Icon size={18} weight="bold" />
                      </div>
                      <span>{item.message}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Feature losses — capabilities being removed */}
            {featureItems.length > 0 && (
              <>
                {dataItems.length > 0 && (
                  <div className="border-t border-[var(--warning)]/15" />
                )}
                <ul className="space-y-2.5 text-[var(--muted-foreground)]">
                  {featureItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 mt-0.5 shrink-0 flex items-center justify-center">
                          <Icon size={18} />
                        </div>
                        <span>{item.message}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <p className="text-xs text-[var(--muted-foreground)] pt-1 border-t border-[var(--warning)]/20">
              {t("downgradeReassurance")}
            </p>
          </div>
        )}

        {preview.isPending && (
          <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-light)]/50 p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-3.5 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            </div>
            <Skeleton className="h-3 w-56 mt-1" />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t("downgradeKeep")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-[var(--warning)] text-white hover:opacity-90"
          >
            {isConfirming ? t("redirecting") : t("downgradeConfirm", { tier: newTier })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
