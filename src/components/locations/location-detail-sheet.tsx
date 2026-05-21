"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  MapPinIcon,
  PencilSimpleIcon,
  CopyIcon,
  DownloadSimpleIcon,
  TrashIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GatedFeature } from "@/components/reusables/gated-feature";
import { LocationForm } from "./location-form";
import { LocationMemberPicker } from "./location-member-picker";
import { ApiError } from "@/api/client";
import {
  useLocationMembers,
  useLocationQR,
  useLocationStats,
  useUpdateLocation,
  useDeleteLocation,
  useUnassignLocationMember,
} from "@/hooks/use-locations";
import type {
  Location,
  LocationCreate,
  LocationPatch,
  LocationStatsRange,
} from "@/types/location";

interface LocationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessSlug?: string;
  location: Location | null;
  canManageNonPrimary: boolean;
  canUseProFeatures: boolean;
  onDeleted?: () => void;
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

export function LocationDetailSheet({
  open,
  onOpenChange,
  businessId,
  businessSlug,
  location,
  canManageNonPrimary,
  canUseProFeatures,
  onDeleted,
}: LocationDetailSheetProps) {
  const t = useTranslations("loyaltyProgram.locations.detail");
  const [editing, setEditing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [statsRange, setStatsRange] = useState<LocationStatsRange>("30d");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const update = useUpdateLocation(businessId);
  const remove = useDeleteLocation(businessId);
  const unassign = useUnassignLocationMember(businessId);

  const { data: members } = useLocationMembers(
    businessId,
    location?.id,
    open && !!location
  );
  const qrQuery = useLocationQR(
    businessId,
    location?.id,
    qrOpen && canUseProFeatures
  );
  const statsQuery = useLocationStats(
    businessId,
    location?.id,
    statsRange,
    canUseProFeatures
  );

  if (!location) return null;

  const isPrimary = location.is_primary;
  const canEditInfo = isPrimary || canManageNonPrimary;
  const enrollmentUrl =
    qrQuery.data?.enrollment_url ??
    (businessSlug
      ? `https://app.stampeo.app/${businessSlug}/l/${location.slug}`
      : "");

  const handleSave = async (body: LocationCreate | LocationPatch) => {
    await update.mutateAsync({ locationId: location.id, body });
    toast.success(t("savedToast"));
    setEditing(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(enrollmentUrl);
      toast.success(t("urlCopied"));
    } catch {
      toast.error(t("urlCopyFailed"));
    }
  };

  const handleDownloadQr = () => {
    if (!qrQuery.data?.qr_png_base64) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${qrQuery.data.qr_png_base64}`;
    link.download = `qr-${location.slug}.png`;
    link.click();
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(location.id);
      toast.success(t("deletedToast", { name: location.name }));
      setDeleteOpen(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      if (err instanceof ApiError && err.code === "CANNOT_DELETE_PRIMARY") {
        toast.error(t("cannotDeletePrimary"));
      } else {
        toast.error(err instanceof Error ? err.message : t("deleteFailed"));
      }
    }
  };

  const handleUnassign = (membershipId: string, name: string) => {
    unassign.mutate(
      { locationId: location.id, membershipId },
      {
        onSuccess: () => toast.success(t("unassignedToast", { name })),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("unassignFailed")),
      }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-[460px] overflow-y-auto p-0 gap-0"
        >
          <SheetTitle className="sr-only">{location.name}</SheetTitle>
          <SheetDescription className="sr-only">
            {location.slug}
          </SheetDescription>

          {/* ── Header ── */}
          <div className="px-5 pt-6 pb-5 border-b border-[var(--border)]">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center mb-2.5">
                <MapPinIcon className="h-5 w-5 text-[var(--muted-foreground)]" weight="fill" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[18px] font-bold text-[#1A1A1A]">
                  {location.name}
                </h2>
                {isPrimary && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {t("primary")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] font-mono text-[var(--muted-foreground)]">
                {location.slug}
              </p>
            </div>
          </div>

          {/* ── Info section ── */}
          <Section
            title={t("info")}
            action={
              canEditInfo && !editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[var(--muted-foreground)] hover:text-[#1A1A1A]"
                  aria-label={t("editInfo")}
                >
                  <PencilSimpleIcon className="h-4 w-4" />
                </button>
              ) : null
            }
          >
            {editing ? (
              <LocationForm
                businessId={businessId}
                businessSlug={businessSlug}
                mode="edit"
                initial={location}
                canEditNonPrimary={canManageNonPrimary}
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                <InfoRow
                  label={t("address")}
                  value={location.address?.trim() || t("noAddress")}
                  muted={!location.address?.trim()}
                />
                <InfoRow
                  label={t("coordinates")}
                  value={
                    location.latitude != null && location.longitude != null
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : t("noCoordinates")
                  }
                  muted={location.latitude == null}
                />
                <InfoRow
                  label={t("enrollmentUrl")}
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] truncate max-w-[220px]">
                        {enrollmentUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-[var(--muted-foreground)] hover:text-[#1A1A1A]"
                        aria-label={t("copyUrl")}
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  }
                />
              </div>
            )}
          </Section>

          {/* ── Members section ── */}
          {!editing && (
            <Section
              title={t("members")}
              action={
                canManageNonPrimary || isPrimary ? (
                  <LocationMemberPicker
                    businessId={businessId}
                    locationId={location.id}
                  />
                ) : null
              }
            >
              <GatedFeature
                requiredTier="pro"
                upgradeFrom="locations.members"
                gatedTitle={t("membersUpsellTitle")}
                gatedDescription={t("membersUpsellDescription")}
              >
                {!members || members.length === 0 ? (
                  <p className="text-[12px] text-[var(--muted-foreground)] py-2">
                    {t("noMembers")}
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {members.map((m) => {
                      const label = m.name || m.email;
                      return (
                        <li
                          key={m.membership_id}
                          className="flex items-center gap-2.5 py-2"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={m.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(m.name, m.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-medium text-[#1A1A1A] truncate">
                              {label}
                            </p>
                            <p className="text-[10.5px] text-[var(--muted-foreground)] truncate">
                              {m.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleUnassign(m.membership_id, label)
                            }
                            className="text-[var(--muted-foreground)] opacity-40 hover:opacity-100 hover:text-red-500 transition-colors p-1"
                            aria-label={t("unassign")}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </GatedFeature>
            </Section>
          )}

          {/* ── QR section ── */}
          {!editing && (
            <Section
              title={t("qr")}
              action={
                <button
                  type="button"
                  onClick={() => setQrOpen((v) => !v)}
                  className="text-[var(--muted-foreground)] hover:text-[#1A1A1A] text-[11px] font-semibold"
                >
                  {qrOpen ? t("hide") : t("show")}
                </button>
              }
            >
              <GatedFeature
                requiredTier="pro"
                upgradeFrom="locations.qr"
                gatedTitle={t("qrUpsellTitle")}
                gatedDescription={t("qrUpsellDescription")}
              >
                {qrOpen && (
                  <div className="space-y-2">
                    {qrQuery.isLoading && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {t("qrLoading")}
                      </p>
                    )}
                    {qrQuery.data?.qr_png_base64 && (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Image
                          src={`data:image/png;base64,${qrQuery.data.qr_png_base64}`}
                          alt={`QR for ${location.name}`}
                          width={180}
                          height={180}
                          className="rounded-md bg-white p-2 border border-[var(--border)]"
                          unoptimized
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyUrl}
                            className="rounded-full"
                          >
                            <CopyIcon className="h-3.5 w-3.5" />
                            {t("copyUrl")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadQr}
                            className="rounded-full"
                          >
                            <DownloadSimpleIcon className="h-3.5 w-3.5" />
                            {t("downloadQr")}
                          </Button>
                        </div>
                      </div>
                    )}
                    {qrQuery.data && !qrQuery.data.qr_png_base64 && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {t("qrUnavailable")}
                      </p>
                    )}
                    <div className="flex items-start gap-1.5 mt-2 p-2 bg-amber-50 border border-amber-100 rounded-md">
                      <WarningIcon
                        className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0"
                        weight="fill"
                      />
                      <p className="text-[11px] text-amber-700">
                        {t("slugWarning")}
                      </p>
                    </div>
                  </div>
                )}
              </GatedFeature>
            </Section>
          )}

          {/* ── Stats section ── */}
          {!editing && (
            <Section title={t("stats")}>
              <GatedFeature
                requiredTier="pro"
                upgradeFrom="locations.stats"
                gatedTitle={t("statsUpsellTitle")}
                gatedDescription={t("statsUpsellDescription")}
              >
                <div className="flex gap-1.5 mb-3">
                  {(["7d", "30d", "90d", "all"] as LocationStatsRange[]).map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStatsRange(r)}
                        className={
                          statsRange === r
                            ? "text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#1A1A1A] text-white"
                            : "text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[#1A1A1A]"
                        }
                      >
                        {t(`range.${r}`)}
                      </button>
                    )
                  )}
                </div>
                {statsQuery.isLoading ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("statsLoading")}
                  </p>
                ) : statsQuery.data ? (
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile
                      label={t("totalTransactions")}
                      value={statsQuery.data.total_transactions}
                    />
                    <StatTile
                      label={t("stampsAdded")}
                      value={statsQuery.data.stamps_added}
                    />
                    <StatTile
                      label={t("rewardsRedeemed")}
                      value={statsQuery.data.rewards_redeemed}
                    />
                    <StatTile
                      label={t("stampsVoided")}
                      value={statsQuery.data.stamps_voided}
                    />
                    <StatTile
                      label={t("uniqueCustomers")}
                      value={statsQuery.data.unique_customers}
                    />
                    <StatTile
                      label={t("enrolledHere")}
                      value={statsQuery.data.enrolled_here_total}
                      hint={t("allTime")}
                    />
                  </div>
                ) : null}
              </GatedFeature>
            </Section>
          )}

          {/* ── Danger zone ── */}
          {!editing && !isPrimary && (
            <Section title={t("dangerZone")} variant="danger">
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                disabled={!canManageNonPrimary}
                className="w-full rounded-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
                {t("delete")}
              </Button>
              {!canManageNonPrimary && (
                <p className="text-[11px] text-[var(--muted-foreground)] mt-2 text-center">
                  {t("deleteUpgrade")}
                </p>
              )}
            </Section>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3.5">
                <TrashIcon className="h-5 w-5" />
              </div>
              <AlertDialogTitle>
                {t("deleteTitle", { name: location.name })}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2.5 sm:flex-row">
            <AlertDialogCancel className="flex-1 rounded-full">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 bg-destructive text-white hover:bg-destructive/90"
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Section({
  title,
  action,
  children,
  variant,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={
        variant === "danger"
          ? "px-5 py-4 border-t border-red-100 bg-red-50/30"
          : "px-5 py-4 border-t border-[var(--border)]"
      }
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="text-[12px] text-[var(--muted-foreground)] shrink-0">
        {label}
      </span>
      <span
        className={
          muted
            ? "text-[12.5px] text-[var(--muted-foreground)] italic text-right"
            : "text-[12.5px] font-medium text-[#1A1A1A] text-right"
        }
      >
        {value}
      </span>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="bg-[var(--muted)] rounded-lg p-2.5">
      <p className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-[18px] font-bold text-[#1A1A1A] tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="text-[9.5px] text-[var(--muted-foreground)] mt-0.5">
          {hint}
        </p>
      )}
    </div>
  );
}
