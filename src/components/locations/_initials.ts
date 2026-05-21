/** Initials for a 1- or 2-char avatar fallback when only a name and/or
 *  email are available. Used across location-card, location-detail-sheet
 *  and location-member-picker — the existing `lib/card-utils.ts` helper
 *  only takes a single string. */
export function getInitials(name?: string | null, email?: string): string {
  const source = name?.trim() || email || "?";
  return source
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
