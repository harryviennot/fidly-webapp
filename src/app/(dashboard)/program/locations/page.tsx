"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, CrownIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/redesign";
import { SearchInput } from "@/components/reusables/search-input";
import { useBusiness } from "@/contexts/business-context";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useLocations } from "@/hooks/use-locations";
import { LocationCard } from "@/components/locations/location-card";
import { LocationEmptyState } from "@/components/locations/location-empty-state";
import { LocationCreateDialog } from "@/components/locations/location-create-dialog";
import { LocationDetailSheet } from "@/components/locations/location-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function ProgramLocationsPage() {
  const t = useTranslations("loyaltyProgram.locations");
  const { currentBusiness } = useBusiness();
  const { hasFeature } = useEntitlements();
  const businessId = currentBusiness?.id;
  const businessSlug = currentBusiness?.url_slug;

  const canMultiLocation = hasFeature("locations.multiple");
  const { data: locations, isLoading } = useLocations(businessId);

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

  // Backend rule: tier check only kicks in when adding a 2nd+ location.
  // First-ever creation is allowed on any tier, but backfill already
  // gave every business their primary, so practically this is always
  // "are you Pro?" in the UI.
  const canAddMore = canMultiLocation || activeLocations.length === 0;

  const selectedLocation = useMemo(
    () => activeLocations.find((l) => l.id === selectedId) ?? null,
    [activeLocations, selectedId]
  );

  if (!businessId) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            <CrownIcon className="w-3 h-3 mr-1" weight="fill" />
            Pro
          </Badge>
        }
        actions={
          canAddMore
            ? [
                {
                  label: t("addLocation"),
                  icon: <PlusIcon className="h-4 w-4" />,
                  onClick: () => setCreateOpen(true),
                },
              ]
            : []
        }
      />

      {/* Upsell banner — shown when user has >=1 location but isn't Pro */}
      {!canMultiLocation && activeLocations.length >= 1 && (
        <Card hover={false} className="p-4 bg-amber-50/40 border-amber-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] text-amber-400 flex items-center justify-center shrink-0">
              <CrownIcon className="h-4 w-4" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5">
                {t("upsellBanner.title")}
              </p>
              <p className="text-[12px] text-[#555] mb-2">
                {t("upsellBanner.description")}
              </p>
              <a
                href="/billing?from=locations.banner"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#1A1A1A]/90 transition-colors"
              >
                {t("upsellBanner.cta")}
              </a>
            </div>
          </div>
        </Card>
      )}

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
                canManageNonPrimary={canMultiLocation}
                canViewQr={canMultiLocation}
              />
            </div>
          )}
          <LocationEmptyState
            canAddMore={canAddMore}
            onAdd={() => setCreateOpen(true)}
          />
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
              canManageNonPrimary={canMultiLocation}
              canViewQr={canMultiLocation}
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
        canManageNonPrimary={canMultiLocation}
        canUseProFeatures={canMultiLocation}
        onDeleted={() => setSelectedId(null)}
      />
    </div>
  );
}
