import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { jpRomanZipRecordValidator } from "./validators";

export const list = query({
  args: {
    postalCode: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    if (args.postalCode) {
      const postalCode = args.postalCode;
      return await ctx.db
        .query("jpRomanZipRecords")
        .withIndex("by_postalCode", (q) => q.eq("postalCode", postalCode))
        .collect();
    }

    return await ctx.db.query("jpRomanZipRecords").take(500);
  }
});

export const upsertMany = mutation({
  args: {
    records: v.array(jpRomanZipRecordValidator)
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const record of args.records) {
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
        updated += 1;
      } else {
        await ctx.db.insert("jpRomanZipRecords", record);
        inserted += 1;
      }
    }

    return { inserted, updated, total: args.records.length };
  }
});
