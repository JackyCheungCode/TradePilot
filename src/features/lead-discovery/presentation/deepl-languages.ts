export const DEEPL_TARGET_LANGUAGES = [
  { code: "EN-US", label: "英语（美国）" }, { code: "EN-GB", label: "英语（英国）" },
  { code: "DE", label: "德语" }, { code: "FR", label: "法语" }, { code: "ES", label: "西班牙语" },
  { code: "IT", label: "意大利语" }, { code: "JA", label: "日语" }, { code: "KO", label: "韩语" },
  { code: "NL", label: "荷兰语" }, { code: "PL", label: "波兰语" }, { code: "PT-BR", label: "葡萄牙语（巴西）" },
  { code: "PT-PT", label: "葡萄牙语（葡萄牙）" }, { code: "RU", label: "俄语" }, { code: "ZH", label: "中文" },
] as const;

const COUNTRY_LANGUAGE: Record<string, string> = {
  US: "EN-US", GB: "EN-GB", IE: "EN-GB", AU: "EN-GB", NZ: "EN-GB", DE: "DE", AT: "DE",
  FR: "FR", ES: "ES", MX: "ES", AR: "ES", CL: "ES", CO: "ES", IT: "IT", JP: "JA",
  KR: "KO", CN: "ZH", TW: "ZH", HK: "ZH", MO: "ZH", NL: "NL", PL: "PL",
  BR: "PT-BR", PT: "PT-PT", RU: "RU",
};
export function defaultDeepLTargetLanguage(countryCode: string) {
  return COUNTRY_LANGUAGE[countryCode] ?? "EN-US";
}
