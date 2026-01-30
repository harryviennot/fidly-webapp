"use client";

import { useState } from "react";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-provider";
import { updateMembershipRole, deleteMembership } from "@/api";
import type { MembershipWithUser, MembershipRole } from "@/types";
import { RoleDialog } from "./role-dialog";

interface TeamTableProps {
  members: MembershipWithUser[];
  currentRole: MembershipRole;
  onMemberUpdated: () => void;
}

export function TeamTable({ members, currentRole, onMemberUpdated }: TeamTableProps) {
  const { user } = useAuth();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MembershipWithUser | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChangeRole = (member: MembershipWithUser) => {
    setSelectedMember(member);
    setRoleDialogOpen(true);
  };

  const handleRemove = async (member: MembershipWithUser) => {
    if (!confirm(`Remove ${member.user.name || member.user.email} from the team?`)) {
      return;
    }

    setLoading(member.id);
    try {
      await deleteMembership(member.id);
      onMemberUpdated();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setLoading(null);
    }
  };

  const handleRoleUpdated = async (newRole: MembershipRole) => {
    if (!selectedMember) return;

    setLoading(selectedMember.id);
    try {
      await updateMembershipRole(selectedMember.id, { role: newRole });
      onMemberUpdated();
      setRoleDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoading(null);
    }
  };

  // Count owners to prevent removing the last one
  const ownerCount = members.filter((m) => m.role === "owner").length;

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No team members yet.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {(currentRole === "owner" || currentRole === "admin") && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = user?.email === member.user.email;
            const isLastOwner = member.role === "owner" && ownerCount === 1;
            const canManageTeam = currentRole === "owner" || currentRole === "admin";
            const canModify = canManageTeam && !isCurrentUser && !isLastOwner;

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-sm">
                        {getInitials(member.user.name || member.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {member.user.name || "Unnamed"}
                        {isCurrentUser && (
                          <span className="text-muted-foreground ml-1">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                {(currentRole === "owner" || currentRole === "admin") && (
                  <TableCell>
                    {canModify ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loading === member.id}
                          >
                            <DotsThreeIcon className="h-4 w-4" weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemove(member)}
                            className="text-destructive"
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        currentRole={selectedMember?.role || "scanner"}
        memberName={selectedMember?.user.name || selectedMember?.user.email || ""}
        onConfirm={handleRoleUpdated}
        loading={loading !== null}
      />
    </>
  );
}
