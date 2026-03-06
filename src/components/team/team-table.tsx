"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon, CheckIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { deleteMembership, updateMembershipRole } from "@/api";
import type { MembershipWithUser, MembershipRole } from "@/types";
import type { Invitation } from "@/types";
import { toast } from "sonner";

// Unified row type for members + invitations
export type TeamRow = {
  type: "member";
  id: string;
  name: string;
  email: string;
  role: MembershipRole;
  avatarUrl?: string;
  initials: string;
  status: "online" | "invited" | "offline";
  statusLabel: string;
  joinedDate: string;
  stampsGiven: number;
  isCurrentUser: boolean;
  isOwner: boolean;
  isLastOwner: boolean;
  canModify: boolean;
  member: MembershipWithUser;
} | {
  type: "invitation";
  id: string;
  name: string;
  email: string;
  role: MembershipRole;
  avatarUrl?: string;
  initials: string;
  status: "invited";
  statusLabel: string;
  joinedDate: string;
  stampsGiven: number;
  isCurrentUser: false;
  isOwner: false;
  isLastOwner: false;
  canModify: boolean;
  invitation: Invitation;
};

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  owner: { bg: "#E8F5E4", color: "#3D6B3D", border: "#C8E6C430" },
  admin: { bg: "#FFF3E0", color: "#C4883D", border: "#F0DFC030" },
  scanner: { bg: "#E4F0F8", color: "#3D7CAF", border: "#B0D4E830" },
};

const STATUS_COLORS: Record<string, string> = {
  online: "#4A7C59",
  invited: "#C4883D",
  offline: "#CCCCCC",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  online: "#4A7C59",
  invited: "#C4883D",
  offline: "#AAAAAA",
};

interface TeamTableProps {
  rows: TeamRow[];
  totalCount: number;
  currentRole: MembershipRole;
  onMemberUpdated: () => void;
  onCancelInvitation?: (id: string) => Promise<void>;
  onResendInvitation?: (id: string) => Promise<void>;
}

export function TeamTable({
  rows,
  totalCount,
  currentRole,
  onMemberUpdated,
  onCancelInvitation,
  onResendInvitation,
}: TeamTableProps) {
  const t = useTranslations('team');
  const tRoles = useTranslations('roles');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TeamRow | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close role dropdown on outside click
  useEffect(() => {
    if (!roleDropdown) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdown(null);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [roleDropdown]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRemoveClick = (row: TeamRow) => {
    setSelectedRow(row);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!selectedRow) return;

    setLoading(selectedRow.id);
    setRemoveDialogOpen(false);
    try {
      if (selectedRow.type === "member") {
        await deleteMembership(selectedRow.member.id);
        toast.success(t('toasts.memberRemoved', { name: selectedRow.name || selectedRow.email }));
      } else if (selectedRow.type === "invitation" && onCancelInvitation) {
        await onCancelInvitation(selectedRow.invitation.id);
        toast.success(t('toasts.invitationCancelled', { email: selectedRow.email }));
      }
      onMemberUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.removeFailed'));
    } finally {
      setLoading(null);
      setSelectedRow(null);
    }
  };

  const handleRoleChange = async (row: TeamRow, newRole: MembershipRole) => {
    if (row.type !== "member") return;
    setRoleDropdown(null);
    setLoading(row.id);
    try {
      await updateMembershipRole(row.member.id, { role: newRole });
      toast.success(t('toasts.roleUpdated', { role: newRole }));
      onMemberUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toasts.roleUpdateFailed'));
    } finally {
      setLoading(null);
    }
  };

  const handleResend = async (row: TeamRow) => {
    if (row.type !== "invitation" || !onResendInvitation) return;
    setLoading(row.id);
    try {
      await onResendInvitation(row.invitation.id);
      toast.success(t('toasts.invitationResent', { email: row.email }));
    } catch {
      toast.error(t('toasts.resendFailed'));
    } finally {
      setLoading(null);
    }
  };

  const canManageTeam = currentRole === "owner" || currentRole === "admin";
  const selectedName = selectedRow?.name || selectedRow?.email || '';

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t('noMembers')}
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#F0EFEB] bg-white hover:bg-white">
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4">{t('table.member')}</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 hidden lg:table-cell">{t('table.email')}</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4">{t('table.role')}</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4">{t('table.status')}</TableHead>
              <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 text-center hidden lg:table-cell">{t('table.stampsGiven')}</TableHead>
              {canManageTeam && <TableHead className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider px-4 text-right"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const rs = ROLE_STYLES[row.role] || ROLE_STYLES.scanner;

              return (
                <TableRow
                  key={row.id}
                  className={`border-b border-[#F8F7F5] transition-colors duration-100 hover:bg-[#FAFAF8] ${i === rows.length - 1 ? "border-b-0" : ""}`}
                >
                  {/* Member */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={row.avatarUrl} className="object-cover" />
                          <AvatarFallback className="bg-[var(--muted)] text-xs font-semibold">
                            {row.initials || getInitials(row.name || row.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white"
                          style={{
                            background: STATUS_COLORS[row.status],
                            boxShadow: `0 0 0 1px ${STATUS_COLORS[row.status]}40`,
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-[#1A1A1A]">
                            {row.name || t('memberCard.unnamed')}
                          </span>
                          {row.isCurrentUser && (
                            <span className="text-[9px] py-0.5 px-1.5 rounded bg-[#F0EDE7] text-[#A0A0A0] font-semibold">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-[#A5A5A5]">
                          {row.joinedDate}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="py-3 px-4 text-[12.5px] text-[#666] hidden lg:table-cell">
                    {row.email}
                  </TableCell>

                  {/* Role */}
                  <TableCell className="py-3 px-4 relative">
                    {row.isOwner ? (
                      <span
                        className="inline-flex text-[11px] py-0.5 px-2.5 rounded-full font-semibold"
                        style={{ background: rs.bg, color: rs.color }}
                      >
                        {tRoles(row.role)}
                      </span>
                    ) : row.type === "member" && row.canModify ? (
                      <div className="relative" ref={roleDropdown === row.id ? dropdownRef : undefined}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRoleDropdown(roleDropdown === row.id ? null : row.id); }}
                          disabled={loading === row.id}
                          className="inline-flex items-center gap-1 text-[11px] py-0.5 px-2.5 rounded-full font-semibold cursor-pointer transition-all hover:opacity-80"
                          style={{ background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}
                        >
                          {tRoles(row.role)}
                          <CaretDownIcon size={10} weight="bold" />
                        </button>

                        {roleDropdown === row.id && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-[#EEEDEA] shadow-lg overflow-hidden min-w-[170px]">
                            {(["admin", "scanner"] as MembershipRole[]).map((r) => {
                              const rStyle = ROLE_STYLES[r];
                              const isCurrent = row.role === r;
                              return (
                                <button
                                  key={r}
                                  onClick={() => handleRoleChange(row, r)}
                                  className="w-full flex items-center gap-2.5 py-2.5 px-3.5 text-left text-xs transition-colors"
                                  style={{ background: isCurrent ? "#FAFAF8" : "transparent" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAF8"; }}
                                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                                >
                                  <span
                                    className="text-[11px] py-0.5 px-2 rounded-xl font-semibold"
                                    style={{ background: rStyle.bg, color: rStyle.color }}
                                  >
                                    {t(`table.role${r.charAt(0).toUpperCase() + r.slice(1)}`)}
                                  </span>
                                  <span className="flex-1 text-[11px] text-[#AAA]">
                                    {t(`table.role${r.charAt(0).toUpperCase() + r.slice(1)}Desc`)}
                                  </span>
                                  {isCurrent && <CheckIcon size={12} className="text-[#4A7C59]" weight="bold" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span
                        className="inline-flex text-[11px] py-0.5 px-2.5 rounded-full font-semibold"
                        style={{ background: rs.bg, color: rs.color }}
                      >
                        {tRoles(row.role)}
                      </span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3 px-4">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: STATUS_TEXT_COLORS[row.status] }}
                    >
                      {row.statusLabel}
                    </span>
                  </TableCell>

                  {/* Stamps */}
                  <TableCell className="py-3 px-4 text-center hidden lg:table-cell">
                    <span className={`text-[14px] font-semibold ${row.stampsGiven > 0 ? "text-[#1A1A1A]" : "text-[#CCC]"}`}>
                      {row.stampsGiven}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  {canManageTeam && (
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.type === "invitation" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => handleResend(row)}
                            disabled={loading === row.id}
                          >
                            {t('table.resend')}
                          </Button>
                        )}
                        {row.canModify && (
                          <button
                            onClick={() => handleRemoveClick(row)}
                            disabled={loading === row.id}
                            className="p-1 rounded-md transition-colors duration-150 disabled:opacity-20"
                            style={{ color: "#CCC" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#C75050"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#CCC"; }}
                          >
                            <TrashIcon size={16} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#F0EFEB] flex justify-between items-center text-[12px] text-[#8A8A8A]">
          <span>{t('showingCount', { filtered: rows.length, total: totalCount })}</span>
        </div>
      </div>

      {/* Remove/Cancel Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-500 mb-3.5">
                <TrashIcon size={22} />
              </div>
              <AlertDialogTitle>
                {selectedRow?.type === "invitation"
                  ? t('cancelInviteDialog.title')
                  : t('removeDialog.title', { name: selectedName })}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              {selectedRow?.type === "invitation"
                ? t('cancelInviteDialog.description', { email: selectedRow?.email || '' })
                : t('removeDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2.5 sm:flex-row">
            <AlertDialogCancel className="flex-1">
              {selectedRow?.type === "invitation" ? t('cancelInviteDialog.keep') : t('removeDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="flex-1 bg-destructive text-white hover:bg-destructive/90"
            >
              {selectedRow?.type === "invitation" ? t('cancelInviteDialog.cancel') : t('removeDialog.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
