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
  label_es: string | null;
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
  title_es: string | null;
  body_fr: string | null;
  body_en: string | null;
  body_es: string | null;
  sort_order: number;
}

export interface ChangelogRelease {
  id: string;
  version: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_es: string | null;
  body_fr: string | null;
  body_en: string | null;
  body_es: string | null;
  image_url_fr: string | null;
  image_url_en: string | null;
  image_url_es: string | null;
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

/**
 * Resolve a localized triple to the active locale, with a graceful fallback
 * chain: es -> en -> fr, en -> fr, fr as-is.
 */
export function resolveLocale(
  fr: string | null | undefined,
  en: string | null | undefined,
  es: string | null | undefined,
  locale: string
): string {
  const f = (fr && fr.trim()) || "";
  const e = (en && en.trim()) || "";
  const s = (es && es.trim()) || "";
  if (locale === "es") return s || e || f;
  if (locale === "en") return e || f;
  return f;
}
