import { NextResponse } from "next/server";
import { api, requireConvexClient, stripUndefined } from "../../../../../lib/convex-client.ts";
import { validateUpsAddressPayload } from "../../../../../lib/validation.ts";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { UpsAddressPayload } from "../../../../../lib/types.ts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const formData = await request.formData();
  const requestedStatus = formData.get("status")?.toString();
  const convex = requireConvexClient();
  const conversionId = id as Id<"addressConversions">;

  if (requestedStatus === "needs_review" || requestedStatus === "rejected") {
    const updated = await convex.mutation(api.addressConversions.setStatus, {
      id: conversionId,
      status: requestedStatus,
      ...(formData.get("reviewNotes")?.toString()
        ? { reviewNotes: formData.get("reviewNotes")?.toString() }
        : {}),
      actor: "internal"
    });
    return updated
      ? NextResponse.redirect(new URL(`/admin/address-conversions/${id}`, request.url))
      : NextResponse.json({ error: "Conversion not found" }, { status: 404 });
  }

  const addressLine2 = formData.get("addressLine2")?.toString().trim();
  const payload: UpsAddressPayload = stripUndefined({
    addressLine1: formData.get("addressLine1")?.toString() || "",
    addressLine2: addressLine2 || undefined,
    city: formData.get("city")?.toString() || "",
    state: formData.get("state")?.toString() || "",
    postalCode: formData.get("postalCode")?.toString() || "",
    country: "JP"
  });
  const validation = validateUpsAddressPayload(payload);

  if (!validation.ok) {
    const updated = await convex.mutation(api.addressConversions.updateConversion, {
      id: conversionId,
      converted: stripUndefined(payload),
      status: "needs_review",
      reviewNotes: validation.reason,
      actor: "internal"
    });
    return updated
      ? NextResponse.redirect(new URL(`/admin/address-conversions/${id}`, request.url))
      : NextResponse.json({ error: "Conversion not found" }, { status: 404 });
  }

  const updated = await convex.mutation(api.addressConversions.approve, {
    id: conversionId,
    converted: stripUndefined(payload),
    ...(formData.get("reviewNotes")?.toString()
      ? { reviewNotes: formData.get("reviewNotes")?.toString() }
      : {}),
    actor: "internal"
  });

  return updated
    ? NextResponse.redirect(new URL(`/admin/address-conversions/${id}`, request.url))
    : NextResponse.json({ error: "Conversion not found" }, { status: 404 });
}
