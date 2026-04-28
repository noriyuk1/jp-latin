import { isKana, toKatakana, toRomaji } from "wanakana";
import { containsJapanese, isUpsLatinSafe } from "./normalize.ts";

export type NameConversionResult = {
  upsName?: string;
  katakana?: string;
  warnings: string[];
};

function formatUpsName(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9 .'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isKanaName(input: string): boolean {
  return isKana(input.replace(/\s+/g, ""));
}

export function convertNameForUps(name?: string, nameKana?: string): NameConversionResult {
  const normalizedName = name?.normalize("NFKC").trim();
  const normalizedKana = nameKana?.normalize("NFKC").trim();
  const warnings: string[] = [];

  const reading =
    normalizedKana || (normalizedName && isKanaName(normalizedName) ? normalizedName : undefined);

  if (reading) {
    const katakana = toKatakana(reading).normalize("NFKC").trim();

    if (!isKanaName(katakana)) {
      warnings.push("Name furigana must be kana or romaji");
      return { warnings };
    }

    const upsName = formatUpsName(toRomaji(katakana));

    if (!upsName) {
      warnings.push("Name furigana could not be converted to UPS Latin text");
      return { katakana, warnings };
    }

    return { upsName, katakana, warnings };
  }

  if (!normalizedName) {
    return { warnings };
  }

  if (!containsJapanese(normalizedName) && isUpsLatinSafe(normalizedName)) {
    return { upsName: formatUpsName(normalizedName), warnings };
  }

  warnings.push("Name uses kanji; enter furigana to convert the UPS name field");
  return { warnings };
}
