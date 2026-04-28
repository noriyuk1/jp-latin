export type ConversionStatus =
  | "pending"
  | "converted"
  | "needs_review"
  | "approved"
  | "rejected";

export type Confidence = "high" | "medium" | "low";

export type OriginalJapaneseAddress = {
  name?: string;
  nameKana?: string;
  country: string;
  postalCode: string;
  state?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
};

export type JapanPostRomanZipRecord = {
  postalCode: string;
  prefectureJa: string;
  cityJa: string;
  townJa: string;
  prefectureLatin: string;
  cityLatin: string;
  townLatin: string;
  raw?: unknown;
};

export type UpsAddressPayload = {
  name?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "JP";
  phone?: string;
};

export type BuildingNameConversionResult = {
  original_building_name: string;
  latin_building_name: string;
  ups_address_line2: string;
  room_or_floor: string | null;
  confidence: Confidence;
  needs_review: boolean;
  reason: string;
};

export type AddressConversionRecord = {
  id: string;
  orderId: string;
  original: OriginalJapaneseAddress;
  converted?: UpsAddressPayload;
  aiBuildingNameResult?: BuildingNameConversionResult;
  status: ConversionStatus;
  reviewNotes?: string;
  approvedBy?: string;
  createdAt: number;
  updatedAt: number;
};

export type ConversionResult = {
  status: "converted" | "needs_review";
  payload?: UpsAddressPayload;
  aiResult?: BuildingNameConversionResult;
  reason?: string;
  reviewReasons: string[];
  jpRecord?: JapanPostRomanZipRecord;
};
