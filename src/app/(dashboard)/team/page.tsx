"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon, TrashIcon } from "@phosphor-icons/react";
import { SearchInput } from "@/components/reusables/search-input";
import { FilterPill } from "@/components/reusables/filter-pill";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/business-context";
import { useAuth } from "@/contexts/auth-provider";
import {
  getBusinessMembers,
  getPendingInvitations,
  cancelInvitation,
  resendInvitation,
  deleteMembership,
} from "@/api";
import type { MembershipWithUser, Invitation, MembershipRole } from "@/types";
import { TeamTable, type TeamRow } from "@/components/team/team-table";
import { TeamMemberCard, TeamMemberCardSkeleton } from "@/components/team/team-member-card";
import { InviteDialog } from "@/components/team/invite-dialog";
import { TeamStats, TeamStatsSkeleton } from "@/components/team/team-stats";
import { EmptyTeamState } from "@/components/team/empty-team-state";
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
import { toast } from "sonner";

type RoleFilter = "all" | MembershipRole;

function getActivityStatus(lastActive: string | undefined): "online" | "offline" {
  if (!lastActive) return "offline";
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7 ? "online" : "offline";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function TeamPage() {
  const { currentBusiness, currentRole } = useBusiness();
  const { user } = useAuth();
  const t = useTranslations('team');
  const [members, setMembers] = useState<MembershipWithUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [cardLoading, setCardLoading] = useState<string | null>(null);
  const [mobileRemoveRow, setMobileRemoveRow] = useState<TeamRow | null>(null);

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
      toast.error(t('loadFailed'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentBusiness?.id, t]);

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

  // Build unified rows from members + invitations
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const canManageTeam = currentRole === "owner" || currentRole === "admin";

  const allRows: TeamRow[] = useMemo(() => {
    const memberRows: TeamRow[] = members.map((member) => {
      const isCurrentUser = user?.email === member.user.email;
      const isLastOwner = member.role === "owner" && ownerCount === 1;
      const canModify = canManageTeam && !isCurrentUser && !isLastOwner;
      const status = getActivityStatus(member.last_active_at);

      return {
        type: "member" as const,
        id: member.id,
        name: member.user.name || "",
        email: member.user.email,
        role: member.role,
        avatarUrl: member.user.avatar_url,
        initials: getInitials(member.user.name || member.user.email),
        status,
        statusLabel: status === "online" ? t('memberCard.statusOnline') : t('memberCard.statusOffline'),
        joinedDate: member.created_at
          ? t('table.added', { date: new Date(member.created_at).toLocaleDateString() })
          : "",
        stampsGiven: member.scans_count || 0,
        isCurrentUser,
        isOwner: member.role === "owner",
        isLastOwner,
        canModify,
        member,
      };
    });

    const invitationRows: TeamRow[] = invitations.map((inv) => ({
      type: "invitation" as const,
      id: `inv-${inv.id}`,
      name: inv.name || "",
      email: inv.email,
      role: inv.role as MembershipRole,
      initials: getInitials(inv.name || inv.email),
      status: "invited" as const,
      statusLabel: t('memberCard.statusInvited'),
      joinedDate: inv.created_at
        ? t('table.added', { date: new Date(inv.created_at).toLocaleDateString() })
        : "",
      stampsGiven: 0,
      isCurrentUser: false as const,
      isOwner: false as const,
      isLastOwner: false as const,
      canModify: canManageTeam,
      invitation: inv,
    }));

    return [...memberRows, ...invitationRows];
  }, [members, invitations, user?.email, ownerCount, canManageTeam, t]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const matchesSearch = !search ||
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || row.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [allRows, search, roleFilter]);

  // Role counts for filter pills
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRows.length };
    allRows.forEach((row) => {
      counts[row.role] = (counts[row.role] || 0) + 1;
    });
    return counts;
  }, [allRows]);

  const filterButtons: { key: RoleFilter; label: string }[] = [
    { key: "all", label: t('filterAll') },
    { key: "owner", label: t('filterOwner') },
    { key: "admin", label: t('filterAdmin') },
    { key: "scanner", label: t('filterScanner') },
  ];

  // Mobile card handlers
  const handleMobileRemove = async (row: TeamRow) => {
    setCardLoading(row.id);
    try {
      if (row.type === "member") {
        await deleteMembership(row.member.id);
        toast.success(t('toasts.memberRemoved', { name: row.name || row.email }));
      } else if (row.type === "invitation") {
        await handleCancelInvitation(row.invitation.id);
        toast.success(t('toasts.invitationCancelled', { email: row.email }));
      }
      loadData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.removeFailed'));
    } finally {
      setCardLoading(null);
      setMobileRemoveRow(null);
    }
  };

  const handleMobileResend = async (row: TeamRow) => {
    if (row.type !== "invitation") return;
    setCardLoading(row.id);
    try {
      await handleResendInvitation(row.invitation.id);
      toast.success(t('toasts.invitationResent', { email: row.email }));
    } catch {
      toast.error(t('toasts.resendFailed'));
    } finally {
      setCardLoading(null);
    }
  };

  // Skeleton loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('title')}</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t('subtitle')}</p>
          </div>
          <Button disabled variant="gradient">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            {t('addMember')}
          </Button>
        </div>

        <TeamStatsSkeleton />

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <TeamMemberCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state - only the owner exists
  if (members.length <= 1 && invitations.length === 0) {
    return (
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('title')}</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t('subtitle')}</p>
          </div>
          <Button onClick={() => setInviteOpen(true)} variant="gradient" size="lg">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            {t('addMember')}
          </Button>
        </div>

        <EmptyTeamState onInvite={() => setInviteOpen(true)} />

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
    <div className="flex flex-col gap-[14px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} variant="gradient">
          <UserPlusIcon className="mr-2 h-4 w-4" />
          {t('addMember')}
        </Button>
      </div>

      {/* Stats */}
      <TeamStats
        members={members}
        invitations={invitations}
        subscriptionTier={currentBusiness?.subscription_tier}
      />

      {/* Search & Filter */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
        <div className="flex gap-2.5 items-center flex-wrap">
          {/* Search input */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('searchPlaceholder')}
          />

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {filterButtons.map((f) => (
              <FilterPill
                key={f.key}
                label={f.label}
                count={roleCounts[f.key] || 0}
                isActive={roleFilter === f.key}
                onClick={() => setRoleFilter(f.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <TeamTable
        rows={filteredRows}
        totalCount={allRows.length}
        currentRole={currentRole ?? "scanner"}
        onMemberUpdated={loadData}
        onCancelInvitation={handleCancelInvitation}
        onResendInvitation={handleResendInvitation}
      />

      {/* Mobile cards */}
      <div className="md:hidden rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="divide-y divide-[#F8F7F5]">
          {filteredRows.map((row) => (
            <div key={row.id} className="p-2">
              <TeamMemberCard
                row={row}
                loading={cardLoading === row.id}
                onRemove={() => setMobileRemoveRow(row)}
                onResend={row.type === "invitation" ? () => handleMobileResend(row) : undefined}
              />
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-[#F0EFEB] text-[12px] text-[#8A8A8A]">
          {t('showingCount', { filtered: filteredRows.length, total: allRows.length })}
        </div>
      </div>

      {currentBusiness && (
        <InviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          businessId={currentBusiness.id}
          onInvited={refreshData}
        />
      )}

      {/* Mobile remove dialog */}
      <AlertDialog open={!!mobileRemoveRow} onOpenChange={(open) => !open && setMobileRemoveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-500 mb-3.5">
                <TrashIcon size={22} />
              </div>
              <AlertDialogTitle>
                {mobileRemoveRow?.type === "invitation"
                  ? t('cancelInviteDialog.title')
                  : t('removeDialog.title', { name: mobileRemoveRow?.name || mobileRemoveRow?.email || '' })}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              {mobileRemoveRow?.type === "invitation"
                ? t('cancelInviteDialog.description', { email: mobileRemoveRow?.email || '' })
                : t('removeDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2.5 sm:flex-row">
            <AlertDialogCancel className="flex-1 rounded-full">
              {mobileRemoveRow?.type === "invitation" ? t('cancelInviteDialog.keep') : t('removeDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => mobileRemoveRow && handleMobileRemove(mobileRemoveRow)}
              className="flex-1 bg-destructive text-white hover:bg-destructive/90"
            >
              {mobileRemoveRow?.type === "invitation" ? t('cancelInviteDialog.cancel') : t('removeDialog.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
