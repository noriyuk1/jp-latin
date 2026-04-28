import { notFound } from "next/navigation";
import { api, getConvexClient } from "../../../../lib/convex-client.ts";
import type { Id } from "../../../../convex/_generated/dataModel";

export default async function AddressConversionReviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const convex = getConvexClient();

  if (!convex) {
    return (
      <main>
        <section className="panel stack">
          <h1>Convex is not configured</h1>
          <div className="muted">Set NEXT_PUBLIC_CONVEX_URL before opening conversion records.</div>
        </section>
      </main>
    );
  }

  const conversionId = id as Id<"addressConversions">;
  const record = await convex.query(api.addressConversions.get, { id: conversionId });

  if (!record) notFound();

  return (
    <main>
      <div className="topbar">
        <div>
          <div className="eyebrow">UPS Latin output</div>
          <h1>{record.orderId}</h1>
        </div>
        <a className="button link-button" href="/">
          Convert another
        </a>
      </div>

      <div className="grid">
        <section className="panel stack">
          <h2>Original Japanese address</h2>
          <div>{record.original.name}</div>
          <div>{record.original.nameKana}</div>
          <div>{record.original.state}</div>
          <div>{record.original.city}</div>
          <div>{record.original.addressLine1}</div>
          <div>{record.original.addressLine2}</div>
          <div>{record.original.postalCode}</div>
          <div>{record.original.phone}</div>
        </section>

        <section className="panel stack">
          <h2>UPS-compatible Latin address</h2>
          {record.converted ? (
            <>
              <div className="output-row">
                <span>Name</span>
                <strong>{record.converted.name || "-"}</strong>
              </div>
              <div className="output-row">
                <span>Address Line 1</span>
                <strong>{record.converted.addressLine1}</strong>
              </div>
              <div className="output-row">
                <span>Address Line 2</span>
                <strong>{record.converted.addressLine2 || "-"}</strong>
              </div>
              <div className="output-row">
                <span>City</span>
                <strong>{record.converted.city}</strong>
              </div>
              <div className="output-row">
                <span>State</span>
                <strong>{record.converted.state}</strong>
              </div>
              <div className="output-row">
                <span>Postal code</span>
                <strong>{record.converted.postalCode}</strong>
              </div>
              <div className="output-row">
                <span>Country</span>
                <strong>{record.converted.country}</strong>
              </div>
              <pre className="json-output">{JSON.stringify(record.converted, null, 2)}</pre>
            </>
          ) : (
            <div className="notice error panel">
              {record.reviewNotes || "No matching postal-code record was found."}
            </div>
          )}
        </section>
      </div>

      {record.aiBuildingNameResult ? (
        <section className="panel stack" style={{ marginTop: 16 }}>
          <h2>Building-name conversion</h2>
          <div>{record.aiBuildingNameResult.reason}</div>
          <div>Confidence: {record.aiBuildingNameResult.confidence}</div>
          <div>Model output: {record.aiBuildingNameResult.ups_address_line2}</div>
        </section>
      ) : null}
    </main>
  );
}
