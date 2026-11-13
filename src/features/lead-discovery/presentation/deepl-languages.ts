export const DEEPL_TARGET_LANGUAGES = [
  { code: "AR", label: "阿拉伯语" }, { code: "BG", label: "保加利亚语" }, { code: "CS", label: "捷克语" },
  { code: "DA", label: "丹麦语" }, { code: "DE", label: "德语" }, { code: "EL", label: "希腊语" },
  { code: "EN-US", label: "英语（美国）" }, { code: "EN-GB", label: "英语（英国）" }, { code: "ES", label: "西班牙语" },
  { code: "ET", label: "爱沙尼亚语" }, { code: "FI", label: "芬兰语" }, { code: "FR", label: "法语" },
  { code: "HE", label: "希伯来语" }, { code: "HU", label: "匈牙利语" }, { code: "ID", label: "印尼语" },
  { code: "IT", label: "意大利语" }, { code: "JA", label: "日语" }, { code: "KO", label: "韩语" },
  { code: "LT", label: "立陶宛语" }, { code: "LV", label: "拉脱维亚语" }, { code: "NB", label: "挪威语" },
  { code: "NL", label: "荷兰语" }, { code: "PL", label: "波兰语" }, { code: "PT-BR", label: "葡萄牙语（巴西）" },
  { code: "PT-PT", label: "葡萄牙语（葡萄牙）" }, { code: "RO", label: "罗马尼亚语" }, { code: "RU", label: "俄语" },
  { code: "SK", label: "斯洛伐克语" }, { code: "SL", label: "斯洛文尼亚语" }, { code: "SV", label: "瑞典语" },
  { code: "TH", label: "泰语" }, { code: "TR", label: "土耳其语" }, { code: "UK", label: "乌克兰语" },
  { code: "VI", label: "越南语" }, { code: "ZH", label: "中文" },
] as const;

const COUNTRY_LANGUAGE: Record<string, string> = {
  US: "EN-US", GB: "EN-GB", IE: "EN-GB", AU: "EN-GB", NZ: "EN-GB", CA: "EN-US",
  DE: "DE", AT: "DE", CH: "DE", FR: "FR", BE: "FR", ES: "ES", MX: "ES", AR: "ES", CL: "ES", CO: "ES", PE: "ES",
  IT: "IT", JP: "JA", KR: "KO", CN: "ZH", TW: "ZH", HK: "ZH", MO: "ZH", NL: "NL", PL: "PL",
  BR: "PT-BR", PT: "PT-PT", RU: "RU", SA: "AR", AE: "AR", EG: "AR", QA: "AR", KW: "AR", BH: "AR", OM: "AR", JO: "AR", LB: "AR",
  BG: "BG", CZ: "CS", DK: "DA", GR: "EL", EE: "ET", FI: "FI", IL: "HE", HU: "HU", ID: "ID",
  LT: "LT", LV: "LV", NO: "NB", RO: "RO", SK: "SK", SI: "SL", SE: "SV", TH: "TH", TR: "TR", UA: "UK", VN: "VI",
};
export function defaultDeepLTargetLanguage(countryCode: string) {
  return COUNTRY_LANGUAGE[countryCode] ?? "EN-US";
}
