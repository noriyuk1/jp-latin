import { containsJapanese, normalizeJapaneseAddressText } from "./normalize.ts";

export function buildUpsAddressLine1(params: {
  addressLine1: string;
  townJa: string;
  townLatin: string;
}): string {
  const normalized = normalizeJapaneseAddressText(params.addressLine1);
  let streetNumber = normalized;

  if (streetNumber.startsWith(params.townJa)) {
    streetNumber = streetNumber.slice(params.townJa.length).trim();
  }

  if (!streetNumber || streetNumber === normalized) {
    if (normalized.toLowerCase().includes(params.townLatin.toLowerCase())) {
      return normalized;
    }

    return `${normalized} ${params.townLatin}`.trim();
  }

  return `${streetNumber} ${params.townLatin}`.trim();
}

export function getAddressLine1ReviewReasons(addressLine1: string): string[] {
  const reasons: string[] = [];

  if (!/\d+(?:-\d+)+/.test(addressLine1)) {
    reasons.push("Address Line 1 does not include a recognizable street number");
  }

  if (containsJapanese(addressLine1)) {
    reasons.push("Address Line 1 still contains Japanese characters");
  }

  return reasons;
}
