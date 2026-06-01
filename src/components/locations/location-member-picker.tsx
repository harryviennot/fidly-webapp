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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { getBusinessMembers } from "@/api";
import {
  useLocationMembers,
  useAssignLocationMember,
} from "@/hooks/use-locations";
import { toast } from "sonner";
import { getInitials } from "./_initials";
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

export function LocationMemberPicker({
  businessId,
  locationId,
  scannerOnly = true,
  trigger,
}: LocationMemberPickerProps) {
  const t = useTranslations("loyaltyProgram.locations.members");
  const isMobile = useIsMobile();
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
          if (isMobile) setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("assignFailed"));
        },
      }
    );
  };

  const triggerNode = trigger ?? (
    <Button variant="outline" size="sm" className="rounded-full">
      <PlusIcon className="h-3.5 w-3.5" weight="bold" />
      {t("addMember")}
    </Button>
  );

  const searchBar = (
    <div className="relative">
      <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className={isMobile ? "h-11 pl-8 text-sm" : "h-8 pl-7 text-sm"}
        autoFocus={!isMobile}
      />
    </div>
  );

  const list = (
    <>
      {allMembersQuery.isLoading && (
        <p className="px-3 py-6 text-xs text-[var(--muted-foreground)] text-center">
          {t("loading")}
        </p>
      )}
      {!allMembersQuery.isLoading && candidates.length === 0 && (
        <p className="px-3 py-6 text-xs text-[var(--muted-foreground)] text-center">
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
            className={
              isMobile
                ? "w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] transition-colors text-left"
                : "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--muted)] transition-colors text-left"
            }
          >
            <Avatar className={isMobile ? "h-9 w-9" : "h-7 w-7"}>
              <AvatarImage src={m.user.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {getInitials(m.user.name, m.user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className={
                  isMobile
                    ? "text-[14px] font-medium text-[#1A1A1A] truncate"
                    : "text-[12.5px] font-medium text-[#1A1A1A] truncate"
                }
              >
                {label}
              </p>
              <p
                className={
                  isMobile
                    ? "text-[12px] text-[var(--muted-foreground)] truncate"
                    : "text-[10.5px] text-[var(--muted-foreground)] truncate"
                }
              >
                {m.user.email}
              </p>
            </div>
          </button>
        );
      })}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerNode}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="flex flex-col gap-0 p-0 max-h-[80vh] rounded-t-2xl overflow-hidden border-t-0"
        >
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-[var(--border-dark)] opacity-60" />
          </div>
          <div className="px-5 pt-2 pb-3 border-b border-[var(--border)] shrink-0">
            <SheetTitle className="text-[16px] font-bold text-[#1A1A1A] text-left mb-2">
              {t("addMember")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t("searchPlaceholder")}
            </SheetDescription>
            {searchBar}
          </div>
          <div className="flex-1 overflow-y-auto py-1">{list}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-2 border-b border-[var(--border)]">{searchBar}</div>
        <div className="max-h-64 overflow-y-auto py-1">{list}</div>
      </PopoverContent>
    </Popover>
  );
}
