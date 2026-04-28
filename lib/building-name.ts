import { containsJapanese, extractRoomOrFloor, isUpsLatinSafe, normalizeJapaneseAddressText } from "./normalize.ts";
import type { BuildingNameConversionResult } from "./types.ts";

export const buildingNameSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "original_building_name",
    "latin_building_name",
    "ups_address_line2",
    "room_or_floor",
    "confidence",
    "needs_review",
    "reason"
  ],
  properties: {
    original_building_name: { type: "string" },
    latin_building_name: { type: "string" },
    ups_address_line2: { type: "string" },
    room_or_floor: { type: ["string", "null"] },
    confidence: { enum: ["high", "medium", "low"] },
    needs_review: { type: "boolean" },
    reason: { type: "string" }
  }
} as const;

const phraseMap: Array<[RegExp, string]> = [
  [/セントラルパーク/g, "Central Park"],
  [/ラ トゥール/g, "La Tour"],
  [/ラ・トゥール/g, "La Tour"],
  [/パークアベニュー/g, "Park Avenue"],
  [/カサ ブルーノ/g, "Casa Bruno"],
  [/カサ・ブルーノ/g, "Casa Bruno"],
  [/サクラハイツ/g, "Sakura Heights"],
  [/マンション/g, "Mansion"],
  [/アパート/g, "Apartment"],
  [/ハイツ/g, "Heights"],
  [/コーポ/g, "Corpo"],
  [/メゾン/g, "Maison"],
  [/ビル/g, "Bldg"],
  [/タワー/g, "Tower"],
  [/レジデンス/g, "Residence"],
  [/荘/g, "-so"],
  [/第一/g, "Daiichi "],
  [/田中/g, "Tanaka"],
  [/青山/g, "Aoyama"],
  [/渋谷/g, "Shibuya"],
  [/新宿/g, "Shinjuku"]
];

export function fallbackConvertBuildingName(addressLine2: string): BuildingNameConversionResult {
  const roomOrFloor = extractRoomOrFloor(addressLine2);
  let converted = normalizeJapaneseAddressText(addressLine2);

  for (const [pattern, replacement] of phraseMap) {
    converted = converted.replace(pattern, replacement);
  }

  converted = converted
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(Mansion|Apartment|Heights|Corpo|Maison|Bldg|Tower|Residence)([A-Z0-9])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\s+-so/g, "-so")
    .replace(/([A-Za-z])-so/g, "$1-so")
    .trim();

  const stillHasJapanese = containsJapanese(converted);
  const safe = converted.length > 0 && isUpsLatinSafe(converted);

  return {
    original_building_name: addressLine2,
    latin_building_name: converted,
    ups_address_line2: converted,
    room_or_floor: roomOrFloor,
    confidence: stillHasJapanese || !safe ? "low" : "medium",
    needs_review: stillHasJapanese || !safe,
    reason: stillHasJapanese
      ? "Fallback conversion could not remove all Japanese characters"
      : "Fallback dictionary conversion; review recommended unless approved by operations"
  };
}

export async function convertBuildingNameWithAI(input: {
  addressLine2: string;
  prefectureLatin?: string;
  cityLatin?: string;
  townLatin?: string;
}): Promise<BuildingNameConversionResult> {
  return fallbackConvertBuildingName(input.addressLine2);
}
