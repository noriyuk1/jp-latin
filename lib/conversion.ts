import { buildUpsAddressLine1, getAddressLine1ReviewReasons } from "./address-line1.ts";
import { convertBuildingNameWithAI } from "./building-name.ts";
import { findJapanPostRecord } from "./japan-post.ts";
import { convertNameForUps } from "./name.ts";
import { normalizePostalCode } from "./normalize.ts";
import { validateUpsAddressPayload } from "./validation.ts";
import type {
  ConversionResult,
  BuildingNameConversionResult,
  JapanPostRomanZipRecord,
  OriginalJapaneseAddress,
  UpsAddressPayload
} from "./types.ts";

export async function convertJapaneseAddressToUpsLatin(input: {
  orderId: string;
  address: OriginalJapaneseAddress;
  records: JapanPostRomanZipRecord[];
  convertBuildingName?: (input: {
    addressLine2: string;
    prefectureLatin?: string;
    cityLatin?: string;
    townLatin?: string;
  }) => Promise<BuildingNameConversionResult>;
}): Promise<ConversionResult> {
  const postalCode = normalizePostalCode(input.address.postalCode);
  const reviewReasons: string[] = [];

  if (input.address.country !== "JP") {
    return {
      status: "needs_review",
      reason: "Only JP addresses are supported by this conversion flow",
      reviewReasons: ["Country is not JP"]
    };
  }

  const lookup = findJapanPostRecord({
    records: input.records,
    postalCode,
    prefectureJa: input.address.state,
    cityJa: input.address.city,
    addressLine1: input.address.addressLine1
  });
  reviewReasons.push(...lookup.reasons);

  if (!lookup.record) {
    return {
      status: "needs_review",
      reason: "No Japan Post Romanized postal-code record found",
      reviewReasons
    };
  }

  const addressLine1 = buildUpsAddressLine1({
    addressLine1: input.address.addressLine1 || "",
    townJa: lookup.record.townJa,
    townLatin: lookup.record.townLatin
  });
  reviewReasons.push(...getAddressLine1ReviewReasons(addressLine1));

  let addressLine2: string | undefined;
  let aiResult;

  if (input.address.addressLine2?.trim()) {
    const buildingNameConverter = input.convertBuildingName || convertBuildingNameWithAI;
    aiResult = await buildingNameConverter({
      addressLine2: input.address.addressLine2,
      prefectureLatin: lookup.record.prefectureLatin,
      cityLatin: lookup.record.cityLatin,
      townLatin: lookup.record.townLatin
    });

    addressLine2 = aiResult.ups_address_line2;

    if (aiResult.needs_review || aiResult.confidence !== "high") {
      reviewReasons.push(`Building name conversion confidence is ${aiResult.confidence}`);
    }
  }

  const nameResult = convertNameForUps(input.address.name, input.address.nameKana);
  reviewReasons.push(...nameResult.warnings);

  const payload: UpsAddressPayload = {
    name: nameResult.upsName,
    addressLine1,
    addressLine2,
    city: lookup.record.cityLatin,
    state: lookup.record.prefectureLatin,
    postalCode,
    country: "JP",
    phone: input.address.phone
  };

  const validation = validateUpsAddressPayload(payload, input.address.addressLine2);
  if (!validation.ok) {
    return {
      status: "needs_review",
      reason: validation.reason,
      aiResult,
      reviewReasons: [...reviewReasons, validation.reason, ...validation.warnings],
      jpRecord: lookup.record
    };
  }

  reviewReasons.push(...validation.warnings);

  return {
    status: reviewReasons.length > 0 ? "needs_review" : "converted",
    payload,
    aiResult,
    reviewReasons,
    jpRecord: lookup.record
  };
}
