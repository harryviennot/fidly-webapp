"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { MembershipRole } from "@/types";

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: MembershipRole;
  memberName: string;
  onConfirm: (newRole: MembershipRole) => void;
  loading: boolean;
}

export function RoleDialog({
  open,
  onOpenChange,
  currentRole,
  memberName,
  onConfirm,
  loading,
}: RoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<MembershipRole>(currentRole);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const handleConfirm = () => {
    if (selectedRole !== currentRole) {
      onConfirm(selectedRole);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Change the role for {memberName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role">New Role</Label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as MembershipRole)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="scanner">Scanner - Can scan passes via mobile app</option>
              <option value="admin">Admin - Can manage team and settings</option>
              <option value="owner">Owner - Full access including billing</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
