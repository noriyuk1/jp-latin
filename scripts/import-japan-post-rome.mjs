import fs from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function normalizePostalCode(value) {
  return String(value || "").replace(/\D/g, "").padStart(7, "0").slice(-7);
}

function toRecord(row) {
  return {
    postalCode: normalizePostalCode(row[0]),
    prefectureJa: row[1] || "",
    cityJa: row[2] || "",
    townJa: row[3] || "",
    prefectureLatin: row[4] || "",
    cityLatin: row[5] || "",
    townLatin: row[6] || "",
    raw: row
  };
}

const csvPath = process.argv[2];
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const chunkSize = Number(process.env.IMPORT_CHUNK_SIZE || 500);

if (!csvPath || !convexUrl) {
  console.error(
    "Usage: NEXT_PUBLIC_CONVEX_URL=https://... npm run import:japan-post-rome -- /path/KEN_ALL_ROME.CSV"
  );
  process.exit(1);
}

const bytes = fs.readFileSync(csvPath);
const csvText = new TextDecoder("shift_jis").decode(bytes);
const records = parseCsvRows(csvText)
  .map(toRecord)
  .filter(
    (record) =>
      record.postalCode &&
      record.prefectureJa &&
      record.cityJa &&
      record.townJa &&
      record.prefectureLatin &&
      record.cityLatin &&
      record.townLatin
  );

const client = new ConvexHttpClient(convexUrl);
let imported = 0;

for (let index = 0; index < records.length; index += chunkSize) {
  const chunk = records.slice(index, index + chunkSize);
  const result = await client.mutation(api.jpRomanZipRecords.upsertMany, { records: chunk });
  imported += result.total;
  console.log(
    `Imported ${imported}/${records.length} records (${result.inserted} inserted, ${result.updated} updated)`
  );
}

console.log(`Done. Imported ${imported} Japan Post roman postal records.`);
