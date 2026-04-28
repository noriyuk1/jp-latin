const japaneseDigitMap: Record<string, number> = {
  "〇": 0,
  "零": 0,
  "一": 1,
  "二": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9
};

const japaneseUnitMap: Record<string, number> = {
  "十": 10,
  "百": 100,
  "千": 1000
};

export function normalizePostalCode(value: string): string {
  return value.normalize("NFKC").replace(/\D/g, "");
}

function parseJapaneseNumber(value: string): number | null {
  if (!value) return null;
  let total = 0;
  let current = 0;
  let sawJapaneseNumber = false;

  for (const char of value) {
    if (char in japaneseDigitMap) {
      current = japaneseDigitMap[char];
      sawJapaneseNumber = true;
      continue;
    }

    if (char in japaneseUnitMap) {
      const unit = japaneseUnitMap[char];
      total += (current || 1) * unit;
      current = 0;
      sawJapaneseNumber = true;
      continue;
    }

    return null;
  }

  return sawJapaneseNumber ? total + current : null;
}

export function normalizeJapaneseAddressText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/([〇零一二三四五六七八九十百千]+)(?=丁目|番地|番|号室|号|階)/g, (match) => {
      const parsed = parseJapaneseNumber(match);
      return parsed == null ? match : String(parsed);
    })
    .replace(/[‐‑‒–—―−－]/g, "-")
    .replace(/丁目/g, "-")
    .replace(/番地/g, "-")
    .replace(/番/g, "-")
    .replace(/号室/g, "")
    .replace(/号/g, "")
    .replace(/階/g, "F")
    .replace(/[・･]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

export function containsJapanese(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

export function isUpsLatinSafe(value: string): boolean {
  return /^[A-Za-z0-9\s.,#/'()&+\-]+$/.test(value);
}

export function extractRoomOrFloor(value: string): string | null {
  const normalized = normalizeJapaneseAddressText(value);
  const matches = normalized.match(/\b(?:[A-Za-z]?\d+[A-Za-z]?|\d+F)\b/g);
  return matches?.at(-1) ?? null;
}
