"use client";

import { useState } from "react";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-provider";
import { deleteMembership } from "@/api";
import type { MembershipWithUser, MembershipRole } from "@/types";
import { toast } from "sonner";

interface TeamTableProps {
  members: MembershipWithUser[];
  currentRole: MembershipRole;
  onMemberUpdated: () => void;
}

export function TeamTable({ members, currentRole, onMemberUpdated }: TeamTableProps) {
  const { user } = useAuth();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
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

  const handleRemoveClick = (member: MembershipWithUser) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!selectedMember) return;

    setLoading(selectedMember.id);
    setRemoveDialogOpen(false);
    try {
      await deleteMembership(selectedMember.id);
      toast.success(`${selectedMember.user.name || selectedMember.user.email} has been removed from the team`);
      onMemberUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setLoading(null);
      setSelectedMember(null);
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
                    <AvatarImage src={member.user.avatar_url} className="object-cover" />
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
                        <DropdownMenuItem
                          onClick={() => handleRemoveClick(member)}
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

    <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove team member?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-medium text-[var(--foreground)]">
              {selectedMember?.user.name || selectedMember?.user.email}
            </span>{" "}
            from the team? They will lose access to this business.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemoveConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
