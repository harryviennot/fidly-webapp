"use client";

import { useEffect, useState, useCallback } from "react";
import { UserPlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/lib/context/business-context";
import { getBusinessMembers } from "@/lib/api";
import type { MembershipWithUser } from "@/lib/types";
import { TeamTable } from "@/components/team/team-table";
import { InviteDialog } from "@/components/team/invite-dialog";

export default function TeamPage() {
  const { currentBusiness, currentRole } = useBusiness();
  const [members, setMembers] = useState<MembershipWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    try {
      const data = await getBusinessMembers(currentBusiness.id);
      setMembers(data);
    } catch (error) {
      console.error("Failed to load team members:", error);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const isOwner = currentRole === "owner";

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
        {isOwner && (
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
            isOwner={isOwner}
            onMemberUpdated={loadMembers}
          />
        </CardContent>
      </Card>

      {isOwner && currentBusiness && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          businessId={currentBusiness.id}
          onInvited={loadMembers}
        />
      )}
    </div>
  );
}
