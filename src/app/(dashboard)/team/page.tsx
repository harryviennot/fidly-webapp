"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlusIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import {
  getBusinessMembers,
  getPendingInvitations,
  cancelInvitation,
  resendInvitation,
  updateMembershipRole,
  deleteMembership,
} from "@/api";
import type { MembershipWithUser, Invitation } from "@/types";
import { TeamTable } from "@/components/team/team-table";
import { TeamMemberCard, TeamMemberCardSkeleton } from "@/components/team/team-member-card";
import { InviteDialog } from "@/components/team/invite-dialog";
import { PendingInvitationsTable } from "@/components/team/pending-invitations-table";
import { TeamStats, TeamStatsSkeleton } from "@/components/team/team-stats";
import { EmptyTeamState } from "@/components/team/empty-team-state";
import { toast } from "sonner";

const CARD_LAYOUT_THRESHOLD = 6;

export default function TeamPage() {
  const { currentBusiness, currentRole } = useBusiness();
  const { user } = useAuth();
  const [members, setMembers] = useState<MembershipWithUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [cardLoading, setCardLoading] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (!currentBusiness?.id) return;

    if (showLoading) setLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        getBusinessMembers(currentBusiness.id),
        getPendingInvitations(currentBusiness.id),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error("Failed to load team data:", error);
      toast.error("Failed to load team data");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentBusiness?.id]);

  const refreshData = useCallback(() => loadData(false), [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentBusiness?.id) return;
    await cancelInvitation(currentBusiness.id, invitationId);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!currentBusiness?.id) return;
    await resendInvitation(currentBusiness.id, invitationId);
  };

  // Card layout handlers
  const handleCardChangeRole = async (member: MembershipWithUser, newRole: "admin" | "scanner") => {
    setCardLoading(member.id);
    try {
      await updateMembershipRole(member.id, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      loadData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setCardLoading(null);
    }
  };

  const handleCardRemove = async (member: MembershipWithUser) => {
    setCardLoading(member.id);
    try {
      await deleteMembership(member.id);
      toast.success(`${member.user.name || member.user.email} has been removed`);
      loadData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setCardLoading(null);
    }
  };

  const useCardLayout = members.length > 0 && members.length < CARD_LAYOUT_THRESHOLD;
  const ownerCount = members.filter((m) => m.role === "owner").length;

  // Skeleton loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Team Members</h2>
          <Button disabled>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>

        <TeamStatsSkeleton />

        <Card hover={false}>
          <CardHeader>
            <div className="h-6 w-24 bg-[var(--muted)] rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <TeamMemberCardSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - only the owner exists
  if (members.length <= 1 && invitations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Team Members</h2>
          <Button onClick={() => setInviteOpen(true)} variant="gradient" size="lg">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>

        <Card hover={false}>
          <CardContent className="pt-6">
            <EmptyTeamState onInvite={() => setInviteOpen(true)} />
          </CardContent>
        </Card>

        {currentBusiness && (
          <InviteDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            businessId={currentBusiness.id}
            onInvited={refreshData}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team Members</h2>
        <Button onClick={() => setInviteOpen(true)} variant="gradient">
          <UserPlusIcon className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <TeamStats
        members={members}
        invitations={invitations}
        subscriptionTier={currentBusiness?.subscription_tier}
      />

      {invitations.length > 0 && (
        <Card hover={false}>
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

      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-lg">
            {members.length} {members.length === 1 ? "Member" : "Members"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {useCardLayout ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => {
                const isCurrentUser = user?.email === member.user.email;
                const isLastOwner = member.role === "owner" && ownerCount === 1;
                const canManageTeam = currentRole === "owner" || currentRole === "admin";
                // Can't modify yourself or the last owner
                const canModify = canManageTeam && !isCurrentUser && !isLastOwner;

                return (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={isCurrentUser}
                    canModify={canModify}
                    loading={cardLoading === member.id}
                    onChangeRole={() => {
                      const newRole = member.role === "admin" ? "scanner" : "admin";
                      handleCardChangeRole(member, newRole);
                    }}
                    onRemove={() => handleCardRemove(member)}
                  />
                );
              })}
            </div>
          ) : (
            <TeamTable
              members={members}
              currentRole={currentRole ?? "scanner"}
              onMemberUpdated={loadData}
            />
          )}
        </CardContent>
      </Card>

      {currentBusiness && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          businessId={currentBusiness.id}
          onInvited={refreshData}
        />
      )}
    </div>
  );
}
