"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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
type Role = "owner" | "admin" | "scanner";

const ROLES: Role[] = ["owner", "admin", "scanner"];
const MIN_REASON = 10;
const MAX_REASON = 1000;

export function ImpersonateDialog({ open, onOpenChange, businessId, businessName }: ImpersonateDialogProps) {
  const t = useTranslations("impersonation.dialog");
  const tRoles = useTranslations("roles");

  const [mode, setMode] = useState<Mode>("by_role");
  const [role, setRole] = useState<Role>("owner");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["impersonation-business-users", businessId],
    queryFn: () => listBusinessUsersForImpersonation(businessId),
    enabled: open,
  });

  const usersByRole = useMemo(() => {
    const grouped: Record<Role, ImpersonationBusinessUser[]> = { owner: [], admin: [], scanner: [] };
    users.forEach((u) => {
      if (grouped[u.role]) grouped[u.role].push(u);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: businessName })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <Label className="text-xs">{t("mode.label")}</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("by_role")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors text-left",
                  mode === "by_role"
                    ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                    : "border-[var(--border)] hover:bg-[var(--muted)]",
                )}
              >
                <span className="font-medium block">{t("mode.byRole")}</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {t("mode.byRoleHint")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("by_user")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors text-left",
                  mode === "by_user"
                    ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                    : "border-[var(--border)] hover:bg-[var(--muted)]",
                )}
              >
                <span className="font-medium block">{t("mode.byUser")}</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {t("mode.byUserHint")}
                </span>
              </button>
            </div>
          </div>

          {mode === "by_role" ? (
            <div>
              <Label className="text-xs">{t("byRole.label")}</Label>
              <div className="mt-1.5 flex gap-1.5">
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
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
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
            <div>
              <Label className="text-xs">{t("byUser.label")}</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={usersLoading ? t("loading") : t("byUser.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
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

          <div>
            <Label className="text-xs" htmlFor="impersonate-reason">{t("reason.label")}</Label>
            <Textarea
              id="impersonate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reason.placeholder")}
              rows={3}
              maxLength={MAX_REASON}
              className="mt-1.5 text-sm"
            />
            <p className={cn(
              "mt-1 text-[11px]",
              reasonLength > 0 && !reasonValid
                ? "text-red-600"
                : "text-[var(--muted-foreground)]",
            )}>
              {t("reason.counter", { count: reasonLength, min: MIN_REASON, max: MAX_REASON })}
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs text-[var(--muted-foreground)] cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t("confirmation")}</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? t("starting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
