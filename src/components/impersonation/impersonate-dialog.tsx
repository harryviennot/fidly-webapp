"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, UsersIcon, UserCircleIcon } from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listBusinessUsersForImpersonation,
  startImpersonation,
  type ImpersonationBusinessUser,
} from "@/api/impersonation";
import { cn } from "@/lib/utils";

interface ImpersonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
}

type Mode = "by_role" | "by_user";
type Role = "owner" | "admin";
type Step = 1 | 2;

const ROLES: Role[] = ["owner", "admin"];
const MIN_REASON = 10;
const MAX_REASON = 1000;

export function ImpersonateDialog({ open, onOpenChange, businessId, businessName }: ImpersonateDialogProps) {
  const t = useTranslations("impersonation.dialog");
  const tRoles = useTranslations("roles");

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("by_role");
  const [role, setRole] = useState<Role>("owner");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset everything when the dialog closes so the next open is a clean slate.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep(1);
      setMode("by_role");
      setRole("owner");
      setTargetUserId("");
      setReason("");
      setConfirmed(false);
    }
    onOpenChange(next);
  };

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["impersonation-business-users", businessId],
    queryFn: () => listBusinessUsersForImpersonation(businessId),
    enabled: open,
  });

  const usersByRole = useMemo(() => {
    const grouped: Record<Role, ImpersonationBusinessUser[]> = { owner: [], admin: [] };
    users.forEach((u) => {
      if (u.role !== "scanner" && grouped[u.role as Role]) grouped[u.role as Role].push(u);
    });
    return grouped;
  }, [users]);

  const resolvedTargetForRole = usersByRole[role]?.[0] ?? null;
  const resolvedTargetForUser = targetUserId ? users.find((u) => u.user_id === targetUserId) ?? null : null;

  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= MIN_REASON && reasonLength <= MAX_REASON;
  const targetValid =
    mode === "by_role" ? !!resolvedTargetForRole : !!resolvedTargetForUser;
  const canSubmit = !submitting && reasonValid && targetValid && confirmed;
  const canAdvance = targetValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await startImpersonation({
        business_id: businessId,
        mode,
        reason: reason.trim(),
        ...(mode === "by_role"
          ? { role }
          : { target_user_id: targetUserId }),
      });
      window.location.href = result.redirect_url;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("genericError");
      toast.error(message);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            <span className={cn(step === 1 && "text-[var(--accent)]")}>
              {t("steps.target")}
            </span>
            <span className="text-[var(--border-medium,var(--border))]">›</span>
            <span className={cn(step === 2 && "text-[var(--accent)]")}>
              {t("steps.reason")}
            </span>
          </div>
          <DialogTitle>{t("title", { name: businessName })}</DialogTitle>
          <DialogDescription>
            {step === 1 ? t("steps.targetSubtitle") : t("steps.reasonSubtitle")}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-5">
            {/* Mode cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode("by_role")}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-all",
                  mode === "by_role"
                    ? "border-[var(--accent)] bg-[var(--accent-light)]/40 ring-2 ring-[var(--accent)]/20"
                    : "border-[var(--border)] hover:bg-[var(--muted)]",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <UsersIcon
                    size={18}
                    weight={mode === "by_role" ? "fill" : "regular"}
                    className={mode === "by_role" ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}
                  />
                  <span className={cn(
                    "text-sm font-semibold",
                    mode === "by_role" ? "text-[var(--accent)]" : "text-[var(--foreground)]",
                  )}>
                    {t("mode.byRole")}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--muted-foreground)] leading-snug block">
                  {t("mode.byRoleHint")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("by_user")}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-all",
                  mode === "by_user"
                    ? "border-[var(--accent)] bg-[var(--accent-light)]/40 ring-2 ring-[var(--accent)]/20"
                    : "border-[var(--border)] hover:bg-[var(--muted)]",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <UserCircleIcon
                    size={18}
                    weight={mode === "by_user" ? "fill" : "regular"}
                    className={mode === "by_user" ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}
                  />
                  <span className={cn(
                    "text-sm font-semibold",
                    mode === "by_user" ? "text-[var(--accent)]" : "text-[var(--foreground)]",
                  )}>
                    {t("mode.byUser")}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--muted-foreground)] leading-snug block">
                  {t("mode.byUserHint")}
                </span>
              </button>
            </div>

            {/* Target picker */}
            {mode === "by_role" ? (
              <div className="space-y-2">
                <Label className="text-xs">{t("byRole.label")}</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {ROLES.map((r) => {
                    const disabled = (usersByRole[r] || []).length === 0;
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={disabled}
                        onClick={() => setRole(r)}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-xs transition-colors",
                          role === r
                            ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-medium"
                            : "border-[var(--border)] hover:bg-[var(--muted)]",
                          disabled && "opacity-40 cursor-not-allowed",
                        )}
                        title={disabled ? t("byRole.noneAvailable", { role: tRoles(r) }) : undefined}
                      >
                        {tRoles(r)}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {resolvedTargetForRole
                    ? t("byRole.preview", {
                        name: resolvedTargetForRole.name ?? resolvedTargetForRole.email ?? resolvedTargetForRole.user_id,
                        email: resolvedTargetForRole.email ?? "",
                      })
                    : usersLoading
                      ? t("loading")
                      : t("byRole.noneAvailable", { role: tRoles(role) })}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">{t("byUser.label")}</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? t("loading") : t("byUser.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter((u) => u.role !== "scanner").map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{u.name ?? u.email ?? u.user_id}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{tRoles(u.role)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {/* Target summary card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3.5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                {t("steps.summaryLabel")}
              </p>
              <p className="text-sm text-[var(--foreground)]">
                {mode === "by_role"
                  ? t("byRole.preview", {
                      name: resolvedTargetForRole?.name ?? resolvedTargetForRole?.email ?? "",
                      email: resolvedTargetForRole?.email ?? "",
                    })
                  : `${resolvedTargetForUser?.name ?? resolvedTargetForUser?.email ?? ""} (${resolvedTargetForUser ? tRoles(resolvedTargetForUser.role) : ""})`}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs" htmlFor="impersonate-reason">{t("reason.label")}</Label>
              <Textarea
                id="impersonate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reason.placeholder")}
                rows={4}
                maxLength={MAX_REASON}
                className="text-sm"
                autoFocus
              />
              <p className={cn(
                "text-[11px]",
                reasonLength > 0 && !reasonValid
                  ? "text-[var(--error)]"
                  : "text-[var(--muted-foreground)]",
              )}>
                {t("reason.counter", { count: reasonLength, min: MIN_REASON, max: MAX_REASON })}
              </p>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[var(--muted-foreground)] cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--muted)]/40 transition-colors">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="leading-snug">{t("confirmation")}</span>
            </label>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                {t("cancel")}
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canAdvance}>
                {t("next")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeftIcon size={14} className="mr-1" />
                {t("back")}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? t("starting") : t("submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
