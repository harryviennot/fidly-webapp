const FRENCH_TIMEZONES = new Set([
  "Europe/Paris",
  "Indian/Reunion", "Indian/Mayotte", "Pacific/Noumea", "Pacific/Tahiti",
  "America/Guadeloupe", "America/Martinique", "America/Cayenne",
  "Europe/Brussels", "Europe/Luxembourg",
  "Africa/Dakar", "Africa/Abidjan", "Africa/Bamako", "Africa/Ouagadougou",
  "Africa/Niamey", "Africa/Lome", "Africa/Porto-Novo", "Africa/Conakry",
  "Africa/Brazzaville", "Africa/Kinshasa", "Africa/Lubumbashi",
  "Africa/Douala", "Africa/Libreville", "Africa/Djibouti",
  "Indian/Comoro", "Indian/Antananarivo",
  "America/Port-au-Prince",
]);

export function detectBusinessLocale(fallbackLocale: string): "fr" | "en" {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && FRENCH_TIMEZONES.has(tz)) return "fr";
    if (tz?.startsWith("America/Montreal")) return "fr";
  } catch {
    // Intl not available — fall back
  }
  return fallbackLocale === "fr" ? "fr" : "en";
}
