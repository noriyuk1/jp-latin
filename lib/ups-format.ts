export function formatUpsState(prefectureLatin: string): string {
  return prefectureLatin
    .normalize("NFKC")
    .replace(/\s+(KEN|TO|FU)$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
