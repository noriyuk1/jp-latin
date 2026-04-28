"use node";

import OpenAI from "openai";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { aiBuildingNameResultValidator } from "./validators";

const buildingNameSchema = {
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

export const convert = action({
  args: {
    addressLine2: v.string(),
    prefectureLatin: v.optional(v.string()),
    cityLatin: v.optional(v.string()),
    townLatin: v.optional(v.string())
  },
  returns: aiBuildingNameResultValidator,
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in Convex");
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: `You convert Japanese building names into UPS-compatible Latin-character address text.
Rules:
- Output Latin letters, numbers, spaces, hyphen, apostrophe, and period only.
- Do not output Japanese characters.
- Preserve the original building identity as much as possible.
- Transliterate katakana building names to readable Latin text. Example: ボンジュール荘 202 -> Bonjour So 202.
- Restore obvious katakana loanwords when possible.
- Do not create an official English translation unless the building is a known public facility with a widely used English name.
- Preserve room numbers, floor numbers, building numbers, and unit numbers exactly.
- Convert common building terms: マンション -> Mansion, アパート -> Apartment, ハイツ -> Heights, コーポ -> Corpo, メゾン -> Maison, ビル -> Bldg, タワー -> Tower, レジデンス -> Residence, 荘 -> So, 階 -> F, 号室 -> remove if the room number remains clear.
- If uncertain, set needs_review to true, but still provide the best Latin-character ups_address_line2.
- Return JSON only.`
        },
        {
          role: "user",
          content: JSON.stringify(args)
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

    const parsed = JSON.parse(response.output_text);
    return {
      ...parsed,
      model,
      reason: `OpenAI GPT conversion via Convex action. ${parsed.reason}`
    };
  }
});
