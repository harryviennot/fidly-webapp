import type { CustomerDataCollection, FieldCollectionMode } from "@/types/business";

/** Normalise legacy boolean values to the tri-state collection mode. */
export function normalizeFieldMode(
  value: FieldCollectionMode | boolean | undefined
): FieldCollectionMode {
  if (value === true) return "required";
  if (value === false || value === undefined) return "off";
  return value;
}

export type CollectedField = "name" | "email" | "phone";

/** Reduce a (possibly legacy) data-collection config to which fields are
 *  collected and whether the program runs in anonymous mode (nothing collected).
 *  Shared by the settings editor and the program overview so the two never drift. */
export function summarizeDataCollection(
  collection: CustomerDataCollection | undefined
): { anonymous: boolean; fields: CollectedField[] } {
  const fields: CollectedField[] = [];
  if (normalizeFieldMode(collection?.collect_name) !== "off") fields.push("name");
  if (normalizeFieldMode(collection?.collect_email) !== "off") fields.push("email");
  if (normalizeFieldMode(collection?.collect_phone) !== "off") fields.push("phone");
  return { anonymous: fields.length === 0, fields };
}
