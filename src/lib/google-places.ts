import type { AddressComponents } from "@/types/location";

export interface ParsedPlace {
  addressComponents: AddressComponents;
  latitude: number;
  longitude: number;
  placeId: string | null;
}

interface GoogleAddressComponent {
  longText?: string | null;
  shortText?: string | null;
  types?: string[] | null;
}

interface GooglePlace {
  id?: string | null;
  formattedAddress?: string | null;
  addressComponents?: GoogleAddressComponent[] | null;
  location?: { lat: () => number; lng: () => number } | { lat: number; lng: number } | null;
}

function pick(
  components: GoogleAddressComponent[],
  type: string,
  field: "longText" | "shortText" = "longText"
): string | undefined {
  const match = components.find((c) => c.types?.includes(type));
  return match?.[field] ?? undefined;
}

function readLatLng(loc: GooglePlace["location"]): { lat: number; lng: number } | null {
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

export function parseGooglePlace(place: GooglePlace): ParsedPlace | null {
  const coords = readLatLng(place.location);
  if (!coords) return null;

  const components = place.addressComponents ?? [];

  const streetNumber = pick(components, "street_number");
  const route = pick(components, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim() || undefined;

  const city =
    pick(components, "locality") ??
    pick(components, "postal_town") ??
    pick(components, "administrative_area_level_2");

  const addressComponents: AddressComponents = {
    street,
    city,
    postal_code: pick(components, "postal_code"),
    country: pick(components, "country"),
    country_code: pick(components, "country", "shortText"),
    formatted: place.formattedAddress ?? undefined,
  };

  return {
    addressComponents,
    latitude: coords.lat,
    longitude: coords.lng,
    placeId: place.id ?? null,
  };
}
