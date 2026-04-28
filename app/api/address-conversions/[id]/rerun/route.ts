import { NextResponse } from "next/server";
import { convertJapaneseAddressToUpsLatin } from "../../../../../lib/conversion.ts";
import { api, requireConvexClient, stripUndefined } from "../../../../../lib/convex-client.ts";
import { normalizePostalCode } from "../../../../../lib/normalize.ts";
import type { Id } from "../../../../../convex/_generated/dataModel";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const convex = requireConvexClient();
  const conversionId = id as Id<"addressConversions">;
  const record = await convex.query(api.addressConversions.get, { id: conversionId });

  if (!record) {
    return NextResponse.json({ error: "Conversion not found" }, { status: 404 });
  }

  const records = await convex.query(api.jpRomanZipRecords.list, {
    postalCode: normalizePostalCode(record.original.postalCode)
  });
  const result = await convertJapaneseAddressToUpsLatin({
    orderId: record.orderId,
    address: record.original,
    records
  });

  const reviewNotes = result.reviewReasons.join("; ") || result.reason;
  await convex.mutation(api.addressConversions.updateConversion, {
    id: conversionId,
    ...(result.payload ? { converted: stripUndefined(result.payload) } : {}),
    ...(result.aiResult ? { aiBuildingNameResult: stripUndefined(result.aiResult) } : {}),
    status: result.status,
    ...(reviewNotes ? { reviewNotes } : {}),
    actor: "internal"
  });

  return NextResponse.redirect(new URL(`/admin/address-conversions/${id}`, request.url));
}
