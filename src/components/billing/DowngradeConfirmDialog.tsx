"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { WarningCircleIcon, UsersIcon, PaintBrushIcon, LightningIcon } from "@phosphor-icons/react";
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

// Human-readable labels for feature keys
const FEATURE_LABELS: Record<string, string> = {
  "programs.events": "Promotional events",
  "programs.multiple": "Multiple programs",
  "notifications.broadcast": "Broadcast notifications",
  "notifications.scheduled": "Scheduled sends",
  "notifications.segmentation": "Customer segmentation",
  "notifications.type": "Custom notification text",
  "designs.scheduled": "Scheduled design changes",
  "locations.multiple": "Multiple locations",
  "locations.geofencing": "Geofencing",
  "locations.analytics": "Location analytics",
  "analytics.advanced": "Advanced analytics",
  "team.employee_tracking": "Employee scan tracking",
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

  // Fetch preview when dialog opens
  useEffect(() => {
    if (open && newTier) {
      preview.mutate(newTier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, newTier]);

  const data: PreviewDowngradeResponse | undefined = preview.data ?? undefined;
  const hasImpact = data && (Object.keys(data.impact).length > 0 || data.features_lost.length > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-3.5">
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
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3 text-sm">
            <p className="font-semibold text-amber-900">{t("downgradeImpactTitle")}</p>
            <ul className="space-y-2 text-amber-800">
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
              {data.features_lost.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <LightningIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {t("downgradeImpactFeature", {
                      feature: FEATURE_LABELS[key] || key,
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 pt-1 border-t border-amber-200">
              {t("downgradeReassurance")}
            </p>
          </div>
        )}

        {preview.isPending && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t("downgradeKeep")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isConfirming ? t("redirecting") : t("downgradeConfirm", { tier: newTier })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
