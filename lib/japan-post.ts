import { normalizePostalCode } from "./normalize.ts";
import type { JapanPostRomanZipRecord } from "./types.ts";

export type RawJapanPostRomanCsvRow = string[];

export function mapJapanPostRomanCsvRow(row: RawJapanPostRomanCsvRow): JapanPostRomanZipRecord {
  if (row.length === 7) {
    return {
      postalCode: normalizePostalCode(row[0] || ""),
      prefectureJa: row[1] || "",
      cityJa: row[2] || "",
      townJa: row[3] || "",
      prefectureLatin: row[4] || "",
      cityLatin: row[5] || "",
      townLatin: row[6] || "",
      raw: row
    };
  }

  return {
    postalCode: normalizePostalCode(row[2] || ""),
    prefectureJa: row[6] || "",
    cityJa: row[7] || "",
    townJa: row[8] || "",
    prefectureLatin: row[3] || "",
    cityLatin: row[4] || "",
    townLatin: row[5] || "",
    raw: row
  };
}

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
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

export function parseJapanPostRomanCsv(csvText: string): JapanPostRomanZipRecord[] {
  return parseCsvRows(csvText)
    .map(mapJapanPostRomanCsvRow)
    .filter((record) => record.postalCode && record.prefectureLatin && record.cityLatin);
}

export function findJapanPostRecord(params: {
  records: JapanPostRomanZipRecord[];
  postalCode: string;
  prefectureJa?: string;
  cityJa?: string;
  addressLine1?: string;
}): { record?: JapanPostRomanZipRecord; reasons: string[] } {
  const postalCode = normalizePostalCode(params.postalCode);
  const matches = params.records.filter((record) => record.postalCode === postalCode);

  if (matches.length === 0) {
    return { reasons: ["No Japan Post Romanized postal-code record found"] };
  }

  const prefectureMatches = params.prefectureJa
    ? matches.filter((record) => record.prefectureJa === params.prefectureJa)
    : matches;

  if (prefectureMatches.length === 0) {
    return {
      reasons: [`Postal code ${postalCode} does not match prefecture ${params.prefectureJa}`]
    };
  }

  const cityMatches = params.cityJa
    ? prefectureMatches.filter((record) => record.cityJa === params.cityJa)
    : prefectureMatches;

  if (cityMatches.length === 0) {
    return {
      reasons: [`Postal code ${postalCode} does not match city ${params.cityJa}`]
    };
  }

  const addressMatches = params.addressLine1
    ? cityMatches.filter((record) => params.addressLine1?.includes(record.townJa))
    : cityMatches;

  if (params.addressLine1 && addressMatches.length === 0) {
    return {
      reasons: [`Address Line 1 does not contain a town for postal code ${postalCode}`]
    };
  }

  if (cityMatches.length === 1) {
    return { record: cityMatches[0], reasons: [] };
  }

  if (addressMatches.length === 1) {
    return { record: addressMatches[0], reasons: [] };
  }

  return {
    record: addressMatches[0] || cityMatches[0],
    reasons: ["Multiple town records match the same postal code; selected best available candidate"]
  };
}
