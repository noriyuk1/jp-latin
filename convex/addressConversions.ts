import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  aiBuildingNameResultValidator,
  originalAddressValidator,
  statusValidator,
  upsAddressValidator
} from "./validators";

export const get = query({
  args: {
    id: v.id("addressConversions")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});

export const create = mutation({
  args: {
    orderId: v.string(),
    original: originalAddressValidator,
    converted: v.optional(upsAddressValidator),
    aiBuildingNameResult: v.optional(aiBuildingNameResultValidator),
    status: statusValidator,
    reviewNotes: v.optional(v.string()),
    actor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("addressConversions", {
      orderId: args.orderId,
      original: args.original,
      ...(args.converted ? { converted: args.converted } : {}),
      ...(args.aiBuildingNameResult
        ? { aiBuildingNameResult: args.aiBuildingNameResult }
        : {}),
      status: args.status,
      ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {}),
      createdAt: now,
      updatedAt: now
    });

    await ctx.db.insert("addressConversionEvents", {
      conversionId: id,
      type: "created",
      actor: args.actor || "system",
      after: {
        status: args.status,
        ...(args.converted ? { converted: args.converted } : {}),
        ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {})
      },
      createdAt: now
    });

    return await ctx.db.get(id);
  }
});
