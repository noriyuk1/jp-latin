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
  const upsPayload = converted
    ? {
        addressLine1: converted.addressLine1,
        addressLine2: converted.addressLine2,
        city: converted.city,
        country: converted.country,
        postalCode: converted.postalCode,
        state: converted.state
      }
    : undefined;

  return (
    <main className="output-page">
      <div className="topbar">
        <div>
          <div className="eyebrow">UPS Latin output</div>
          <h1>{record.orderId}</h1>
        </div>
        <a className="button link-button" href={backHref}>
          Back
        </a>
      </div>

      <div className="output-grid">
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
          {upsPayload ? (
            <pre className="json-output">{JSON.stringify(upsPayload, null, 2)}</pre>
          ) : (
            <div className="notice error panel">
              {record.reviewNotes || "No matching postal-code record was found."}
            </div>
          )}
        </section>
      </div>

      <section className="output-explanation" aria-label="How this app works">
        <h2>How this app works</h2>
        <div className="conversion-notes">
          <div>
            <strong>Address database</strong>
            <p>
              <code>addressLine1</code> and <code>city</code> are built from the
              official Japan Post romanized CSV database from post.japanpost.jp.
            </p>
          </div>
          <div>
            <strong>Building-name conversion</strong>
            <p>
              <code>addressLine2</code> is converted by OpenAI through a Convex
              backend action so Japanese building names become UPS-compatible Latin text.
            </p>
            {record.aiBuildingNameResult ? (
              <p className="conversion-meta">
                Model: {formatModelName(record.aiBuildingNameResult.model)}
                <span className="confidence-line">
                  Confidence: {record.aiBuildingNameResult.confidence}
                  <details className="confidence-help">
                    <summary aria-label="Open confidence definition">ℹ️</summary>
                    <div className="confidence-panel">
                      <strong>Confidence definition</strong>
                      <dl>
                        <dt>high</dt>
                        <dd>
                          GPT believes the Latin output is straightforward and should be
                          usable as-is, with no Japanese characters and room/unit info
                          preserved.
                        </dd>
                        <dt>medium</dt>
                        <dd>
                          Usable-looking output, but the model had some uncertainty,
                          usually because the building name could have multiple readings
                          or styles.
                        </dd>
                        <dt>low</dt>
                        <dd>
                          Risky output, often because Japanese remains, the reading is
                          unclear, or the model could not confidently preserve the
                          building identity.
                        </dd>
                      </dl>
                    </div>
                  </details>
                </span>
              </p>
            ) : null}
          </div>
          <div>
            <strong>Name yomigana</strong>
            <p>
              The entered kana reading is converted to Latin letters with{" "}
              <a href="https://github.com/WaniKani/WanaKana">WanaKana</a>. Kanji
              name readings are not guessed automatically.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
