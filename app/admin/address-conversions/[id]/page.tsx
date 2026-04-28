import { notFound } from "next/navigation";
import { api, getConvexClient } from "../../../../lib/convex-client.ts";
import { formatUpsState } from "../../../../lib/ups-format.ts";
import type { Id } from "../../../../convex/_generated/dataModel";

function buildBackHref(original: {
  name?: string;
  nameKana?: string;
  country: string;
  postalCode: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(original)) {
    if (value) params.set(key, value);
  }

  return `/?${params.toString()}`;
}

function OriginalRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="output-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function formatModelName(model?: string) {
  if (!model) return "GPT-4o-mini";
  if (model.toLowerCase() === "gpt-4o-mini") return "GPT-4o-mini";
  return model;
}

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

  const backHref = buildBackHref(record.original);
  const converted = record.converted
    ? { ...record.converted, state: formatUpsState(record.converted.state) }
    : undefined;

  return (
    <main>
      <div className="topbar">
        <div>
          <div className="eyebrow">UPS Latin output</div>
          <h1>{record.orderId}</h1>
        </div>
        <a className="button link-button" href={backHref}>
          Back
        </a>
      </div>

      <div className="grid">
        <section className="panel stack">
          <h2>Original Japanese address</h2>
          <OriginalRow label="Name" value={record.original.name} />
          <OriginalRow label="Name reading" value={record.original.nameKana} />
          <OriginalRow label="Prefecture" value={record.original.state} />
          <OriginalRow label="City" value={record.original.city} />
          <OriginalRow label="Address Line 1" value={record.original.addressLine1} />
          <OriginalRow label="Address Line 2" value={record.original.addressLine2} />
          <OriginalRow label="Postal code" value={record.original.postalCode} />
          <OriginalRow label="Phone" value={record.original.phone} />
        </section>

        <section className="panel stack">
          <h2>UPS-compatible Latin address</h2>
          {converted ? (
            <>
              <div className="output-row">
                <span>Name</span>
                <strong>{converted.name || "-"}</strong>
              </div>
              <div className="output-row">
                <span>Address Line 1</span>
                <strong>{converted.addressLine1}</strong>
              </div>
              <div className="output-row">
                <span>Address Line 2</span>
                <strong>{converted.addressLine2 || "-"}</strong>
              </div>
              <div className="output-row">
                <span>City</span>
                <strong>{converted.city}</strong>
              </div>
              <div className="output-row">
                <span>State</span>
                <strong>{converted.state}</strong>
              </div>
              <div className="output-row">
                <span>Postal code</span>
                <strong>{converted.postalCode}</strong>
              </div>
              <div className="output-row">
                <span>Country</span>
                <strong>{converted.country}</strong>
              </div>
              <pre className="json-output">{JSON.stringify(converted, null, 2)}</pre>
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
          <div>Model: {formatModelName(record.aiBuildingNameResult.model)}</div>
          <div className="confidence-line">
            <span>Confidence: {record.aiBuildingNameResult.confidence}</span>
            <details className="confidence-help">
              <summary aria-label="Open confidence definition">(i)</summary>
              <div className="confidence-panel">
                <strong>Confidence definition</strong>
                <dl>
                  <dt>high</dt>
                  <dd>
                    GPT believes the Latin output is straightforward and should be usable
                    as-is, with no Japanese characters and room/unit info preserved.
                  </dd>
                  <dt>medium</dt>
                  <dd>
                    Usable-looking output, but the model had some uncertainty, usually
                    because the building name could have multiple readings or styles.
                  </dd>
                  <dt>low</dt>
                  <dd>
                    Risky output, often because Japanese remains, the reading is unclear,
                    or the model could not confidently preserve the building identity.
                  </dd>
                </dl>
              </div>
            </details>
          </div>
        </section>
      ) : null}
    </main>
  );
}
