/**
 * Country list for the business-location picker.
 *
 * Dependency-free: localized names come from the platform's `Intl.DisplayNames`
 * (works in modern browsers and Node ≥ 18 for SSR), flags are derived from the
 * ISO-2 code, so there are no hardcoded name maps to maintain. This is a
 * LOCATION picker — country only, no dial codes (those live in showcase's
 * phone-utils, a separate concern).
 *
 * Mirrors the look/feel of showcase's PhoneInput dropdown: a curated set of
 * priority countries (the markets we actually serve) floats to the top, the
 * rest follow alphabetically by localized name.
 */

/** A country row for the dropdown. `name` is localized to the active locale. */
export interface CountryEntry {
  code: string;
  name: string;
  flag: string;
}

/** Full ISO 3166-1 alpha-2 set (officially assigned). */
// prettier-ignore
const ISO_ALPHA2: readonly string[] = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
];

/** Markets we serve — floated to the top of the list, in this order. */
export const PRIORITY_COUNTRIES: readonly string[] = [
  "FR", "BE", "CH", "CA", "US", "GB", "DE", "ES", "IT", "PT", "NL",
  "MA", "TN", "DZ", "SN", "CI", "CM",
];

/** Convert an ISO-2 code to its flag emoji (e.g. "FR" → "🇫🇷"). */
export function countryToFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const listCache = new Map<string, CountryEntry[]>();

/**
 * The full country list, localized to `locale`, with priority countries on top
 * and the rest sorted alphabetically by their localized name. Cached per locale.
 */
export function getCountryList(locale: string = "fr"): CountryEntry[] {
  const cached = listCache.get(locale);
  if (cached) return cached;

  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    display = null;
  }

  const nameFor = (code: string): string => {
    try {
      return display?.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const all: CountryEntry[] = ISO_ALPHA2.map((code) => ({
    code,
    name: nameFor(code),
    flag: countryToFlag(code),
  })).sort((a, b) => a.name.localeCompare(b.name, locale));

  const prioritySet = new Set(PRIORITY_COUNTRIES);
  const priority = PRIORITY_COUNTRIES.map((code) =>
    all.find((e) => e.code === code)
  ).filter((e): e is CountryEntry => Boolean(e));
  const rest = all.filter((e) => !prioritySet.has(e.code));

  const list = [...priority, ...rest];
  listCache.set(locale, list);
  return list;
}

/** Look up a single entry by code (localized). */
export function getCountryByCode(
  code: string | null | undefined,
  locale: string = "fr"
): CountryEntry | null {
  if (!code) return null;
  return getCountryList(locale).find((e) => e.code === code.toUpperCase()) ?? null;
}

/** True if `code` is a recognized priority market (used to draw the divider). */
export function isPriorityCountry(code: string): boolean {
  return PRIORITY_COUNTRIES.includes(code.toUpperCase());
}

/** Timezone → country, for guessing a sensible default during onboarding. */
const TZ_TO_COUNTRY: Record<string, string> = {
  "Europe/Paris": "FR", "Europe/London": "GB", "America/New_York": "US",
  "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Toronto": "CA", "America/Montreal": "CA", "America/Vancouver": "CA",
  "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Rome": "IT",
  "Europe/Lisbon": "PT", "Europe/Brussels": "BE", "Europe/Zurich": "CH",
  "Europe/Amsterdam": "NL", "Europe/Vienna": "AT", "Europe/Dublin": "IE",
  "Europe/Luxembourg": "LU", "Africa/Casablanca": "MA", "Africa/Tunis": "TN",
  "Africa/Algiers": "DZ", "Africa/Dakar": "SN", "Africa/Abidjan": "CI",
  "Africa/Douala": "CM", "Indian/Reunion": "RE", "America/Guadeloupe": "GP",
  "America/Martinique": "MQ", "America/Cayenne": "GF", "Pacific/Noumea": "NC",
  "Pacific/Tahiti": "PF",
};

/**
 * Best-effort default country for a new business: timezone first, then the
 * region embedded in `navigator.language` (e.g. "fr-FR" → FR), then a language
 * fallback (fr → FR, en → GB) matching the existing-business backfill.
 */
export function detectDefaultCountry(locale: string): string {
  if (typeof window !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz];
    } catch {
      /* ignore */
    }
    try {
      const lang = navigator.language;
      if (lang.includes("-")) {
        const region = lang.split("-")[1].toUpperCase();
        if (ISO_ALPHA2.includes(region)) return region;
      }
    } catch {
      /* ignore */
    }
  }
  if (locale === "es") return "ES";
  return locale === "en" ? "GB" : "FR";
}
