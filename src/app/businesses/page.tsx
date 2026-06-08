"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  SquaresFourIcon,
  RowsIcon,
  StorefrontIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import { SearchBar, type FilterGroup } from "@/components/reusables/search-bar";
import { EmptyState } from "@/components/reusables/empty-state";
import { PageHeader } from "@/components/redesign";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useListViewPreference } from "@/hooks/use-list-view-preference";
import { useBusinessesList } from "@/hooks/use-businesses-list";
import { useIsSuperadmin } from "@/lib/auth/use-is-superadmin";
import { useBusiness } from "@/contexts/business-context";
import { sortByRecentAccess } from "@/lib/recent-business-access";
import { BusinessCard } from "@/components/businesses/business-card";
import { BusinessTable } from "@/components/businesses/business-table";
import { ImpersonateDialog } from "@/components/impersonation/impersonate-dialog";
import type { BusinessListItem } from "@/api/businesses";

const PAGE_SIZE = 50;
type View = "cards" | "table";
type StatusFilter = "all" | "active" | "pending" | "suspended";

export default function BusinessesPage() {
  const t = useTranslations("businessesPage");
  const router = useRouter();
  const isSuperadmin = useIsSuperadmin();
  const { memberships, setCurrentBusiness, startNewBusiness } = useBusiness();

  const [view, setView] = useListViewPreference<View>("businessListView", "cards");
  const [scope, setScope] = useListViewPreference<"mine" | "all">(
    "businessListScope",
    isSuperadmin ? "all" : "mine",
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  const effectiveScope: "mine" | "all" = isSuperadmin ? scope : "mine";

  useEffect(() => {
    if (!isSuperadmin && memberships.length === 1) {
      router.replace("/");
    }
  }, [isSuperadmin, memberships.length, router]);

  const { data, isLoading, isError } = useBusinessesList({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: search || undefined,
    scope: effectiveScope,
  });

  const items = useMemo<BusinessListItem[]>(() => {
    const raw = data?.items ?? [];
    const filtered = statusFilter === "all" ? raw : raw.filter((b) => b.status === statusFilter);
    // Surface most-recently-accessed businesses first within the current page.
    return sortByRecentAccess(filtered);
  }, [data?.items, statusFilter]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Whether the viewer can "Open" the business directly — only true when
  // they're a member. For superadmins on businesses they don't belong to,
  // the entry point is impersonation ("View as").
  const isMember = (business: BusinessListItem) =>
    memberships.some((m) => m.business.id === business.id);

  const handleOpen = (business: BusinessListItem) => {
    const membership = memberships.find((m) => m.business.id === business.id);
    if (!membership) return;
    setCurrentBusiness(membership.business);
    router.push("/");
  };

  // Create another business: enter the launch wizard with a clean slate (the
  // context forces currentBusiness to null), so it runs the same create flow
  // as a first-time signup instead of editing one of the existing businesses.
  const handleCreateNew = () => {
    startNewBusiness();
    router.push("/onboarding/business/welcome");
  };

  const [impersonateTarget, setImpersonateTarget] = useState<BusinessListItem | null>(null);

  const handleImpersonate = (business: BusinessListItem) => {
    setImpersonateTarget(business);
  };

  const showCount = !isLoading && !isError && total > 0;
  // Toolbar (search + filters + view toggle) is only useful past a certain
  // count. Superadmins always see it; regular users only when the list grows.
  const TOOLBAR_THRESHOLD = 16;
  const showToolbar = isSuperadmin || total > TOOLBAR_THRESHOLD;
  // When the toolbar is hidden, the view toggle is hidden too — force cards.
  const effectiveView: View = showToolbar ? view : "cards";

  const filters: FilterGroup[] = [];
  if (isSuperadmin) {
    filters.push({
      id: "scope",
      label: t("scope.label"),
      value: scope,
      onChange: (v) => {
        setScope((v ?? "mine") as "mine" | "all");
        setPage(0);
      },
      options: [
        { value: "mine", label: t("scope.mine") },
        { value: "all", label: t("scope.all") },
      ],
    });
  }
  filters.push({
    id: "status",
    label: t("statusFilter.label"),
    value: statusFilter === "all" ? null : statusFilter,
    allValue: "all",
    onChange: (v) => setStatusFilter((v ?? "all") as StatusFilter),
    options: (["all", "active", "pending", "suspended"] as StatusFilter[]).map(
      (s) => ({ value: s, label: t(`statusFilter.${s}`) }),
    ),
  });

  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader
        title={t("title")}
        subtitle={isSuperadmin ? t("subtitleAdmin") : t("subtitle")}
        actions={[
          {
            label: t("createNew"),
            icon: <PlusIcon size={16} weight="bold" />,
            onClick: handleCreateNew,
          },
        ]}
        action={
          showCount ? (
            <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
              {t("count", { count: items.length, total })}
            </span>
          ) : undefined
        }
      />

      {showToolbar && (
        <SearchBar
          search={{
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(0);
            },
            placeholder: t("searchPlaceholder"),
            className: "max-w-md",
          }}
          filters={filters}
          actions={
            <ViewToggle
              value={view}
              onChange={setView}
              options={[
                { value: "cards", label: t("view.cards"), icon: <SquaresFourIcon size={14} /> },
                { value: "table", label: t("view.table"), icon: <RowsIcon size={14} /> },
              ]}
            />
          }
        />
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300">
          {t("loadError")}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={<StorefrontIcon size={32} />}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      )}

      {effectiveView === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              onOpen={isMember(b) ? () => handleOpen(b) : undefined}
              onImpersonate={isSuperadmin ? () => handleImpersonate(b) : undefined}
              showActiveBadge={isSuperadmin}
            />
          ))}
        </div>
      ) : (
        <BusinessTable
          businesses={items}
          showOwnerColumn={isSuperadmin && effectiveScope === "all"}
          isMember={isMember}
          onOpen={(id) => {
            const b = items.find((x) => x.id === id);
            if (b) handleOpen(b);
          }}
          onImpersonate={isSuperadmin ? handleImpersonate : undefined}
        />
      )}

      {impersonateTarget && (
        <ImpersonateDialog
          open={!!impersonateTarget}
          onOpenChange={(open) => !open && setImpersonateTarget(null)}
          businessId={impersonateTarget.id}
          businessName={impersonateTarget.name}
        />
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
            {t("pagination.showing", {
              from: page * PAGE_SIZE + 1,
              to: Math.min((page + 1) * PAGE_SIZE, total),
              total,
            })}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              {t("pagination.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
