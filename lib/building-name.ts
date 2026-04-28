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
  if (!process.env.OPENAI_API_KEY) {
    return fallbackConvertBuildingName(input.addressLine2);
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: `You convert Japanese building names into UPS-compatible Latin-character address text.
Rules:
- Do not create an official English translation.
- The goal is Latin-character formatting for UPS shipping labels.
- Preserve the original building identity as much as possible.
- Prefer transliteration or restoration of obvious katakana loanwords.
- Do not semantically translate Japanese building names unless the building is a known public facility with a widely used English name.
- Preserve room numbers, floor numbers, building numbers, and unit numbers exactly.
- Convert common building terms: マンション -> Mansion, アパート -> Apartment, ハイツ -> Heights, コーポ -> Corpo, メゾン -> Maison, ビル -> Bldg, タワー -> Tower, レジデンス -> Residence, 荘 -> So, 階 -> F, 号室 -> remove if the room number remains clear.
- Do not output Japanese characters in ups_address_line2.
- If uncertain, set needs_review to true.
- Return JSON only.`
      },
      {
        role: "user",
        content: JSON.stringify(input)
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "building_name_conversion",
        strict: true,
        schema: buildingNameSchema
      }
    }
  });

  return JSON.parse(response.output_text) as BuildingNameConversionResult;
}
