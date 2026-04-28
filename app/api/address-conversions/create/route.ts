import { NextResponse } from "next/server";
import { convertJapaneseAddressToUpsLatin } from "../../../../lib/conversion.ts";
import { api, requireConvexClient, stripUndefined } from "../../../../lib/convex-client.ts";
import { normalizePostalCode } from "../../../../lib/normalize.ts";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const wantsHtml = request.headers.get("accept")?.includes("text/html");
  const body = contentType.includes("application/json")
    ? await request.json()
    : await readAddressForm(request);

  if (!body.orderId || !body.original) {
    return NextResponse.json(
      { error: "orderId and original address are required" },
      { status: 400 }
    );
  }

  const convex = requireConvexClient();
  const postalCode = normalizePostalCode(body.original.postalCode || "");
  const records = await convex.query(api.jpRomanZipRecords.list, { postalCode });
  const result = await convertJapaneseAddressToUpsLatin({
    orderId: body.orderId,
    address: body.original,
    records,
    convertBuildingName: (input) => convex.action(api.buildingNames.convert, input)
  });

  const reviewNotes = result.reviewReasons.join("; ") || result.reason;
  const record = await convex.mutation(api.addressConversions.create, {
    orderId: body.orderId,
    original: stripUndefined(body.original),
    ...(result.payload ? { converted: stripUndefined(result.payload) } : {}),
    ...(result.aiResult ? { aiBuildingNameResult: stripUndefined(result.aiResult) } : {}),
    status: result.status,
    ...(reviewNotes ? { reviewNotes } : {}),
    actor: "api"
  });

  if (wantsHtml && record?._id) {
    return NextResponse.redirect(
      new URL(`/admin/address-conversions/${record._id}`, request.url),
      { status: 303 }
    );
  }

  return NextResponse.json(record, { status: 201 });
}

async function readAddressForm(request: Request) {
  const formData = await request.formData();
  const orderId =
    formData.get("orderId")?.toString().trim() ||
    `MANUAL-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;

  return {
    orderId,
    original: {
      name: formData.get("name")?.toString().trim() || undefined,
      nameKana: formData.get("nameKana")?.toString().trim() || undefined,
      country: formData.get("country")?.toString().trim() || "JP",
      postalCode: formData.get("postalCode")?.toString().trim() || "",
      state: formData.get("state")?.toString().trim() || undefined,
      city: formData.get("city")?.toString().trim() || undefined,
      addressLine1: formData.get("addressLine1")?.toString().trim() || undefined,
      addressLine2: formData.get("addressLine2")?.toString().trim() || undefined,
      phone: formData.get("phone")?.toString().trim() || undefined
    }
  };
}
