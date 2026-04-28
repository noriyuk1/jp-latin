import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  aiBuildingNameResultValidator,
  originalAddressValidator,
  statusValidator,
  upsAddressValidator
} from "./validators";

export const list = query({
  args: {
    status: v.optional(statusValidator)
  },
  handler: async (ctx, args) => {
    const records = args.status
      ? await ctx.db
          .query("addressConversions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("addressConversions").collect();

    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const get = query({
  args: {
    id: v.id("addressConversions")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});

export const events = query({
  args: {
    conversionId: v.id("addressConversions")
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("addressConversionEvents")
      .withIndex("by_conversionId", (q) => q.eq("conversionId", args.conversionId))
      .collect();

    return events.sort((a, b) => b.createdAt - a.createdAt);
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

export const approve = mutation({
  args: {
    id: v.id("addressConversions"),
    converted: upsAddressValidator,
    reviewNotes: v.optional(v.string()),
    actor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;

    const now = Date.now();
    await ctx.db.patch(args.id, {
      converted: args.converted,
      status: "approved",
      ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {}),
      approvedBy: args.actor || "internal",
      updatedAt: now
    });

    await ctx.db.insert("addressConversionEvents", {
      conversionId: args.id,
      type: existing.converted ? "edited" : "approved",
      actor: args.actor || "internal",
      before: {
        status: existing.status,
        converted: existing.converted,
        reviewNotes: existing.reviewNotes
      },
      after: {
        status: "approved",
        converted: args.converted,
        ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {})
      },
      createdAt: now
    });

    return await ctx.db.get(args.id);
  }
});

export const setStatus = mutation({
  args: {
    id: v.id("addressConversions"),
    status: v.union(v.literal("needs_review"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
    actor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {}),
      updatedAt: now
    });

    await ctx.db.insert("addressConversionEvents", {
      conversionId: args.id,
      type: args.status === "rejected" ? "rejected" : "customer_confirmation_requested",
      actor: args.actor || "internal",
      before: {
        status: existing.status,
        reviewNotes: existing.reviewNotes
      },
      after: {
        status: args.status,
        ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {})
      },
      createdAt: now
    });

    return await ctx.db.get(args.id);
  }
});

export const updateConversion = mutation({
  args: {
    id: v.id("addressConversions"),
    converted: v.optional(upsAddressValidator),
    aiBuildingNameResult: v.optional(aiBuildingNameResultValidator),
    status: statusValidator,
    reviewNotes: v.optional(v.string()),
    actor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;

    const now = Date.now();
    await ctx.db.patch(args.id, {
      ...(args.converted ? { converted: args.converted } : {}),
      ...(args.aiBuildingNameResult
        ? { aiBuildingNameResult: args.aiBuildingNameResult }
        : {}),
      status: args.status,
      ...(args.reviewNotes ? { reviewNotes: args.reviewNotes } : {}),
      updatedAt: now
    });

    await ctx.db.insert("addressConversionEvents", {
      conversionId: args.id,
      type: "ai_rerun",
      actor: args.actor || "system",
      before: {
        status: existing.status,
        converted: existing.converted,
        aiBuildingNameResult: existing.aiBuildingNameResult
      },
      after: {
        status: args.status,
        ...(args.converted ? { converted: args.converted } : {}),
        ...(args.aiBuildingNameResult
          ? { aiBuildingNameResult: args.aiBuildingNameResult }
          : {})
      },
      createdAt: now
    });

    return await ctx.db.get(args.id);
  }
});
