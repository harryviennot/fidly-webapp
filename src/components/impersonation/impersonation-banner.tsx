"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ShieldWarningIcon, SignOutIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useImpersonation } from "@/contexts/impersonation-context";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ImpersonationBanner() {
  const t = useTranslations("impersonation.banner");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const { session, endSession } = useImpersonation();

  const expiresAt = useMemo(() => session ? new Date(session.expires_at).getTime() : null, [session]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session || !expiresAt) return;
    if (expiresAt - now <= 0) {
      // Auto-end the session client-side and bounce to /businesses.
      void endSession().then(() => router.push("/businesses"));
    }
  }, [session, expiresAt, now, endSession, router]);

  if (!session || !expiresAt) return null;

  const remaining = expiresAt - now;
  const isCritical = remaining <= 5 * 60 * 1000;
  const targetName = session.target_user_name ?? session.target_user_id;

  const handleEnd = async () => {
    await endSession();
    router.push("/businesses");
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-[var(--error)]/20 bg-[var(--error-light)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--error-light)]/80"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 shrink-0 rounded-full bg-[var(--error)]/10 flex items-center justify-center">
            <ShieldWarningIcon size={14} weight="fill" className="text-[var(--error)]" />
          </div>
          <p className="text-xs sm:text-sm text-[var(--foreground)] truncate">
            {t("text", {
              name: targetName,
              role: tRoles(session.target_role),
              business: session.business_name ?? "",
            })}
            {session.selection_mode === "by_role" && (
              <span className="ml-1 text-[var(--muted-foreground)]">· {t("byRoleAnnotation")}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              isCritical
                ? "text-[var(--error)] font-semibold"
                : "text-[var(--muted-foreground)]",
            )}
          >
            {formatRemaining(remaining)}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error)]/5 hover:text-[var(--error)] hover:border-[var(--error)]/40"
            onClick={handleEnd}
          >
            <SignOutIcon size={14} className="mr-1" />
            {t("endSession")}
          </Button>
        </div>
      </div>
    </div>
  );
}
