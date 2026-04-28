import assert from "node:assert/strict";
import test from "node:test";
import { buildUpsAddressLine1 } from "../lib/address-line1.ts";
import { fallbackConvertBuildingName } from "../lib/building-name.ts";
import { findJapanPostRecord, mapJapanPostRomanCsvRow } from "../lib/japan-post.ts";
import { convertNameForUps } from "../lib/name.ts";
import { normalizeJapaneseAddressText } from "../lib/normalize.ts";
import { formatUpsState } from "../lib/ups-format.ts";
import { validateUpsAddressPayload } from "../lib/validation.ts";

test("normalizes Japanese address text", () => {
  assert.equal(normalizeJapaneseAddressText("西新宿六丁目15番1"), "西新宿6-15-1");
  assert.equal(normalizeJapaneseAddressText("神宮前３－１－５"), "神宮前3-1-5");
  assert.equal(normalizeJapaneseAddressText("大塚町 １ー２ー３"), "大塚町 1-2-3");
  assert.equal(normalizeJapaneseAddressText("マンションＡ　２０２号室"), "マンションA 202");
  assert.equal(normalizeJapaneseAddressText("パークアベニュー ３０３"), "パークアベニュー 303");
});

test("builds UPS address line 1 with town latin", () => {
  assert.equal(
    buildUpsAddressLine1({
      addressLine1: "神宮前3-1-5",
      townJa: "神宮前",
      townLatin: "Jingumae"
    }),
    "3-1-5 Jingumae"
  );
  assert.equal(
    buildUpsAddressLine1({
      addressLine1: "大塚町 １ー２ー３",
      townJa: "大塚町",
      townLatin: "OTSUKACHO"
    }),
    "1-2-3 OTSUKACHO"
  );
  assert.equal(
    buildUpsAddressLine1({
      addressLine1: "西新宿六丁目15番1",
      townJa: "西新宿",
      townLatin: "Nishi-shinjuku"
    }),
    "6-15-1 Nishi-shinjuku"
  );
  assert.equal(
    buildUpsAddressLine1({
      addressLine1: "白糸台3丁目2-1",
      townJa: "白糸台",
      townLatin: "Shiraitodai"
    }),
    "3-2-1 Shiraitodai"
  );
});

test("fallback building-name conversion covers QA examples", () => {
  assert.equal(fallbackConvertBuildingName("パークアベニュー 303").ups_address_line2, "Park Avenue 303");
  assert.equal(fallbackConvertBuildingName("カサ・ブルーノ 1404").ups_address_line2, "Casa Bruno 1404");
  assert.equal(fallbackConvertBuildingName("サクラハイツ 202").ups_address_line2, "Sakura Heights 202");
  assert.equal(fallbackConvertBuildingName("青山荘 305").ups_address_line2, "Aoyama-so 305");
  assert.equal(fallbackConvertBuildingName("第一田中ビル 4F").ups_address_line2, "Daiichi Tanaka Bldg 4F");
  assert.equal(fallbackConvertBuildingName("マンションA 202").ups_address_line2, "Mansion A 202");
  assert.equal(fallbackConvertBuildingName("渋谷ビル 5階").ups_address_line2, "Shibuya Bldg 5F");
});

test("converts Japanese name readings with WanaKana", () => {
  assert.deepEqual(convertNameForUps("山田 太郎", "ヤマダ タロウ"), {
    upsName: "YAMADA TAROU",
    katakana: "ヤマダ タロウ",
    warnings: []
  });
  assert.deepEqual(convertNameForUps("やまだ たろう"), {
    upsName: "YAMADA TAROU",
    katakana: "ヤマダ タロウ",
    warnings: []
  });
  assert.deepEqual(convertNameForUps(undefined, "サトウ ハナコ"), {
    upsName: "SATOU HANAKO",
    katakana: "サトウ ハナコ",
    warnings: []
  });
  assert.deepEqual(convertNameForUps("Taro Yamada"), {
    upsName: "TARO YAMADA",
    warnings: []
  });
  assert.equal(convertNameForUps("山田 太郎").upsName, undefined);
  assert.equal(convertNameForUps("山田 太郎").warnings.length, 1);
});

test("rejects postal records when prefecture or city input does not match", () => {
  const records = [
    {
      postalCode: "2770026",
      prefectureJa: "千葉県",
      cityJa: "柏市",
      townJa: "大塚町",
      prefectureLatin: "Chiba",
      cityLatin: "Kashiwa-shi",
      townLatin: "Ootsuka-chou"
    }
  ];

  assert.equal(
    findJapanPostRecord({
      records,
      postalCode: "2770026",
      prefectureJa: "東京都",
      cityJa: "立川市",
      addressLine1: "5-6-7"
    }).record,
    undefined
  );
});

test("maps official KEN_ALL_ROME.CSV rows", () => {
  assert.deepEqual(mapJapanPostRomanCsvRow([
    "2770026",
    "千葉県",
    "柏市",
    "大塚町",
    "CHIBA KEN",
    "KASHIWA SHI",
    "OTSUKACHO"
  ]), {
    postalCode: "2770026",
    prefectureJa: "千葉県",
    cityJa: "柏市",
    townJa: "大塚町",
    prefectureLatin: "CHIBA KEN",
    cityLatin: "KASHIWA SHI",
    townLatin: "OTSUKACHO",
    raw: [
      "2770026",
      "千葉県",
      "柏市",
      "大塚町",
      "CHIBA KEN",
      "KASHIWA SHI",
      "OTSUKACHO"
    ]
  });
});

test("formats UPS state without Japanese administrative suffixes", () => {
  assert.equal(formatUpsState("CHIBA KEN"), "CHIBA");
  assert.equal(formatUpsState("TOKYO TO"), "TOKYO");
  assert.equal(formatUpsState("OSAKA FU"), "OSAKA");
  assert.equal(formatUpsState("HOKKAIDO"), "HOKKAIDO");
});

test("validates UPS-safe payloads", () => {
  assert.deepEqual(
    validateUpsAddressPayload({
      addressLine1: "6-15-1 Nishi-shinjuku",
      addressLine2: "Casa Bruno 1404",
      city: "Shinjuku-ku",
      state: "Tokyo",
      postalCode: "1600023",
      country: "JP"
    }),
    { ok: true, warnings: [] }
  );

  const japaneseResult = validateUpsAddressPayload({
    addressLine1: "6-15-1 Nishi-shinjuku",
    addressLine2: "カサ Bruno 1404",
    city: "Shinjuku-ku",
    state: "Tokyo",
    postalCode: "1600023",
    country: "JP"
  });
  assert.equal(japaneseResult.ok, false);

  const missingLine1 = validateUpsAddressPayload({
    addressLine1: "",
    city: "Shinjuku-ku",
    state: "Tokyo",
    postalCode: "1600023",
    country: "JP"
  });
  assert.equal(missingLine1.ok, false);

  const droppedRoom = validateUpsAddressPayload(
    {
      addressLine1: "6-15-1 Nishi-shinjuku",
      addressLine2: "Casa Bruno",
      city: "Shinjuku-ku",
      state: "Tokyo",
      postalCode: "1600023",
      country: "JP"
    },
    "カサ・ブルーノ 1404"
  );
  assert.equal(droppedRoom.ok, true);
  assert.equal(droppedRoom.warnings.length, 1);
});
