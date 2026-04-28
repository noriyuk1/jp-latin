import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  jpRomanZipRecords: defineTable({
    postalCode: v.string(),
    prefectureJa: v.string(),
    cityJa: v.string(),
    townJa: v.string(),
    prefectureLatin: v.string(),
    cityLatin: v.string(),
    townLatin: v.string(),
    raw: v.optional(v.any())
  })
    .index("by_postalCode", ["postalCode"])
    .index("by_postal_city_town", ["postalCode", "cityJa", "townJa"]),

  addressConversions: defineTable({
    orderId: v.string(),
    original: v.object({
      name: v.optional(v.string()),
      nameKana: v.optional(v.string()),
      country: v.string(),
      postalCode: v.string(),
      state: v.optional(v.string()),
      city: v.optional(v.string()),
      addressLine1: v.optional(v.string()),
      addressLine2: v.optional(v.string()),
      phone: v.optional(v.string())
    }),
    converted: v.optional(
      v.object({
        name: v.optional(v.string()),
        addressLine1: v.string(),
        addressLine2: v.optional(v.string()),
        city: v.string(),
        state: v.string(),
        postalCode: v.string(),
        country: v.literal("JP"),
        phone: v.optional(v.string())
      })
    ),
    aiBuildingNameResult: v.optional(
      v.object({
        original_building_name: v.string(),
        latin_building_name: v.string(),
        ups_address_line2: v.string(),
        room_or_floor: v.union(v.string(), v.null()),
        confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
        needs_review: v.boolean(),
        reason: v.string()
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("converted"),
      v.literal("needs_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reviewNotes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"]),

  addressConversionEvents: defineTable({
    conversionId: v.id("addressConversions"),
    type: v.union(
      v.literal("created"),
      v.literal("ai_rerun"),
      v.literal("edited"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("customer_confirmation_requested"),
      v.literal("seeded")
    ),
    actor: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    note: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_conversionId", ["conversionId"])
});
