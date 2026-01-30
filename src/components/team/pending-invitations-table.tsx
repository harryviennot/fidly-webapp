"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Invitation } from "@/types";

interface PendingInvitationsTableProps {
  invitations: Invitation[];
  onCancel: (id: string) => Promise<void>;
  onResend: (id: string) => Promise<void>;
}

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  scanner: "outline",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  scanner: "Scanner",
};

export function PendingInvitationsTable({
  invitations,
  onCancel,
  onResend,
}: PendingInvitationsTableProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, string>>({});

  const handleResend = async (id: string) => {
    setLoadingStates((prev) => ({ ...prev, [id]: "resending" }));
    try {
      await onResend(id);
    } finally {
      setLoadingStates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleCancel = async (id: string) => {
    setLoadingStates((prev) => ({ ...prev, [id]: "cancelling" }));
    try {
      await onCancel(id);
    } finally {
      setLoadingStates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No pending invitations
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Invited</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => {
          const isLoading = !!loadingStates[invitation.id];
          const loadingAction = loadingStates[invitation.id];

          return (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell className="text-muted-foreground">
                {invitation.name || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_VARIANTS[invitation.role] || "outline"}>
                  {ROLE_LABELS[invitation.role] || invitation.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {invitation.created_at
                  ? formatRelativeTime(invitation.created_at)
                  : "-"}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResend(invitation.id)}
                  disabled={isLoading}
                >
                  {loadingAction === "resending" ? "Sending..." : "Resend"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleCancel(invitation.id)}
                  disabled={isLoading}
                >
                  {loadingAction === "cancelling" ? "Cancelling..." : "Cancel"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
