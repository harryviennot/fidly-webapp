"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  MapPinIcon,
  WarningCircleIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/redesign";
import { SearchInput } from "@/components/reusables/search-input";
import { UpsellHero } from "@/components/reusables/upsell";
import { useBusiness } from "@/contexts/business-context";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useLocations, useLocationStatsBatch } from "@/hooks/use-locations";
import { LocationCard } from "@/components/locations/location-card";
import { LocationAddTile } from "@/components/locations/location-add-tile";
import { LocationEmptyState } from "@/components/locations/location-empty-state";
import { LocationDialog } from "@/components/locations/location-dialog";
import { LocationDetailSheet } from "@/components/locations/location-detail-sheet";
import { Card } from "@/components/ui/card";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ViewportDebugger } from "@/components/dev/viewport-debugger";
import type { Location, LocationStatsBatchRow } from "@/types/location";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; location: Location }
  | null;

export default function ProgramLocationsPage() {
  const t = useTranslations("loyaltyProgram.locations");
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const businessId = currentBusiness?.id;
  const businessSlug = currentBusiness?.url_slug;

  const canMultiLocation = hasFeature("locations.multiple");

  // Hooks must be called unconditionally — fetch only for Pro businesses
  // by passing undefined for non-Pro so the query stays disabled.
  const {
    data: locations,
    isLoading,
    isError,
    refetch,
  } = useLocations(canMultiLocation ? businessId : undefined);
  // One batch call for the whole grid — see useLocationStatsBatch.
  const { data: statsBatch, isLoading: statsLoading } = useLocationStatsBatch(
    canMultiLocation ? businessId : undefined,
    "7d"
  );
  const statsByLocation = useMemo(() => {
    const map = new Map<string, LocationStatsBatchRow>();
    for (const row of statsBatch ?? []) map.set(row.location_id, row);
    return map;
  }, [statsBatch]);

  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sheetOpen = !!selectedId;

  const activeLocations = useMemo(
    () => (locations ?? []).filter((l) => !l.deleted_at),
    [locations]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeLocations;
    return activeLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.slug.toLowerCase().includes(term) ||
        (l.address ?? "").toLowerCase().includes(term)
    );
  }, [activeLocations, search]);

  const selectedLocation = useMemo(
    () => activeLocations.find((l) => l.id === selectedId) ?? null,
    [activeLocations, selectedId]
  );

  if (!businessId) return null;

  // ─── Non-Pro: full-page upsell hero (mirrors the broadcasts starter UX) ──
  if (!canMultiLocation) {
    return (
      <div
        className="flex flex-col gap-[14px] animate-slide-up"
        style={{ animationDelay: "150ms" }}
      >
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <UpsellHero
          icon={<MapPinIcon className="w-7 h-7" weight="fill" />}
          title={t("starter.headline")}
          description={t("starter.description")}
          features={[
            t("starter.features.multiple"),
            t("starter.features.scanners"),
            t("starter.features.segmentation"),
            t("starter.features.analytics"),
          ]}
          ctaLabel={t("starter.cta")}
          upgradeFrom="locations"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 @container">
      {/* <ViewportDebugger label="locations grid" /> */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: t("addLocation"),
            icon: <PlusIcon className="h-4 w-4" />,
            onClick: () => setDialogState({ mode: "create" }),
          },
        ]}
      />

      {/* Search bar — sticky on mobile so it stays in reach when scanning
          a long list of stores. */}
      {activeLocations.length > 1 && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[var(--background)] md:static md:mx-0 md:px-0 md:py-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t("searchPlaceholder")}
            />
          </div>
        </div>
      )}

      {/* Content — grid columns scale with available content width via
          container queries so the layout adapts when the sidebar opens or
          collapses, not only when the viewport changes. */}
      {isError ? (
        <Card flat hover={false} className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <WarningCircleIcon className="h-6 w-6" weight="fill" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {t("error.title")}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("error.description")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-full"
            >
              <ArrowClockwiseIcon className="h-3.5 w-3.5" weight="bold" />
              {t("error.retry")}
            </Button>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 @6xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              flat
              hover={false}
              className="h-[180px] animate-pulse"
            />
          ))}
        </div>
      ) : activeLocations.length === 0 && !search ? (
        <LocationEmptyState
          canAddMore
          onAdd={() => setDialogState({ mode: "create" })}
        />
      ) : activeLocations.length === 1 && !search ? (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 @6xl:grid-cols-3 gap-3">
          <LocationCard
            businessId={businessId}
            location={activeLocations[0]}
            stats={statsByLocation.get(activeLocations[0].id)}
            statsLoading={statsLoading}
            onOpen={() => setSelectedId(activeLocations[0].id)}
            onEdit={() =>
              setDialogState({
                mode: "edit",
                location: activeLocations[0],
              })
            }
            onViewQr={() => setSelectedId(activeLocations[0].id)}
            onDelete={() => setSelectedId(activeLocations[0].id)}
            canManageNonPrimary
            canViewQr
          />
          <LocationAddTile onClick={() => setDialogState({ mode: "create" })} />
        </div>
      ) : filtered.length === 0 ? (
        <Card flat hover={false} className="p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("noMatches")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 @3xl:grid-cols-2 @6xl:grid-cols-3 gap-3">
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              businessId={businessId}
              location={loc}
              stats={statsByLocation.get(loc.id)}
              statsLoading={statsLoading}
              onOpen={() => setSelectedId(loc.id)}
              onEdit={() =>
                setDialogState({ mode: "edit", location: loc })
              }
              onViewQr={() => setSelectedId(loc.id)}
              onDelete={() => setSelectedId(loc.id)}
              canManageNonPrimary
              canViewQr
            />
          ))}
        </div>
      )}

      {dialogState?.mode === "create" && (
        <LocationDialog
          open
          onOpenChange={(open) => !open && setDialogState(null)}
          businessId={businessId}
          businessSlug={businessSlug}
          mode="create"
          isFirstLocation={activeLocations.length === 0}
        />
      )}
      {dialogState?.mode === "edit" && (
        <LocationDialog
          open
          onOpenChange={(open) => !open && setDialogState(null)}
          businessId={businessId}
          businessSlug={businessSlug}
          mode="edit"
          location={dialogState.location}
          canManageNonPrimary
        />
      )}

      <LocationDetailSheet
        open={sheetOpen}
        onOpenChange={(open) => !open && setSelectedId(null)}
        businessId={businessId}
        businessSlug={businessSlug}
        location={selectedLocation}
        canManageNonPrimary
        canUseProFeatures
        onDeleted={() => setSelectedId(null)}
        onEdit={
          selectedLocation
            ? () =>
                setDialogState({ mode: "edit", location: selectedLocation })
            : undefined
        }
      />
    </div>
  );
}
