import { NextResponse } from "next/server";
import { api, requireConvexClient, stripUndefined } from "../../../../../lib/convex-client.ts";
import { parseJapanPostRomanCsv } from "../../../../../lib/japan-post.ts";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const wantsHtml = request.headers.get("accept")?.includes("text/html");
  const csvText = contentType.includes("multipart/form-data")
    ? await readCsvForm(request)
    : await request.text();
  const records = parseJapanPostRomanCsv(csvText);

  if (records.length === 0) {
    if (wantsHtml) {
      return NextResponse.redirect(
        new URL("/admin/japan-post-csv/import?error=no-valid-records", request.url),
        { status: 303 }
      );
    }

    return NextResponse.json(
      { error: "No valid Japan Post romanized records found" },
      { status: 400 }
    );
  }

  const convex = requireConvexClient();
  const result = await convex.mutation(api.jpRomanZipRecords.upsertMany, {
    records: stripUndefined(records)
  });
  if (wantsHtml) {
    return NextResponse.redirect(
      new URL(`/admin/japan-post-csv/import?imported=${result.total}`, request.url),
      { status: 303 }
    );
  }

  return NextResponse.json(result);
}

async function readCsvForm(request: Request): Promise<string> {
  const formData = await request.formData();
  const csvFile = formData.get("csvFile");

  if (csvFile instanceof File && csvFile.size > 0) {
    return await csvFile.text();
  }

  return formData.get("csvText")?.toString() || "";
}
