import { containsJapanese, extractRoomOrFloor, isUpsLatinSafe } from "./normalize.ts";
import type { UpsAddressPayload } from "./types.ts";

export type ValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; reason: string; warnings: string[] };

export function validateUpsAddressPayload(
  payload: Partial<UpsAddressPayload>,
  originalAddressLine2?: string
): ValidationResult {
  const warnings: string[] = [];

  if (payload.country !== "JP") {
    return { ok: false, reason: "Country must be JP", warnings };
  }

  if (!payload.postalCode) {
    return { ok: false, reason: "Postal code is required", warnings };
  }

  if (!payload.addressLine1) {
    return { ok: false, reason: "Address Line 1 is required", warnings };
  }

  if (!payload.city) {
    return { ok: false, reason: "City is required", warnings };
  }

  if (!payload.state) {
    return { ok: false, reason: "State / prefecture is required", warnings };
  }

  const fields = [
    payload.name || "",
    payload.addressLine1,
    payload.addressLine2 || "",
    payload.city,
    payload.state,
    payload.postalCode,
    payload.country,
    payload.phone || ""
  ];
  const combined = fields.join(" ");

  if (containsJapanese(combined)) {
    return { ok: false, reason: "UPS payload contains Japanese characters", warnings };
  }

  for (const field of fields) {
    if (field && !isUpsLatinSafe(field)) {
      return {
        ok: false,
        reason: `UPS payload contains unsupported characters: ${field}`,
        warnings
      };
    }
  }

  if (originalAddressLine2) {
    const originalRoomOrFloor = extractRoomOrFloor(originalAddressLine2);
    if (originalRoomOrFloor && !(payload.addressLine2 || "").includes(originalRoomOrFloor)) {
      warnings.push("Room number or floor number may have been dropped from Address Line 2");
    }
  }

  return { ok: true, warnings };
}
