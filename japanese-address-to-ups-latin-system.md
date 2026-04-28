# Internal System: Convert Japanese Shipping Addresses to UPS-Compatible Latin Characters

## 1. Purpose

Build an internal system that converts Japanese shipping address data into UPS-compatible Latin-character address data.

The goal is **not** to create a perfect official English translation. The goal is to create a readable, shipping-safe Latin-character representation that helps avoid UPS shipping issues.

This system should support:

- Japanese address data collected from the existing checkout / Stripe Address Element
- Conversion of Japanese postal-code address data into Latin characters
- Conversion of Japanese building names into UPS-compatible Latin characters
- Validation that the final UPS payload does not contain Japanese characters
- Optional internal human review before UPS shipment creation

---

## 2. Recommended Tech Stack

Use the existing product stack where possible:

- **Frontend:** React + Next.js
- **Backend:** Next.js Route Handlers / Server Actions
- **Database / internal workflow:** Convex, if useful
- **Address data source:** Japan Post Romanized postal-code CSV
- **Building-name conversion:** GPT-4o-mini or another configurable OpenAI model
- **Human review:** Optional internal review screen

---

## 3. Key Data Sources

### 3.1 Address excluding building name

Use Japan Post Romanized postal-code CSV:

https://www.post.japanpost.jp/zipcode/dl/roman-zip.html

This is a downloadable CSV file containing Romanized Japanese postal-code address data. It should be imported into an internal database or indexed data file.

Use this for:

- Prefecture
- City / ward / municipality
- Town / area name
- Romanized equivalents of the above

Do **not** expect this CSV to solve:

- Building names
- Room numbers
- Floor numbers
- Customer-entered free-form Address Line 2

### 3.2 Building name

Use AI-generated Latin-character formatting, with optional human review.

Important note:

> Most Japanese building names do not have an official Latin version, as they are originally named in Japanese. The goal is **not** to create an official English translation, but to create UPS-compatible Latin-character formatting to avoid shipping issues.

---

## 4. High-Level Architecture

```text
Checkout / Stripe Address Element
        ↓
Store original Japanese shipping address
        ↓
Address conversion job
        ↓
Japan Post Romanized CSV lookup for postal-code-level address
        ↓
Address Line 1 normalization and formatting
        ↓
AI conversion for Address Line 2 / building name
        ↓
Validation: no Japanese characters in UPS payload
        ↓
Optional internal review / edit / approval
        ↓
Create UPS shipment with Latin-character address
```

---

## 5. Input and Output

### 5.1 Input example

```json
{
  "name": "山田 太郎",
  "country": "JP",
  "postalCode": "1600023",
  "state": "東京都",
  "city": "新宿区",
  "addressLine1": "西新宿六丁目15番1",
  "addressLine2": "セントラルパークタワー・ラ・トゥール新宿 1404",
  "phone": "+819012345678"
}
```

### 5.2 Output example for UPS

```json
{
  "name": "YAMADA TARO",
  "addressLine1": "6-15-1 Nishi-shinjuku",
  "addressLine2": "Central Park Tower La Tour Shinjuku 1404",
  "city": "Shinjuku-ku",
  "state": "Tokyo",
  "postalCode": "1600023",
  "country": "JP",
  "phone": "+819012345678"
}
```

---

## 6. Database Design

Convex is optional, but useful for import jobs, conversion records, and review workflows.

### 6.1 Suggested Convex tables

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  jpRomanZipRecords: defineTable({
    postalCode: v.string(),
    prefectureJa: v.string(),
    cityJa: v.string(),
    townJa: v.string(),
    prefectureLatin: v.string(),
    cityLatin: v.string(),
    townLatin: v.string(),
    raw: v.optional(v.any()),
  })
    .index("by_postalCode", ["postalCode"])
    .index("by_postal_city_town", ["postalCode", "cityJa", "townJa"]),

  addressConversions: defineTable({
    orderId: v.string(),

    original: v.object({
      name: v.optional(v.string()),
      country: v.string(),
      postalCode: v.string(),
      state: v.optional(v.string()),
      city: v.optional(v.string()),
      addressLine1: v.optional(v.string()),
      addressLine2: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),

    converted: v.optional(
      v.object({
        addressLine1: v.string(),
        addressLine2: v.optional(v.string()),
        city: v.string(),
        state: v.string(),
        postalCode: v.string(),
        country: v.literal("JP"),
        phone: v.optional(v.string()),
      })
    ),

    aiBuildingNameResult: v.optional(
      v.object({
        originalBuildingName: v.string(),
        latinBuildingName: v.string(),
        roomOrFloor: v.optional(v.string()),
        confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
        needsReview: v.boolean(),
        reason: v.optional(v.string()),
      })
    ),

    status: v.union(
      v.literal("pending"),
      v.literal("converted"),
      v.literal("needs_review"),
      v.literal("approved"),
      v.literal("rejected")
    ),

    reviewNotes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_orderId", ["orderId"]),
});
```

---

## 7. Japan Post Romanized CSV Import

### 7.1 Import strategy

1. Download the latest Romanized postal-code CSV from Japan Post.
2. Store the file in a secure internal import location.
3. Parse the CSV.
4. Normalize postal codes by removing hyphens.
5. Insert or upsert records into `jpRomanZipRecords`.
6. Re-run the import when Japan Post publishes an updated file.

### 7.2 Important implementation note

Japan Post CSV formats may not always include convenient English headers. The import script should map columns explicitly after checking the latest CSV structure.

Create a small mapping layer such as:

```ts
type RawJapanPostRomanCsvRow = string[];

type JapanPostRomanZipRecord = {
  postalCode: string;
  prefectureJa: string;
  cityJa: string;
  townJa: string;
  prefectureLatin: string;
  cityLatin: string;
  townLatin: string;
};

function mapJapanPostRomanCsvRow(row: RawJapanPostRomanCsvRow): JapanPostRomanZipRecord {
  // TODO: Confirm exact column positions from the latest downloaded CSV.
  return {
    postalCode: normalizePostalCode(row[2]),
    prefectureJa: row[6],
    cityJa: row[7],
    townJa: row[8],
    prefectureLatin: row[3],
    cityLatin: row[4],
    townLatin: row[5],
  };
}
```

Adjust the column indexes after inspecting the actual CSV file.

---

## 8. Address Normalization Rules

### 8.1 Normalize Japanese text

Normalize user input before conversion:

```ts
export function normalizeJapaneseAddressText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—―−－]/g, "-")
    .replace(/丁目/g, "-")
    .replace(/番地/g, "-")
    .replace(/番/g, "-")
    .replace(/号室/g, "")
    .replace(/号/g, "")
    .replace(/[・･]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();
}
```

Examples:

```text
西新宿六丁目15番1 → 西新宿6-15-1
神宮前３－１－５ → 神宮前3-1-5
マンションＡ　２０２号室 → マンションA 202
```

### 8.2 Japanese character detection

```ts
export function containsJapanese(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

export function isUpsLatinSafe(value: string): boolean {
  return /^[A-Za-z0-9\s.,#/'()&+\-]+$/.test(value);
}
```

---

## 9. Address Line 1 Conversion

### 9.1 Goal

Convert Japanese Address Line 1 into a UPS-safe format using:

- Street number from user input
- Town name from Japan Post Romanized CSV

### 9.2 Example

Input:

```text
postalCode: 1600023
addressLine1: 西新宿六丁目15番1
```

Japan Post lookup:

```text
prefectureLatin: Tokyo
cityLatin: Shinjuku-ku
townLatin: Nishi-shinjuku
```

Output:

```text
6-15-1 Nishi-shinjuku
```

### 9.3 Logic

```ts
export function buildUpsAddressLine1(params: {
  addressLine1: string;
  townJa: string;
  townLatin: string;
}): string {
  const normalized = normalizeJapaneseAddressText(params.addressLine1);

  let streetNumber = normalized;

  if (streetNumber.startsWith(params.townJa)) {
    streetNumber = streetNumber.slice(params.townJa.length).trim();
  }

  // If town name was not present in Address Line 1, keep the normalized input,
  // but still append townLatin only if doing so will not duplicate the town.
  if (!streetNumber || streetNumber === normalized) {
    return `${normalized} ${params.townLatin}`.trim();
  }

  return `${streetNumber} ${params.townLatin}`.trim();
}
```

### 9.4 Review triggers for Address Line 1

Flag for review if:

- No postal-code match is found.
- Multiple town records match the same postal code and the system cannot choose confidently.
- Address Line 1 does not include a recognizable street number.
- The final Address Line 1 still contains Japanese characters.

---

## 10. Building Name Conversion with GPT-4o-mini

### 10.1 Goal

Convert Address Line 2 into UPS-compatible Latin characters.

This should prioritize:

1. Preserving the original building identity
2. Restoring obvious katakana loanwords to likely Latin spelling
3. Romanizing Japanese names when no official Latin name exists
4. Preserving room numbers, floor numbers, and building numbers exactly
5. Avoiding semantic over-translation

### 10.2 Examples

```text
パークアベニュー 303 → Park Avenue 303
カサ・ブルーノ 1404 → Casa Bruno 1404
サクラハイツ 202 → Sakura Heights 202
青山荘 305 → Aoyama-so 305
第一田中ビル 4F → Daiichi Tanaka Bldg 4F
```

Avoid outputs such as:

```text
青山荘 → Blue Mountain Villa
第一田中ビル → First Tanaka Building
```

Those are semantic translations and may not map well back to the Japanese building name.

### 10.3 Recommended AI input

Send only the minimum necessary information.

Do send:

- Building name / Address Line 2
- City / ward context
- Town context
- Prefecture context

Do **not** send:

- Customer name
- Phone number
- Email address
- Payment details

### 10.4 Structured output schema

Use structured JSON output so the application receives predictable fields.

```ts
export const buildingNameSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "original_building_name",
    "latin_building_name",
    "ups_address_line2",
    "confidence",
    "needs_review",
    "reason"
  ],
  properties: {
    original_building_name: { type: "string" },
    latin_building_name: { type: "string" },
    ups_address_line2: { type: "string" },
    room_or_floor: { type: ["string", "null"] },
    confidence: { enum: ["high", "medium", "low"] },
    needs_review: { type: "boolean" },
    reason: { type: "string" }
  }
} as const;
```

### 10.5 Prompt

```text
You convert Japanese building names into UPS-compatible Latin-character address text.

Rules:
- Do not create an official English translation.
- The goal is Latin-character formatting for UPS shipping labels.
- Most Japanese building names do not have official Latin versions.
- Preserve the original building identity as much as possible.
- Prefer transliteration or restoration of obvious katakana loanwords.
- Do not semantically translate Japanese building names unless the building is a known public facility with a widely used English name.
- Preserve room numbers, floor numbers, building numbers, and unit numbers exactly.
- Convert common building terms:
  - マンション → Mansion
  - アパート → Apartment
  - ハイツ → Heights
  - コーポ → Corpo
  - メゾン → Maison
  - ビル → Bldg
  - タワー → Tower
  - レジデンス → Residence
  - 荘 → So
  - 階 → F
  - 号室 → remove if the room number remains clear
- Do not output Japanese characters in ups_address_line2.
- If uncertain, set needs_review to true.
- Return JSON only.
```

### 10.6 Convex action boundary

```ts
// The OpenAI call runs inside convex/buildingNames.ts.
// Keep OPENAI_API_KEY in Convex environment variables only.
// Next.js and Netlify should call the Convex action and should not hold the key.
```

---

## 11. Human Review Workflow

Human review can be optional, but the system should support it.

### 11.1 Recommended statuses

```text
pending
converted
needs_review
approved
rejected
```

### 11.2 When to require review

Require or strongly recommend review when:

- AI confidence is `low` or `medium`.
- The building name contains Kanji.
- The building name contains unusual symbols.
- The AI output had to infer a reading.
- The final UPS payload still contains Japanese characters.
- Room number or floor number may have been dropped.

### 11.3 Internal review screen

The internal review screen should show:

```text
Original Japanese address
Converted UPS address
AI conversion reason
Confidence
Needs review flag
Editable UPS Address Line 1
Editable UPS Address Line 2
Approve button
Reject / re-run button
```

### 11.4 Optional cache after approval

If useful, store approved building-name conversions for reuse.

Cache key:

```text
normalized_building_name + postal_code + town
```

This is optional. Do not attempt to build a large nationwide building-name database upfront.

---

## 12. UPS Payload Validation

Before creating a UPS shipment, validate the final payload.

### 12.1 Required validations

- `country` must be `JP`.
- Postal code must be present.
- Address Line 1 must be present.
- City must be present.
- State / prefecture must be present.
- Final UPS address fields must contain only Latin-safe characters.
- No Japanese characters should remain.
- Room number / floor number should not be dropped from Address Line 2.

### 12.2 Example validation

```ts
export function validateUpsAddressPayload(payload: {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}) {
  const fields = [
    payload.addressLine1,
    payload.addressLine2 || "",
    payload.city,
    payload.state,
    payload.postalCode,
    payload.country,
  ];

  const combined = fields.join(" ");

  if (containsJapanese(combined)) {
    return {
      ok: false,
      reason: "UPS payload contains Japanese characters",
    };
  }

  for (const field of fields) {
    if (field && !isUpsLatinSafe(field)) {
      return {
        ok: false,
        reason: `UPS payload contains unsupported characters: ${field}`,
      };
    }
  }

  return { ok: true };
}
```

---

## 13. Next.js Implementation Plan

### 13.1 Suggested routes

```text
/app/api/address-conversions/create/route.ts
/app/api/address-conversions/[id]/approve/route.ts
/app/api/address-conversions/[id]/rerun/route.ts
/app/api/admin/japan-post-csv/import/route.ts
```

### 13.2 Suggested pages

```text
/app/admin/address-conversions/page.tsx
/app/admin/address-conversions/[id]/page.tsx
```

### 13.3 Conversion function

```ts
export async function convertJapaneseAddressToUpsLatin(input: {
  orderId: string;
  postalCode: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
}) {
  const postalCode = normalizePostalCode(input.postalCode);

  const jpRecord = await findJapanPostRecord({
    postalCode,
    cityJa: input.city,
    addressLine1: input.addressLine1,
  });

  if (!jpRecord) {
    return {
      status: "needs_review",
      reason: "No Japan Post Romanized postal-code record found",
    };
  }

  const addressLine1 = buildUpsAddressLine1({
    addressLine1: input.addressLine1 || "",
    townJa: jpRecord.townJa,
    townLatin: jpRecord.townLatin,
  });

  let addressLine2: string | undefined;
  let needsReview = false;
  let aiResult: unknown = undefined;

  if (input.addressLine2?.trim()) {
    aiResult = await convertBuildingNameWithAI({
      addressLine2: input.addressLine2,
      prefectureLatin: jpRecord.prefectureLatin,
      cityLatin: jpRecord.cityLatin,
      townLatin: jpRecord.townLatin,
    });

    addressLine2 = aiResult.ups_address_line2;
    needsReview = aiResult.needs_review || aiResult.confidence !== "high";
  }

  const payload = {
    addressLine1,
    addressLine2,
    city: jpRecord.cityLatin,
    state: jpRecord.prefectureLatin,
    postalCode,
    country: "JP" as const,
    phone: input.phone,
  };

  const validation = validateUpsAddressPayload(payload);

  if (!validation.ok) {
    return {
      status: "needs_review",
      reason: validation.reason,
      payload,
      aiResult,
    };
  }

  return {
    status: needsReview ? "needs_review" : "converted",
    payload,
    aiResult,
  };
}
```

---

## 14. Frontend / Admin UI Requirements

### 14.1 Address conversion list

Show rows with:

- Order ID
- Customer country
- Original postal code
- Original Address Line 1
- Original Address Line 2
- Conversion status
- Review required flag
- Last updated time

### 14.2 Review page

Show two panels:

#### Original Japanese address

```text
東京都新宿区西新宿六丁目15番1
セントラルパークタワー・ラ・トゥール新宿 1404
```

#### UPS Latin address candidate

```text
6-15-1 Nishi-shinjuku
Central Park Tower La Tour Shinjuku 1404
Shinjuku-ku
Tokyo
1600023
JP
```

Fields should be editable before approval.

### 14.3 Buttons

- Approve
- Edit and approve
- Re-run AI conversion
- Mark as needs customer confirmation
- Reject conversion

---

## 15. Privacy and Security Requirements

- Do not send customer names, phone numbers, emails, or payment details to the AI model for building-name conversion.
- Send only Address Line 2 and minimal address context.
- Store both the original Japanese address and converted UPS address.
- Store audit logs for manual edits and approvals.
- Never automatically create a UPS shipment if the final payload contains Japanese characters.
- Keep `OPENAI_API_KEY` in Convex environment variables only.
- Do not expose AI conversion prompts or raw API keys in the browser.

---

## 16. Environment Variables

```bash
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
```

Set these only in Convex, not Netlify or any client-visible variable:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

---

## 17. QA Test Cases

### 17.1 Building name conversion

| Input | Expected candidate |
|---|---|
| パークアベニュー 303 | Park Avenue 303 |
| カサ・ブルーノ 1404 | Casa Bruno 1404 |
| サクラハイツ 202 | Sakura Heights 202 |
| 青山荘 305 | Aoyama-so 305 |
| 第一田中ビル 4F | Daiichi Tanaka Bldg 4F |
| マンションA 202 | Mansion A 202 |
| 渋谷ビル 5階 | Shibuya Bldg 5F |

### 17.2 Address Line 1 conversion

| Input | Expected candidate |
|---|---|
| 神宮前3-1-5 | 3-1-5 Jingumae |
| 西新宿六丁目15番1 | 6-15-1 Nishi-shinjuku |
| 白糸台3丁目2-1 | 3-2-1 Shiraitodai |

### 17.3 Validation

| Payload | Expected |
|---|---|
| `Casa Bruno 1404` | OK |
| `カサ Bruno 1404` | Reject / needs review |
| Empty Address Line 1 | Reject / needs review |
| Missing postal code | Reject / needs review |
| Dropped room number | Needs review |

---

## 18. Rollout Plan

### Phase 1: MVP

- Import Japan Post Romanized CSV.
- Build postal-code lookup.
- Convert Address Line 1 using CSV + normalization rules.
- Convert Address Line 2 using GPT-4o-mini.
- Validate that the final UPS payload has no Japanese characters.
- Add internal review screen.

### Phase 2: Production hardening

- Add approval audit logs.
- Add conversion cache for approved building names.
- Add retry and error handling for AI calls.
- Add monitoring for failed conversions.
- Add batch conversion for existing orders.

### Phase 3: Optimization

- Add confidence scoring rules.
- Add automated approval for safe, repeated, high-confidence conversions.
- Add optional fallback model.
- Add a dashboard showing conversion success rate and review rate.

---

## 19. Important Non-Goals

Do not attempt to:

- Build a complete nationwide building-name database upfront.
- Force customers to enter Latin-character addresses.
- Replace the Japanese address with only a Latin address in the customer-facing form.
- Treat AI output as an official English building name.
- Automatically create UPS shipments when the converted address still contains Japanese characters.

---

## 20. Final Recommendation

Use this approach:

```text
Address excluding building name:
Japan Post Romanized postal-code CSV imported into the internal database

Building name:
GPT-4o-mini-generated UPS-compatible Latin-character formatting

Safety layer:
Japanese-character validation + optional human review
```

This keeps the customer-facing checkout simple while allowing the internal team to create UPS-compatible Latin-character shipping data reliably.
