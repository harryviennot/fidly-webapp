"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, MapPinIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/redesign";
import { SearchInput } from "@/components/reusables/search-input";
import { UpsellHero } from "@/components/reusables/upsell";
import { useBusiness } from "@/contexts/business-context";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useLocations } from "@/hooks/use-locations";
import { LocationCard } from "@/components/locations/location-card";
import { LocationEmptyState } from "@/components/locations/location-empty-state";
import { LocationCreateDialog } from "@/components/locations/location-create-dialog";
import { LocationDetailSheet } from "@/components/locations/location-detail-sheet";
import { Card } from "@/components/ui/card";

export default function ProgramLocationsPage() {
  const t = useTranslations("loyaltyProgram.locations");
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const businessId = currentBusiness?.id;
  const businessSlug = currentBusiness?.url_slug;

  const canMultiLocation = hasFeature("locations.multiple");

  // Hooks must be called unconditionally — fetch only for Pro businesses
  // by passing undefined for non-Pro so the query stays disabled.
  const { data: locations, isLoading } = useLocations(
    canMultiLocation ? businessId : undefined
  );

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
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
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: t("addLocation"),
            icon: <PlusIcon className="h-4 w-4" />,
            onClick: () => setCreateOpen(true),
          },
        ]}
      />

      {/* Search bar */}
      {activeLocations.length > 1 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("searchPlaceholder")}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Card key={i} hover={false} className="p-4 h-[100px] animate-pulse" />
          ))}
        </div>
      ) : activeLocations.length <= 1 && !search ? (
        <>
          {activeLocations.length === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LocationCard
                businessId={businessId}
                location={activeLocations[0]}
                onOpen={() => setSelectedId(activeLocations[0].id)}
                onEdit={() => setSelectedId(activeLocations[0].id)}
                onViewQr={() => setSelectedId(activeLocations[0].id)}
                onDelete={() => undefined}
                canManageNonPrimary
                canViewQr
              />
            </div>
          )}
          <LocationEmptyState canAddMore onAdd={() => setCreateOpen(true)} />
        </>
      ) : filtered.length === 0 ? (
        <Card hover={false} className="p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("noMatches")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((loc) => (
            <LocationCard
              key={loc.id}
              businessId={businessId}
              location={loc}
              onOpen={() => setSelectedId(loc.id)}
              onEdit={() => setSelectedId(loc.id)}
              onViewQr={() => setSelectedId(loc.id)}
              onDelete={() => setSelectedId(loc.id)}
              canManageNonPrimary
              canViewQr
            />
          ))}
        </div>
      )}

      <LocationCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        businessId={businessId}
        businessSlug={businessSlug}
      />

      <LocationDetailSheet
        open={sheetOpen}
        onOpenChange={(open) => !open && setSelectedId(null)}
        businessId={businessId}
        businessSlug={businessSlug}
        location={selectedLocation}
        canManageNonPrimary
        canUseProFeatures
        onDeleted={() => setSelectedId(null)}
      />
    </div>
  );
}
