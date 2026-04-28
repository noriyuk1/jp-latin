import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sampleRecords from "../data/jp-roman-zip-sample.json" with { type: "json" };
import type { AddressConversionRecord, JapanPostRomanZipRecord } from "./types.ts";

const runtimeDir = path.join(process.cwd(), "data", "runtime");
const conversionsPath = path.join(runtimeDir, "address-conversions.json");
const recordsPath = path.join(runtimeDir, "jp-roman-zip-records.json");

async function ensureRuntimeDir(): Promise<void> {
  await mkdir(runtimeDir, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await ensureRuntimeDir();
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function loadJapanPostRecords(): Promise<JapanPostRomanZipRecord[]> {
  return readJsonFile<JapanPostRomanZipRecord[]>(
    recordsPath,
    sampleRecords as JapanPostRomanZipRecord[]
  );
}

export async function saveJapanPostRecords(records: JapanPostRomanZipRecord[]): Promise<void> {
  await writeJsonFile(recordsPath, records);
}

export async function listAddressConversions(): Promise<AddressConversionRecord[]> {
  return readJsonFile<AddressConversionRecord[]>(conversionsPath, []);
}

export async function getAddressConversion(id: string): Promise<AddressConversionRecord | undefined> {
  const records = await listAddressConversions();
  return records.find((record) => record.id === id);
}

export async function upsertAddressConversion(record: AddressConversionRecord): Promise<AddressConversionRecord> {
  const records = await listAddressConversions();
  const existingIndex = records.findIndex((candidate) => candidate.id === record.id);
  const updated = { ...record, updatedAt: Date.now() };

  if (existingIndex >= 0) {
    records[existingIndex] = updated;
  } else {
    records.unshift(updated);
  }

  await writeJsonFile(conversionsPath, records);
  return updated;
}

export async function updateAddressConversion(
  id: string,
  patch: Partial<AddressConversionRecord>
): Promise<AddressConversionRecord | undefined> {
  const records = await listAddressConversions();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return undefined;

  records[index] = {
    ...records[index],
    ...patch,
    updatedAt: Date.now()
  };

  await writeJsonFile(conversionsPath, records);
  return records[index];
}
