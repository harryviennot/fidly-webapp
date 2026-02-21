"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form/form-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvitation } from "@/api";
import { useBusiness } from "@/contexts/business-context";
import type { InvitableRole } from "@/types";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onInvited: () => void;
}

export function InviteDialog({
  open,
  onOpenChange,
  businessId,
  onInvited,
}: InviteDialogProps) {
  const { currentRole } = useBusiness();
  const t = useTranslations('team.invite');
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<InvitableRole>("scanner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Owners can invite admins and scanners, admins can only invite scanners
  const isAdmin = currentRole !== "owner";

  const allRoles = [
    {
      value: "scanner" as InvitableRole,
      label: "Scanner",
      description: t('scannerDescription'),
    },
    {
      value: "admin" as InvitableRole,
      label: "Admin",
      description: t('adminDescription'),
    },
  ];

  const availableRoles = isAdmin
    ? allRoles.filter((r) => r.value === "scanner")
    : allRoles;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await createInvitation(businessId, {
        email,
        name: name.trim() || undefined,
        role,
      });

      setSuccess(true);
      onInvited();

      // Reset form and close after short delay
      setTimeout(() => {
        onOpenChange(false);
        setEmail("");
        setName("");
        setRole("scanner");
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setEmail("");
    setName("");
    setRole("scanner");
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-950/50 dark:border-red-900/50 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-green-50 text-green-600 text-sm border border-green-100 dark:bg-green-950/50 dark:border-green-900/50 dark:text-green-400">
              {t('success')}
            </div>
          )}

          <FormField
            label={t('email')}
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={success}
          />

          <FormField
            label={t('name')}
            id="name"
            type="text"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={success}
            hint={t('nameHint')}
          />

          <div className="space-y-2">
            <Label>{t('role')}</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as InvitableRole)}
              disabled={success || isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectRole')} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <p className="text-xs text-muted-foreground">
                {t('adminOnlyScanner')}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3.5 px-4 border border-[var(--border)] text-[var(--foreground)] font-semibold rounded-full hover:bg-[var(--muted)] transition-all duration-200"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 py-3.5 px-4 font-semibold rounded-full hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "var(--accent)",
                color: "white",
              }}
              onMouseEnter={(e) => {
                if (!loading && !success) {
                  e.currentTarget.style.background = "var(--accent-hover)";
                  e.currentTarget.style.boxShadow = "0 10px 25px -5px color-mix(in srgb, var(--accent) 40%, transparent)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? t('sending') : t('sendInvitation')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
