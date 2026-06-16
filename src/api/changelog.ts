import { API_BASE_URL, getAuthHeaders, extractErrorMessage } from "./client";

export type ChangelogCategory = "feature" | "improvement" | "fix";
export const CATEGORY_ORDER: ChangelogCategory[] = [
  "feature",
  "improvement",
  "fix",
];

export interface ChangelogArea {
  slug: string;
  label_fr: string;
  label_en: string;
  color: string;
  sort_order: number;
}

export interface ChangelogItem {
  id: string;
  category: ChangelogCategory;
  area: string | null;
  affects: string[];
  title_fr: string;
  title_en: string | null;
  body_fr: string | null;
  body_en: string | null;
  sort_order: number;
}

export interface ChangelogRelease {
  id: string;
  version: string | null;
  title_fr: string | null;
  title_en: string | null;
  body_fr: string | null;
  body_en: string | null;
  image_url_fr: string | null;
  image_url_en: string | null;
  published_at: string | null;
  changelog_items: ChangelogItem[];
}

export interface ChangelogRecent {
  releases: ChangelogRelease[];
  unread_count: number;
  last_seen_at: string | null;
  areas: ChangelogArea[];
}

export async function getChangelog(): Promise<ChangelogRecent> {
  const response = await fetch(`${API_BASE_URL}/changelog/recent`, {
    method: "GET",
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, "Failed to load changelog"));
  }
  return response.json();
}

export async function markChangelogSeen(): Promise<{ unread_count: number }> {
  const response = await fetch(`${API_BASE_URL}/changelog/seen`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, "Failed to mark seen"));
  }
  return response.json();
}

/** Resolve a bilingual pair to a locale (EN falls back to FR). */
export function resolveLocale(
  fr: string | null | undefined,
  en: string | null | undefined,
  locale: string
): string {
  if (locale === "en") return (en && en.trim()) || fr || "";
  return fr || "";
}
