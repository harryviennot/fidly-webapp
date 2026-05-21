"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBusinessMembers } from "@/api";
import {
  useLocationMembers,
  useAssignLocationMember,
} from "@/hooks/use-locations";
import { toast } from "sonner";
import type { MembershipWithUser } from "@/types";

interface LocationMemberPickerProps {
  businessId: string;
  locationId: string;
  /** Restrict to scanner-role memberships (default behavior). Owners and
   *  admins always bypass the assignment list per backend semantics, so
   *  showing them in the picker would be confusing. */
  scannerOnly?: boolean;
  trigger?: React.ReactNode;
}

function getInitials(name?: string | null, email?: string) {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LocationMemberPicker({
  businessId,
  locationId,
  scannerOnly = true,
  trigger,
}: LocationMemberPickerProps) {
  const t = useTranslations("loyaltyProgram.locations.members");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allMembersQuery = useQuery({
    queryKey: ["memberships", "business", businessId, "all-for-location-picker"],
    queryFn: () => getBusinessMembers(businessId),
    enabled: open,
  });

  const { data: assigned } = useLocationMembers(businessId, locationId, open);
  const assign = useAssignLocationMember(businessId);

  const assignedIds = useMemo(
    () => new Set((assigned ?? []).map((m) => m.membership_id)),
    [assigned]
  );

  const candidates = useMemo<MembershipWithUser[]>(() => {
    const list = allMembersQuery.data ?? [];
    return list
      .filter((m) => (scannerOnly ? m.role === "scanner" : true))
      .filter((m) => !assignedIds.has(m.id))
      .filter((m) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return (
          (m.user.name ?? "").toLowerCase().includes(term) ||
          m.user.email.toLowerCase().includes(term)
        );
      });
  }, [allMembersQuery.data, scannerOnly, assignedIds, search]);

  const handleAssign = (membershipId: string, label: string) => {
    assign.mutate(
      { locationId, membershipId },
      {
        onSuccess: () => {
          toast.success(t("assignedToast", { name: label }));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("assignFailed"));
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="rounded-full">
            <PlusIcon className="h-3.5 w-3.5" />
            {t("addMember")}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-2 border-b border-[var(--border)]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {allMembersQuery.isLoading && (
            <p className="px-3 py-4 text-xs text-[var(--muted-foreground)] text-center">
              {t("loading")}
            </p>
          )}
          {!allMembersQuery.isLoading && candidates.length === 0 && (
            <p className="px-3 py-4 text-xs text-[var(--muted-foreground)] text-center">
              {search ? t("noMatches") : t("noCandidates")}
            </p>
          )}
          {candidates.map((m) => {
            const label = m.user.name || m.user.email;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleAssign(m.id, label)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--muted)] transition-colors text-left"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={m.user.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(m.user.name, m.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-[#1A1A1A] truncate">
                    {label}
                  </p>
                  <p className="text-[10.5px] text-[var(--muted-foreground)] truncate">
                    {m.user.email}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
