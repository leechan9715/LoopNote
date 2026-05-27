import type { OcrParserOptions, OcrParserResult } from "@/types";

const MATH_SYMBOL_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/×/g, "x"],
  [/÷/g, "/"],
  [/[−–—]/g, "-"],
  [/[＝]/g, "="],
  [/[＋]/g, "+"],
];

const NOISE_CHARACTER_PATTERN = /[^\p{L}\p{N}\s.,?!:;'"(){}\[\]+\-*/=<>%#&|^_~₩$@\\]/gu;

const normalizeMathSymbols = (text: string) =>
  MATH_SYMBOL_REPLACEMENTS.reduce(
    (normalizedText, [pattern, replacement]) => normalizedText.replace(pattern, replacement),
    text
  );

export function parseOcrText(rawText: string, options: OcrParserOptions = {}): OcrParserResult {
  const { preserveLineBreaks = true, preserveMathSymbols = true } = options;
  const lineSeparator = preserveLineBreaks ? "\n" : " ";
  const normalizedText = rawText
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(lineSeparator);

  const symbolNormalizedText = preserveMathSymbols
    ? normalizeMathSymbols(normalizedText)
    : normalizedText;
  const text = symbolNormalizedText.replace(NOISE_CHARACTER_PATTERN, "").replace(/[ \t]+/g, " ").trim();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    text,
    lines,
  };
}

export const ocrParser = parseOcrText;
