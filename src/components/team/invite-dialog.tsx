"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvitation } from "@/api";
import { useBusiness } from "@/contexts/business-context";
import type { InvitableRole } from "@/types";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onInvited: () => void;
}

interface RoleOption {
  value: InvitableRole;
  label: string;
  description: string;
}

const ALL_ROLES: RoleOption[] = [
  {
    value: "scanner",
    label: "Scanner",
    description: "Can scan customer passes and add stamps via mobile app",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Can manage team members and access all business features",
  },
];

export function InviteDialog({
  open,
  onOpenChange,
  businessId,
  onInvited,
}: InviteDialogProps) {
  const { currentRole } = useBusiness();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<InvitableRole>("scanner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Owners can invite admins and scanners, admins can only invite scanners
  const availableRoles =
    currentRole === "owner"
      ? ALL_ROLES
      : ALL_ROLES.filter((r) => r.value === "scanner");

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email. They'll create an account when they accept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={success}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={success}
              />
              <p className="text-xs text-muted-foreground">
                Used to personalize the invitation email
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as InvitableRole)}
                disabled={success}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} - {r.description}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {success && (
              <p className="text-sm text-green-600">
                Invitation sent successfully!
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || success}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
