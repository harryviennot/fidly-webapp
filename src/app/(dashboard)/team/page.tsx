"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlusIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/business-context";
import {
  getBusinessMembers,
  getPendingInvitations,
  cancelInvitation,
  resendInvitation,
} from "@/api";
import type { MembershipWithUser, Invitation } from "@/types";
import { TeamTable } from "@/components/team/team-table";
import { InviteDialog } from "@/components/team/invite-dialog";
import { PendingInvitationsTable } from "@/components/team/pending-invitations-table";

export default function TeamPage() {
  const { currentBusiness, currentRole } = useBusiness();
  const [members, setMembers] = useState<MembershipWithUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Owners and admins can invite (but not scanners)
  const canInvite = currentRole === "owner" || currentRole === "admin";
  const canViewInvitations = canInvite;

  const loadData = useCallback(async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        getBusinessMembers(currentBusiness.id),
        canViewInvitations
          ? getPendingInvitations(currentBusiness.id)
          : Promise.resolve([]),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error("Failed to load team data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, canViewInvitations]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentBusiness?.id) return;
    try {
      await cancelInvitation(currentBusiness.id, invitationId);
      // Remove from local state
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!currentBusiness?.id) return;
    try {
      await resendInvitation(currentBusiness.id, invitationId);
      // Could show a toast notification here
    } catch (error) {
      console.error("Failed to resend invitation:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Members</h2>
          <p className="text-muted-foreground">
            Manage who has access to your business
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {members.length} {members.length === 1 ? "Member" : "Members"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamTable
            members={members}
            isOwner={currentRole === "owner"}
            onMemberUpdated={loadData}
          />
        </CardContent>
      </Card>

      {canViewInvitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <EnvelopeSimpleIcon className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInvitationsTable
              invitations={invitations}
              onCancel={handleCancelInvitation}
              onResend={handleResendInvitation}
            />
          </CardContent>
        </Card>
      )}

      {canInvite && currentBusiness && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          businessId={currentBusiness.id}
          onInvited={loadData}
        />
      )}
    </div>
  );
}
