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
  CreditCardIcon,
  SealCheckIcon,
  GiftIcon,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { StatCard } from "@/components/redesign";
import { GatedFeature } from "@/components/reusables/gated-feature";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { LocationMemberPicker } from "./location-member-picker";
import { getInitials } from "./_initials";
import { ApiError } from "@/api/client";
import {
  useLocationMembers,
  useLocationQR,
  useLocationStats,
  useDeleteLocation,
  useUnassignLocationMember,
} from "@/hooks/use-locations";
import type { Location, LocationStatsRange } from "@/types/location";

interface LocationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessSlug?: string;
  location: Location | null;
  canManageNonPrimary: boolean;
  canUseProFeatures: boolean;
  onDeleted?: () => void;
  onEdit?: () => void;
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
  onEdit,
}: LocationDetailSheetProps) {
  const t = useTranslations("loyaltyProgram.locations.detail");
  const isMobile = useIsMobile();
  // null = follow viewport default (open on desktop, collapsed on mobile);
  //  true/false = user has explicitly toggled.
  const [qrToggled, setQrToggled] = useState<boolean | null>(null);
  const qrOpen = qrToggled ?? !isMobile;
  const [statsRange, setStatsRange] = useState<LocationStatsRange>("7d");
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 p-0",
            isMobile
              ? "max-h-[85vh] rounded-t-2xl border-t-0"
              : "sm:max-w-[520px]"
          )}
        >
          <SheetTitle className="sr-only">{location.name}</SheetTitle>
          <SheetDescription className="sr-only">
            {location.slug}
          </SheetDescription>

          {isMobile && (
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="h-1 w-10 rounded-full bg-[var(--border-dark)] opacity-60" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* ── Sticky compact header ── */}
            <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
              <div className="flex items-center gap-3 px-5 py-4 pr-14">
                <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                  <MapPinIcon
                    className="h-5 w-5 text-[var(--muted-foreground)]"
                    weight="fill"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-[16px] font-bold text-[#1A1A1A] truncate">
                      {location.name}
                    </h2>
                    {isPrimary && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 shrink-0"
                      >
                        {t("primary")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[var(--muted-foreground)] truncate">
                    {location.slug}
                  </p>
                </div>
                {canEditInfo && onEdit && (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={onEdit}
                    className="shrink-0"
                  >
                    <PencilSimpleIcon className="h-3.5 w-3.5" weight="bold" />
                    {t("edit")}
                  </Button>
                )}
              </div>
            </div>

            {/* ── Identity card ── */}
            <Section title={t("info")}>
              <Card hover={false} className="p-4">
                <div className="divide-y divide-[var(--border)]">
                  <IdentityRow
                    label={t("address")}
                    value={location.address?.trim() || t("noAddress")}
                    muted={!location.address?.trim()}
                  />
                  <IdentityRow
                    label={t("coordinates")}
                    value={
                      location.latitude != null && location.longitude != null
                        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : t("noCoordinates")
                    }
                    muted={location.latitude == null}
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--muted-foreground)] mb-1.5">
                    {t("enrollmentUrl")}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="group flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                  >
                    <span className="font-mono text-[12px] text-[#1A1A1A] truncate text-left">
                      {enrollmentUrl}
                    </span>
                    <CopyIcon
                      className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] group-hover:text-[#1A1A1A]"
                      weight="bold"
                    />
                  </button>
                </div>
              </Card>
            </Section>

            {/* ── Stats section ── */}
            <Section title={t("stats")}>
              <GatedFeature
                requiredTier="pro"
                upgradeFrom="locations.stats"
                gatedTitle={t("statsUpsellTitle")}
                gatedDescription={t("statsUpsellDescription")}
              >
                {/* Segmented range picker */}
                <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-[var(--muted)] mb-4">
                  {(["7d", "30d", "90d", "all"] as LocationStatsRange[]).map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStatsRange(r)}
                        className={
                          statsRange === r
                            ? "text-[11px] font-semibold px-3 py-1 rounded-full bg-[var(--card)] text-[#1A1A1A] shadow-sm transition-all"
                            : "text-[11px] font-semibold px-3 py-1 rounded-full text-[var(--muted-foreground)] hover:text-[#1A1A1A] transition-colors"
                        }
                      >
                        {t(`range.${r}`)}
                      </button>
                    )
                  )}
                </div>

                {statsQuery.isLoading ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {[1, 2, 3].map((i) => (
                      <Card
                        key={i}
                        hover={false}
                        className="p-4 h-[110px] animate-pulse"
                      />
                    ))}
                  </div>
                ) : statsQuery.data ? (
                  <>
                    {/* Hero row: 3 prominent StatCards */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <StatCard
                        title={t("totalTransactions")}
                        value={statsQuery.data.total_transactions}
                        icon={<CreditCardIcon className="h-4 w-4" weight="bold" />}
                        tone="accent"
                        delay={0}
                      />
                      <StatCard
                        title={t("stampsAdded")}
                        value={statsQuery.data.stamps_added}
                        icon={<SealCheckIcon className="h-4 w-4" weight="bold" />}
                        tone="info"
                        delay={60}
                      />
                      <StatCard
                        title={t("rewardsRedeemed")}
                        value={statsQuery.data.rewards_redeemed}
                        icon={<GiftIcon className="h-4 w-4" weight="bold" />}
                        tone="warning"
                        delay={120}
                      />
                    </div>
                    {/* Secondary row: 3 compact tiles */}
                    <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                      <SecondaryTile
                        label={t("stampsVoided")}
                        value={statsQuery.data.stamps_voided}
                      />
                      <SecondaryTile
                        label={t("uniqueCustomers")}
                        value={statsQuery.data.unique_customers}
                      />
                      <SecondaryTile
                        label={t("enrolledHere")}
                        value={statsQuery.data.enrolled_here_total}
                        hint={t("allTime")}
                      />
                    </div>
                  </>
                ) : null}
              </GatedFeature>
            </Section>

            {/* ── Members section ── */}
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
                  <Card hover={false} className="p-5 text-center">
                    <p className="text-[12.5px] text-[var(--muted-foreground)]">
                      {t("noMembers")}
                    </p>
                  </Card>
                ) : (
                  <Card hover={false} className="p-1.5">
                    <ul className="divide-y divide-[var(--border)]">
                      {members.map((m) => {
                        const label = m.name || m.email;
                        return (
                          <li
                            key={m.membership_id}
                            className="flex items-center gap-3 px-2.5 py-2.5"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(m.name, m.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#1A1A1A] truncate">
                                {label}
                              </p>
                              <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                                {m.email}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleUnassign(m.membership_id, label)
                              }
                              className="text-[var(--muted-foreground)] opacity-40 hover:opacity-100 hover:text-red-500 transition-colors p-1.5 rounded-md"
                              aria-label={t("unassign")}
                            >
                              <XIcon className="h-3.5 w-3.5" weight="bold" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}
              </GatedFeature>
            </Section>

            {/* ── QR section ── */}
            <Section
              title={t("qr")}
              action={
                <button
                  type="button"
                  onClick={() => setQrToggled(!qrOpen)}
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
                  <Card hover={false} className="p-4">
                    {qrQuery.isLoading && (
                      <p className="text-xs text-[var(--muted-foreground)] text-center py-6">
                        {t("qrLoading")}
                      </p>
                    )}
                    {qrQuery.data?.qr_png_base64 && (
                      <div className="flex flex-col items-center gap-3">
                        <Image
                          src={`data:image/png;base64,${qrQuery.data.qr_png_base64}`}
                          alt={`QR for ${location.name}`}
                          width={180}
                          height={180}
                          className="rounded-md bg-white p-2 border border-[var(--border)]"
                          unoptimized
                        />
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyUrl}
                            className="rounded-full flex-1"
                          >
                            <CopyIcon className="h-3.5 w-3.5" weight="bold" />
                            {t("copyUrl")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadQr}
                            className="rounded-full flex-1"
                          >
                            <DownloadSimpleIcon
                              className="h-3.5 w-3.5"
                              weight="bold"
                            />
                            {t("downloadQr")}
                          </Button>
                        </div>
                      </div>
                    )}
                    {qrQuery.data && !qrQuery.data.qr_png_base64 && (
                      <p className="text-xs text-[var(--muted-foreground)] text-center py-6">
                        {t("qrUnavailable")}
                      </p>
                    )}
                    <div className="flex items-start gap-2 mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-md">
                      <WarningIcon
                        className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0"
                        weight="fill"
                      />
                      <p className="text-[11px] text-amber-700 leading-snug">
                        {t("slugWarning")}
                      </p>
                    </div>
                  </Card>
                )}
              </GatedFeature>
            </Section>

            {/* ── Danger zone ── */}
            {!isPrimary && (
              <Section title={t("dangerZone")} variant="danger">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={!canManageNonPrimary}
                  className="w-full rounded-full"
                >
                  <TrashIcon className="h-4 w-4" weight="bold" />
                  {t("delete")}
                </Button>
                {!canManageNonPrimary && (
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-2 text-center">
                    {t("deleteUpgrade")}
                  </p>
                )}
              </Section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3.5">
                <TrashIcon className="h-5 w-5" weight="bold" />
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
          ? "px-5 py-5 border-t border-red-100 bg-red-50/30"
          : "px-5 py-5"
      }
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function IdentityRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-[12px] text-[var(--muted-foreground)] shrink-0">
        {label}
      </span>
      <span
        className={
          muted
            ? "text-[13px] text-[var(--muted-foreground)] italic text-right"
            : "text-[13px] font-medium text-[#1A1A1A] text-right"
        }
      >
        {value}
      </span>
    </div>
  );
}

function SecondaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="bg-[var(--muted)] rounded-lg p-3">
      <p className="text-[10px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-[18px] font-bold text-[#1A1A1A] tabular-nums leading-none">
        {value}
      </p>
      {hint && (
        <p className="text-[9.5px] text-[var(--muted-foreground)] mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
