const STORAGE_KEY = "recentBusinessAccess";

export type RecentAccessMap = Record<string, number>;

export function getRecentAccess(): RecentAccessMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentAccessMap) : {};
  } catch {
    return {};
  }
}

export function bumpRecentAccess(businessId: string): RecentAccessMap {
  const next = { ...getRecentAccess(), [businessId]: Date.now() };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage might be unavailable (private mode, quota); fail open.
    }
  }
  return next;
}

interface Sortable {
  id: string;
  name: string;
  status?: string;
}

/** Sort businesses (or memberships, by business.id) so the most-recently
 * accessed come first. Items never accessed fall back to active-first,
 * then alphabetical, so the order stays stable. */
export function sortByRecentAccess<T extends Sortable>(
  items: T[],
  recent: RecentAccessMap = getRecentAccess(),
): T[] {
  return [...items].sort((a, b) => {
    const aT = recent[a.id] ?? 0;
    const bT = recent[b.id] ?? 0;
    if (aT !== bT) return bT - aT;
    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return a.name.localeCompare(b.name);
  });
}
