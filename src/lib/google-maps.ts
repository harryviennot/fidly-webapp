import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
  }
  setOptions({ key: apiKey, v: "weekly" });
  configured = true;
}

export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  ensureConfigured();
  return importLibrary("places");
}
