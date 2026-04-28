# Japanese Address to UPS Latin System

Internal TypeScript/Next.js implementation for converting Japanese shipping addresses into UPS-compatible Latin-character payloads.

## What is included

- Japan Post romanized postal-code CSV mapping utilities.
- Address normalization and Japanese-character validation.
- Address Line 1 conversion using postal-code records.
- Address Line 2/building-name conversion with a configurable OpenAI model and deterministic fallback.
- Name conversion from kana/furigana to UPS-safe Latin text with WanaKana.
- Direct Japanese address form and UPS Latin output page.
- Convex persistence and Japan Post CSV import tools.
- Node tests for address, name, postal-code, and validation behavior.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The OpenAI key is optional for local tests. If it is missing, building-name conversion uses a conservative local transliteration fallback and marks uncertain results for review.

For the shared client-review build, set these Netlify environment variables:

```text
NEXT_PUBLIC_CONVEX_URL=https://aware-buzzard-478.convex.cloud
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` must not use the `NEXT_PUBLIC_` prefix.

## Client review flow

Open `/` and enter the address in Japanese. The app returns a UPS-compatible Latin-character address payload.

If the recipient name is kanji, enter the reading in `フリガナ`. WanaKana normalizes the reading to katakana and converts it to romaji for the UPS `name` field. WanaKana does not infer kanji readings by itself.

## Manual testing flow

1. Open `/`.
2. Enter a Japanese address.
3. Submit the form.
4. Use the generated UPS Latin fields or JSON payload.

Building-name conversion uses `OPENAI_API_KEY` when it is present in the server environment. Without the key, the app uses the local fallback converter and marks results for review.

## Test

```bash
npm test
```

## Japan Post import

Download the latest romanized postal-code CSV from Japan Post:

https://www.post.japanpost.jp/zipcode/dl/roman-zip.html

Japan Post publishes `KEN_ALL_ROME.ZIP`; extract `KEN_ALL_ROME.CSV`, then import it into Convex:

```bash
NEXT_PUBLIC_CONVEX_URL=https://aware-buzzard-478.convex.cloud \
npm run import:japan-post-rome -- /path/to/KEN_ALL_ROME.CSV
```

You can also import CSV text from `/admin/japan-post-csv/import`.
