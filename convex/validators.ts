import { v } from "convex/values";

export const statusValidator = v.union(
  v.literal("pending"),
  v.literal("converted"),
  v.literal("needs_review"),
  v.literal("approved"),
  v.literal("rejected")
);

export const confidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

export const originalAddressValidator = v.object({
  name: v.optional(v.string()),
  nameKana: v.optional(v.string()),
  country: v.string(),
  postalCode: v.string(),
  state: v.optional(v.string()),
  city: v.optional(v.string()),
  addressLine1: v.optional(v.string()),
  addressLine2: v.optional(v.string()),
  phone: v.optional(v.string())
});

export const upsAddressValidator = v.object({
  name: v.optional(v.string()),
  addressLine1: v.string(),
  addressLine2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  country: v.literal("JP"),
  phone: v.optional(v.string())
});

export const aiBuildingNameResultValidator = v.object({
  original_building_name: v.string(),
  latin_building_name: v.string(),
  ups_address_line2: v.string(),
  room_or_floor: v.union(v.string(), v.null()),
  confidence: confidenceValidator,
  needs_review: v.boolean(),
  reason: v.string()
});

export const jpRomanZipRecordValidator = v.object({
  postalCode: v.string(),
  prefectureJa: v.string(),
  cityJa: v.string(),
  townJa: v.string(),
  prefectureLatin: v.string(),
  cityLatin: v.string(),
  townLatin: v.string(),
  raw: v.optional(v.any())
});
