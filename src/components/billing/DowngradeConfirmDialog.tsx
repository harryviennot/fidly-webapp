"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { WarningCircleIcon, UsersIcon, PaintBrushIcon, LightningIcon, BellSimpleIcon, CalendarCheckIcon, StepsIcon } from "@phosphor-icons/react";
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

  // Fetch preview when dialog opens
  useEffect(() => {
    if (open && newTier) {
      preview.mutate(newTier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, newTier]);

  const data: PreviewDowngradeResponse | undefined = preview.data ?? undefined;
  const ni = data?.notification_impact;
  const hasNotificationImpact = ni && (
    ni.custom_templates_disabled > 0 ||
    ni.milestones_disabled > 0 ||
    ni.scheduled_broadcasts_cancelled > 0
  );
  const hasImpact = data && (
    Object.keys(data.impact).length > 0 ||
    data.features_lost.length > 0 ||
    hasNotificationImpact
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-12 h-12 rounded-full bg-[var(--warning-light)] flex items-center justify-center text-[var(--warning)] mb-3.5">
              <WarningCircleIcon size={24} weight="fill" />
            </div>
            <AlertDialogTitle>
              {t("confirmDowngradeTitle", { to: newTier })}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t("confirmDowngradeDescription", { from: currentTier, to: newTier })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Impact details */}
        {hasImpact && (
          <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-light)]/50 p-4 space-y-3 text-sm">
            <p className="font-semibold text-[var(--foreground)]">{t("downgradeImpactTitle")}</p>
            <ul className="space-y-2 text-[var(--foreground)]">
              {data.impact["team.max_members"] && (
                <li className="flex items-start gap-2">
                  <UsersIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {t("downgradeImpactMembers", {
                      affected: data.impact["team.max_members"].affected,
                      current: data.impact["team.max_members"].current,
                    })}
                  </span>
                </li>
              )}
              {data.impact["designs.max_active"] && (
                <li className="flex items-start gap-2">
                  <PaintBrushIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {t("downgradeImpactDesigns", {
                      affected: data.impact["designs.max_active"].affected,
                      current: data.impact["designs.max_active"].current,
                    })}
                  </span>
                </li>
              )}
              {data.features_lost.map((key) => {
                // Backend sends dotted keys like "programs.events" but
                // next-intl treats dots as nesting, so we convert to
                // underscore keys: "programs_events".
                const labelKey = `featureLabels.${key.replace(/\./g, "_")}` as Parameters<typeof t>[0];
                return (
                  <li key={key} className="flex items-start gap-2">
                    <LightningIcon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      {t("downgradeImpactFeature", { feature: t(labelKey) })}
                    </span>
                  </li>
                );
              })}
              {ni && ni.custom_templates_disabled > 0 && (
                <li className="flex items-start gap-2">
                  <BellSimpleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {t("downgradeImpactCustomTemplates", {
                      count: ni.custom_templates_disabled,
                    })}
                  </span>
                </li>
              )}
              {ni && ni.milestones_disabled > 0 && (
                <li className="flex items-start gap-2">
                  <StepsIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {t("downgradeImpactMilestones", {
                      disabled: ni.milestones_disabled,
                      kept: ni.milestones_kept_active,
                      cap: ni.milestones_new_cap_per_program ?? 0,
                    })}
                  </span>
                </li>
              )}
              {ni && ni.scheduled_broadcasts_cancelled > 0 && (
                <li className="flex items-start gap-2">
                  <CalendarCheckIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {t("downgradeImpactScheduledBroadcasts", {
                      count: ni.scheduled_broadcasts_cancelled,
                    })}
                  </span>
                </li>
              )}
            </ul>
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
