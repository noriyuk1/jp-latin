import crypto from "node:crypto";
import { convertJapaneseAddressToUpsLatin } from "./conversion.ts";
import { loadJapanPostRecords, upsertAddressConversion } from "./repository.ts";
import type { AddressConversionRecord, OriginalJapaneseAddress } from "./types.ts";

export async function createAddressConversion(params: {
  orderId: string;
  original: OriginalJapaneseAddress;
}): Promise<AddressConversionRecord> {
  const now = Date.now();
  const records = await loadJapanPostRecords();
  const result = await convertJapaneseAddressToUpsLatin({
    orderId: params.orderId,
    address: params.original,
    records
  });

  return upsertAddressConversion({
    id: crypto.randomUUID(),
    orderId: params.orderId,
    original: params.original,
    converted: result.payload,
    aiBuildingNameResult: result.aiResult,
    status: result.status,
    reviewNotes: result.reviewReasons.join("; ") || result.reason,
    createdAt: now,
    updatedAt: now
  });
}
