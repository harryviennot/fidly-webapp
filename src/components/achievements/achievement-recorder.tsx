"use client";

import { useBusiness } from "@/contexts/business-context";
import { useAchievementRecorder } from "@/hooks/use-business-achievements";

/**
 * Headless: records trophy unlocks wherever the owner is in the dashboard, so the
 * ledger stays fresh and the widget can flag freshly-earned ones. The celebration
 * animation itself lives only on /achievements (see AchievementCelebration), so the
 * dashboard never gets interrupted by a takeover.
 */
export function AchievementRecorder() {
  const { currentBusiness } = useBusiness();
  useAchievementRecorder(
    currentBusiness?.id,
    Boolean(currentBusiness?.settings?.first_broadcast_sent)
  );
  return null;
}
