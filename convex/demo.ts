import { mutation } from "./_generated/server";

const postalRecords = [
  {
    postalCode: "1600023",
    prefectureJa: "東京都",
    cityJa: "新宿区",
    townJa: "西新宿",
    prefectureLatin: "Tokyo",
    cityLatin: "Shinjuku-ku",
    townLatin: "Nishi-shinjuku"
  },
  {
    postalCode: "1500001",
    prefectureJa: "東京都",
    cityJa: "渋谷区",
    townJa: "神宮前",
    prefectureLatin: "Tokyo",
    cityLatin: "Shibuya-ku",
    townLatin: "Jingumae"
  },
  {
    postalCode: "1830011",
    prefectureJa: "東京都",
    cityJa: "府中市",
    townJa: "白糸台",
    prefectureLatin: "Tokyo",
    cityLatin: "Fuchu-shi",
    townLatin: "Shiraitodai"
  },
  {
    postalCode: "2770026",
    prefectureJa: "千葉県",
    cityJa: "柏市",
    townJa: "大塚町",
    prefectureLatin: "Chiba",
    cityLatin: "Kashiwa-shi",
    townLatin: "Ootsuka-chou"
  },
  {
    postalCode: "2780026",
    prefectureJa: "千葉県",
    cityJa: "野田市",
    townJa: "花井",
    prefectureLatin: "Chiba",
    cityLatin: "Noda-shi",
    townLatin: "Hanai"
  }
];

const demoConversions = [
  {
    orderId: "DEMO-1001",
    status: "converted" as const,
    original: {
      name: "山田 太郎",
      country: "JP",
      postalCode: "1600023",
      state: "東京都",
      city: "新宿区",
      addressLine1: "西新宿六丁目15番1",
      addressLine2: "セントラルパークタワー・ラ・トゥール新宿 1404",
      phone: "+819012345678"
    },
    converted: {
      addressLine1: "6-15-1 Nishi-shinjuku",
      addressLine2: "Central Park Tower La Tour Shinjuku 1404",
      city: "Shinjuku-ku",
      state: "Tokyo",
      postalCode: "1600023",
      country: "JP" as const,
      phone: "+819012345678"
    },
    aiBuildingNameResult: {
      original_building_name: "セントラルパークタワー・ラ・トゥール新宿 1404",
      latin_building_name: "Central Park Tower La Tour Shinjuku",
      ups_address_line2: "Central Park Tower La Tour Shinjuku 1404",
      room_or_floor: "1404",
      confidence: "high" as const,
      needs_review: false,
      reason: "Katakana loanwords restored and room number preserved."
    },
    reviewNotes: "Demo high-confidence conversion."
  },
  {
    orderId: "DEMO-1002",
    status: "needs_review" as const,
    original: {
      country: "JP",
      postalCode: "1500001",
      state: "東京都",
      city: "渋谷区",
      addressLine1: "神宮前3-1-5",
      addressLine2: "青山荘 305"
    },
    converted: {
      addressLine1: "3-1-5 Jingumae",
      addressLine2: "Aoyama-so 305",
      city: "Shibuya-ku",
      state: "Tokyo",
      postalCode: "1500001",
      country: "JP" as const
    },
    aiBuildingNameResult: {
      original_building_name: "青山荘 305",
      latin_building_name: "Aoyama-so",
      ups_address_line2: "Aoyama-so 305",
      room_or_floor: "305",
      confidence: "medium" as const,
      needs_review: true,
      reason: "Kanji building name required inferred reading."
    },
    reviewNotes: "Kanji building name requires human confirmation."
  },
  {
    orderId: "DEMO-1003",
    status: "approved" as const,
    original: {
      country: "JP",
      postalCode: "1830011",
      state: "東京都",
      city: "府中市",
      addressLine1: "白糸台3丁目2-1",
      addressLine2: "マンションA 202"
    },
    converted: {
      addressLine1: "3-2-1 Shiraitodai",
      addressLine2: "Mansion A 202",
      city: "Fuchu-shi",
      state: "Tokyo",
      postalCode: "1830011",
      country: "JP" as const
    },
    reviewNotes: "Demo conversion approved after review.",
    approvedBy: "demo reviewer"
  },
  {
    orderId: "DEMO-1004",
    status: "rejected" as const,
    original: {
      country: "JP",
      postalCode: "9999999",
      state: "東京都",
      city: "不明",
      addressLine1: "不明",
      addressLine2: "確認必要"
    },
    reviewNotes: "Demo rejection: no postal-code match."
  }
];

function definedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T;
}

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    let postalInserted = 0;
    let postalUpdated = 0;
    let conversionsInserted = 0;
    let conversionsUpdated = 0;
    const now = Date.now();

    for (const record of postalRecords) {
      const existing = await ctx.db
        .query("jpRomanZipRecords")
        .withIndex("by_postal_city_town", (q) =>
          q
            .eq("postalCode", record.postalCode)
            .eq("cityJa", record.cityJa)
            .eq("townJa", record.townJa)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, record);
        postalUpdated += 1;
      } else {
        await ctx.db.insert("jpRomanZipRecords", record);
        postalInserted += 1;
      }
    }

    for (const conversion of demoConversions) {
      const existing = await ctx.db
        .query("addressConversions")
        .withIndex("by_orderId", (q) => q.eq("orderId", conversion.orderId))
        .first();

      const patch = definedFields({
        original: conversion.original,
        converted: conversion.converted,
        aiBuildingNameResult: conversion.aiBuildingNameResult,
        status: conversion.status,
        reviewNotes: conversion.reviewNotes,
        approvedBy: conversion.approvedBy,
        updatedAt: now
      });

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        conversionsUpdated += 1;
      } else {
        const conversionId = await ctx.db.insert("addressConversions", {
          orderId: conversion.orderId,
          ...patch,
          createdAt: now
        });
        await ctx.db.insert("addressConversionEvents", {
          conversionId,
          type: "seeded",
          actor: "demo",
          after: {
            status: conversion.status,
            ...definedFields({
              converted: conversion.converted,
              reviewNotes: conversion.reviewNotes
            })
          },
          createdAt: now
        });
        conversionsInserted += 1;
      }
    }

    return {
      postalInserted,
      postalUpdated,
      conversionsInserted,
      conversionsUpdated
    };
  }
});
