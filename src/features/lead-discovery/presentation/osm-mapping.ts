export interface OsmTagRule {
  key: string;
  value: string;
  label: string;
  match: "primary" | "related";
  reason: string;
}

const RULES: Array<{ terms: string[]; rules: OsmTagRule[] }> = [
  { terms: ["electrical equipment", "electrical distributor", "electrical supplies", "electrical wholesaler", "electrical parts", "electrical components", "electrical"], rules: [
    { key: "shop", value: "electrical", label: "电气设备商店", match: "primary", reason: "直接对应电气用品销售分类" },
    { key: "shop", value: "trade", label: "贸易商", match: "related", reason: "覆盖未细分商品类别的贸易商，相关性较宽" },
    { key: "shop", value: "wholesale", label: "批发商", match: "related", reason: "覆盖批发经营场所，行业属性需二次核验" },
    { key: "shop", value: "hardware", label: "五金商店", match: "related", reason: "可能销售电气安装材料，但会引入泛五金商家" },
  ] },
  { terms: ["electronics distributor", "electronic components", "electronics", "consumer electronics"], rules: [
    { key: "shop", value: "electronics", label: "电子产品商店", match: "primary", reason: "电子产品零售分类" },
    { key: "shop", value: "computer", label: "电脑商店", match: "related", reason: "覆盖电脑及相关电子设备" },
    { key: "shop", value: "hifi", label: "音响商店", match: "related", reason: "覆盖音频设备销售" },
  ] },
  { terms: ["computer distributor", "computer equipment", "computer hardware", "computer", "network equipment", "networking", "telecommunication"], rules: [
    { key: "shop", value: "computer", label: "电脑商店", match: "primary", reason: "电脑及周边设备销售" },
    { key: "shop", value: "telecommunication", label: "通信设备商店", match: "primary", reason: "通信设备销售" },
    { key: "shop", value: "mobile_phone", label: "手机商店", match: "related", reason: "移动通信终端销售" },
    { key: "office", value: "it", label: "IT 办公室", match: "related", reason: "可能是 IT 服务企业，不一定销售设备" },
  ] },
  { terms: ["electrical contractor", "electrician", "electrical installation"], rules: [
    { key: "craft", value: "electrician", label: "电工服务", match: "primary", reason: "工程安装与电工服务，不代表设备经销商" },
  ] },
  { terms: ["industrial equipment", "industrial supplier", "machinery", "hardware supplier"], rules: [
    { key: "shop", value: "trade", label: "贸易商", match: "primary", reason: "工业品贸易类别，具体产品需核验" },
    { key: "shop", value: "wholesale", label: "批发商", match: "related", reason: "批发经营场所，具体行业需核验" },
    { key: "shop", value: "hardware", label: "五金商店", match: "related", reason: "可能销售工业工具和配件" },
  ] },
  { terms: ["solar panel installer", "solar installer", "solar energy"], rules: [
    { key: "craft", value: "solar_panel_installer", label: "太阳能安装商", match: "primary", reason: "太阳能设备安装服务" },
    { key: "shop", value: "energy", label: "能源商店", match: "related", reason: "能源相关零售，覆盖有限且需核验" },
  ] },
];

export function mapOsmTags(query: string): OsmTagRule[] {
  const normalized = query.normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
  if (!normalized) return [];
  const matched = RULES.filter((entry) => entry.terms.some((term) => normalized.includes(term)));
  const unique = new Map<string, OsmTagRule>();
  for (const entry of matched) for (const rule of entry.rules) {
    const key = rule.key + "=" + rule.value;
    const previous = unique.get(key);
    if (!previous || (previous.match === "related" && rule.match === "primary")) unique.set(key, rule);
  }
  return [...unique.values()];
}
