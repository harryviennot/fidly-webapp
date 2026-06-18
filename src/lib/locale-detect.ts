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

// Spanish-speaking regions: Spain (incl. Canary Islands) + major Latin
// American zones. A base "es" pass covers all of them via OS fallback.
const SPANISH_TIMEZONES = new Set([
  "Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta",
  "America/Mexico_City", "America/Monterrey", "America/Cancun", "America/Tijuana",
  "America/Bogota", "America/Lima", "America/Argentina/Buenos_Aires",
  "America/Santiago", "America/Caracas", "America/Guayaquil",
  "America/La_Paz", "America/Asuncion", "America/Montevideo",
  "America/Guatemala", "America/Tegucigalpa", "America/Managua",
  "America/Costa_Rica", "America/Panama", "America/El_Salvador",
  "America/Santo_Domingo", "America/Havana", "America/Puerto_Rico",
]);

export function detectBusinessLocale(fallbackLocale: string): "fr" | "en" | "es" {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && FRENCH_TIMEZONES.has(tz)) return "fr";
    if (tz?.startsWith("America/Montreal")) return "fr";
    if (tz && SPANISH_TIMEZONES.has(tz)) return "es";
  } catch {
    // Intl not available — fall back
  }
  if (fallbackLocale === "fr") return "fr";
  if (fallbackLocale === "es") return "es";
  return "en";
}
