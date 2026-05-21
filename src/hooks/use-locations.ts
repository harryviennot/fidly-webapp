/**
 * Multi-location React Query hooks.
 *
 * Invalidation matrix (mirrors plan §1 — keep in sync if mutations grow):
 *
 *   createLocation       → locations.all
 *   updateLocation       → locations.all + locations.detail + locations.qr
 *   updateLocation(prim) → locations.all + ALL detail keys (single-primary invariant)
 *   deleteLocation       → locations.all + detail + members + assignmentsByMember
 *                          + transactions.* + activity.*
 *   assignMember         → locations.members(loc) + locations.assignmentsByMember
 *   unassignMember       → same as assignMember
 *
 * Optimistic updates are used only for low-stakes chip toggles
 * (member assign/unassign on the team page). CRUD on the entity itself
 * stays pessimistic + toast on success/failure.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getLocations,
  getLocationMembers,
  getLocationStats,
  getLocationQR,
  createLocation,
  updateLocation,
  deleteLocation,
  assignLocationMember,
  unassignLocationMember,
  checkLocationSlugAvailability,
} from "@/api";
import { patchTransactionLocation } from "@/api/transactions";
import type {
  Location,
  LocationCreate,
  LocationPatch,
  LocationMember,
  LocationStatsRange,
  LocationStats,
  LocationQRResponse,
  SlugAvailabilityResponse,
} from "@/types/location";

export const locationKeys = {
  all: (businessId: string) => ["locations", businessId] as const,
  list: (businessId: string) => ["locations", businessId, "list"] as const,
  detail: (businessId: string, locationId: string) =>
    ["locations", businessId, "detail", locationId] as const,
  members: (businessId: string, locationId: string) =>
    ["locations", businessId, "members", locationId] as const,
  stats: (businessId: string, locationId: string, range: LocationStatsRange) =>
    ["locations", businessId, "stats", locationId, range] as const,
  qr: (businessId: string, locationId: string) =>
    ["locations", businessId, "qr", locationId] as const,
  slugCheck: (businessId: string, slug: string, excludeId?: string) =>
    ["locations", businessId, "slugCheck", slug, excludeId ?? null] as const,
  assignmentsByMember: (businessId: string) =>
    ["locations", businessId, "assignmentsByMember"] as const,
};

/** Invalidate the entire location surface and every downstream query that
 *  may surface location data (transactions, activity feeds, customer
 *  enriched rows). Used after delete or primary-swap. */
function invalidateLocationSurface(qc: QueryClient, businessId: string) {
  qc.invalidateQueries({ queryKey: ["locations", businessId] });
  qc.invalidateQueries({ queryKey: ["transactions", businessId] });
  qc.invalidateQueries({ queryKey: ["activity", businessId] });
  qc.invalidateQueries({ queryKey: ["customers", businessId] });
}

// ─── Queries ────────────────────────────────────────────────────────

export function useLocations(businessId: string | undefined) {
  return useQuery({
    queryKey: locationKeys.list(businessId ?? ""),
    queryFn: () => getLocations(businessId!),
    enabled: !!businessId,
  });
}

export function useLocation(
  businessId: string | undefined,
  locationId: string | undefined
) {
  return useQuery({
    queryKey: locationKeys.detail(businessId ?? "", locationId ?? ""),
    queryFn: () =>
      getLocations(businessId!).then(
        (list) => list.find((l) => l.id === locationId) ?? null
      ),
    enabled: !!businessId && !!locationId,
  });
}

export function useLocationMembers(
  businessId: string | undefined,
  locationId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: locationKeys.members(businessId ?? "", locationId ?? ""),
    queryFn: () => getLocationMembers(businessId!, locationId!),
    enabled: enabled && !!businessId && !!locationId,
  });
}

export function useLocationStats(
  businessId: string | undefined,
  locationId: string | undefined,
  range: LocationStatsRange,
  enabled = true
) {
  return useQuery<LocationStats>({
    queryKey: locationKeys.stats(businessId ?? "", locationId ?? "", range),
    queryFn: () => getLocationStats(businessId!, locationId!, range),
    enabled: enabled && !!businessId && !!locationId,
  });
}

export function useLocationQR(
  businessId: string | undefined,
  locationId: string | undefined,
  enabled = true
) {
  return useQuery<LocationQRResponse>({
    queryKey: locationKeys.qr(businessId ?? "", locationId ?? ""),
    queryFn: () => getLocationQR(businessId!, locationId!),
    enabled: enabled && !!businessId && !!locationId,
    staleTime: 5 * 60 * 1000, // QR is stable until slug changes
  });
}

/** Debounced slug-availability check. The caller should debounce the slug
 *  value (e.g. with a 300ms timer) before passing it in to avoid hammering
 *  the endpoint on every keystroke. */
export function useSlugCheck(
  businessId: string | undefined,
  slug: string,
  excludeId?: string
) {
  return useQuery<SlugAvailabilityResponse>({
    queryKey: locationKeys.slugCheck(businessId ?? "", slug, excludeId),
    queryFn: () => checkLocationSlugAvailability(businessId!, slug, excludeId),
    enabled: !!businessId && slug.trim().length > 0,
    staleTime: 30_000,
  });
}

/**
 * Inverse of `getLocationMembers`: for the team page, we want
 * `membershipId → Location[]`. The backend doesn't surface this directly,
 * so we fan out: fetch all locations, then fetch members for each in
 * parallel. Acceptable at v1 because location counts are small (cap ~10).
 *
 * Future optimization: ask backend to embed `assigned_location_ids` on
 * MembershipWithUser to make this a single round-trip.
 */
export function useLocationAssignmentsByMember(businessId: string | undefined) {
  return useQuery({
    queryKey: locationKeys.assignmentsByMember(businessId ?? ""),
    queryFn: async () => {
      const locations = await getLocations(businessId!);
      const pairs = await Promise.all(
        locations.map(async (loc) => {
          const members = await getLocationMembers(businessId!, loc.id);
          return { location: loc, members };
        })
      );
      const byMember = new Map<string, Location[]>();
      for (const { location, members } of pairs) {
        for (const m of members) {
          const existing = byMember.get(m.membership_id) ?? [];
          existing.push(location);
          byMember.set(m.membership_id, existing);
        }
      }
      return byMember;
    },
    enabled: !!businessId,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────

export function useCreateLocation(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LocationCreate) => createLocation(businessId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: locationKeys.all(businessId!) });
    },
  });
}

export function useUpdateLocation(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      body,
    }: {
      locationId: string;
      body: LocationPatch;
    }) => updateLocation(businessId!, locationId, body),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: locationKeys.all(businessId!) });
      // Slug change invalidates the QR (URL embedded).
      qc.invalidateQueries({
        queryKey: locationKeys.qr(businessId!, vars.locationId),
      });
      // Primary flip: every other location's is_primary flipped — purge
      // detail keys for the business.
      if (updated.is_primary === true) {
        qc.invalidateQueries({
          queryKey: ["locations", businessId!, "detail"],
        });
      }
    },
  });
}

export function useDeleteLocation(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) =>
      deleteLocation(businessId!, locationId),
    onSuccess: () => {
      // Full surface invalidate: assignments cleared, transaction filters
      // shift (location → __none__ for affected rows in future activity).
      invalidateLocationSurface(qc, businessId!);
    },
  });
}

export function useAssignLocationMember(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      membershipId,
    }: {
      locationId: string;
      membershipId: string;
    }) => assignLocationMember(businessId!, locationId, membershipId),
    onMutate: async ({ locationId, membershipId }) => {
      // Optimistic update: insert the membership into both the per-location
      // member list and the inverse map. Real values get reconciled on
      // settle.
      await qc.cancelQueries({
        queryKey: locationKeys.members(businessId!, locationId),
      });
      await qc.cancelQueries({
        queryKey: locationKeys.assignmentsByMember(businessId!),
      });
      const previousByMember = qc.getQueryData<Map<string, Location[]>>(
        locationKeys.assignmentsByMember(businessId!)
      );
      if (previousByMember) {
        const locations = qc.getQueryData<Location[]>(
          locationKeys.list(businessId!)
        );
        const loc = locations?.find((l) => l.id === locationId);
        if (loc) {
          const next = new Map(previousByMember);
          const existing = next.get(membershipId) ?? [];
          if (!existing.some((l) => l.id === locationId)) {
            next.set(membershipId, [...existing, loc]);
          }
          qc.setQueryData(
            locationKeys.assignmentsByMember(businessId!),
            next
          );
        }
      }
      return { previousByMember };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousByMember) {
        qc.setQueryData(
          locationKeys.assignmentsByMember(businessId!),
          ctx.previousByMember
        );
      }
    },
    onSettled: (_data, _err, { locationId }) => {
      qc.invalidateQueries({
        queryKey: locationKeys.members(businessId!, locationId),
      });
      qc.invalidateQueries({
        queryKey: locationKeys.assignmentsByMember(businessId!),
      });
    },
  });
}

export function useUnassignLocationMember(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      membershipId,
    }: {
      locationId: string;
      membershipId: string;
    }) => unassignLocationMember(businessId!, locationId, membershipId),
    onMutate: async ({ locationId, membershipId }) => {
      await qc.cancelQueries({
        queryKey: locationKeys.members(businessId!, locationId),
      });
      await qc.cancelQueries({
        queryKey: locationKeys.assignmentsByMember(businessId!),
      });
      const previousByMember = qc.getQueryData<Map<string, Location[]>>(
        locationKeys.assignmentsByMember(businessId!)
      );
      if (previousByMember) {
        const next = new Map(previousByMember);
        const existing = next.get(membershipId) ?? [];
        next.set(
          membershipId,
          existing.filter((l) => l.id !== locationId)
        );
        qc.setQueryData(
          locationKeys.assignmentsByMember(businessId!),
          next
        );
      }
      const previousMembers = qc.getQueryData<LocationMember[]>(
        locationKeys.members(businessId!, locationId)
      );
      if (previousMembers) {
        qc.setQueryData(
          locationKeys.members(businessId!, locationId),
          previousMembers.filter((m) => m.membership_id !== membershipId)
        );
      }
      return { previousByMember, previousMembers };
    },
    onError: (_err, { locationId }, ctx) => {
      if (ctx?.previousByMember) {
        qc.setQueryData(
          locationKeys.assignmentsByMember(businessId!),
          ctx.previousByMember
        );
      }
      if (ctx?.previousMembers) {
        qc.setQueryData(
          locationKeys.members(businessId!, locationId),
          ctx.previousMembers
        );
      }
    },
    onSettled: (_data, _err, { locationId }) => {
      qc.invalidateQueries({
        queryKey: locationKeys.members(businessId!, locationId),
      });
      qc.invalidateQueries({
        queryKey: locationKeys.assignmentsByMember(businessId!),
      });
    },
  });
}

export function usePatchTransactionLocation(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      locationId,
    }: {
      transactionId: string;
      locationId: string | null;
    }) => patchTransactionLocation(businessId!, transactionId, locationId),
    onSuccess: (txn) => {
      qc.invalidateQueries({ queryKey: ["transactions", businessId!] });
      qc.invalidateQueries({ queryKey: ["activity", businessId!] });
      if (txn.customer_id) {
        qc.invalidateQueries({
          queryKey: ["transactions", businessId!, txn.customer_id],
        });
      }
      // Per-location aggregates shift on both sides of the move.
      qc.invalidateQueries({
        queryKey: ["locations", businessId!, "stats"],
      });
    },
  });
}
