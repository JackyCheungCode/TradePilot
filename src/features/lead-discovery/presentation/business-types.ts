export interface BusinessTypeOption {
  id: string;
  label: string;
  description: string;
  googleTypes: string[];
  osmTags: Array<{ key: string; value: string; label: string; reason: string }>;
}

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  { id: "distributor", label: "经销商 / 批发商", description: "设备分销、批发、贸易企业", googleTypes: ["supplier", "wholesaler"], osmTags: [
    { key: "shop", value: "trade", label: "贸易商", reason: "OSM 通用贸易商分类" },
    { key: "shop", value: "wholesale", label: "批发商", reason: "OSM 批发经营场所分类" },
  ] },
  { id: "manufacturer", label: "制造商", description: "生产工厂及制造企业", googleTypes: ["manufacturer"], osmTags: [
    { key: "man_made", value: "works", label: "制造工厂", reason: "OSM 工业生产设施标记，未必代表企业总部" },
  ] },
  { id: "electrical_equipment", label: "电气设备商家", description: "电气用品、配电及安装材料销售", googleTypes: ["supplier", "hardware_store"], osmTags: [
    { key: "shop", value: "electrical", label: "电气用品商店", reason: "电气用品销售" },
    { key: "shop", value: "hardware", label: "五金商店", reason: "可能销售电气安装材料，覆盖较宽" },
  ] },
  { id: "electronics", label: "电子产品商家", description: "消费电子、电子设备及配件", googleTypes: ["electronics_store"], osmTags: [
    { key: "shop", value: "electronics", label: "电子产品商店", reason: "电子产品销售" },
  ] },
  { id: "computer_network", label: "电脑 / 网络设备商家", description: "电脑、网络及通信设备", googleTypes: ["electronics_store", "telecommunications_service_provider"], osmTags: [
    { key: "shop", value: "computer", label: "电脑商店", reason: "电脑及周边设备销售" },
    { key: "shop", value: "telecommunication", label: "通信设备商店", reason: "通信设备销售" },
  ] },
  { id: "electrical_services", label: "电工 / 电气工程服务", description: "电气安装、维护及承包商", googleTypes: ["electrician"], osmTags: [
    { key: "craft", value: "electrician", label: "电工服务", reason: "工程安装与电工服务，不代表设备经销商" },
  ] },
  { id: "industrial_supplies", label: "工业品供应商", description: "工业设备、机械及工业品供应", googleTypes: ["supplier", "wholesaler"], osmTags: [
    { key: "shop", value: "trade", label: "贸易商", reason: "工业品贸易，具体产品需核验" },
    { key: "shop", value: "wholesale", label: "批发商", reason: "批发经营场所，行业属性需核验" },
  ] },
  { id: "corporate_office", label: "企业办公室 / 总部", description: "企业办公地点及总部", googleTypes: ["corporate_office"], osmTags: [
    { key: "office", value: "company", label: "企业办公室", reason: "OSM 企业办公地点分类" },
  ] },
  { id: "mobile_communications", label: "手机 / 通信设备商家", description: "手机、移动通信及通信终端", googleTypes: ["cell_phone_store", "telecommunications_service_provider"], osmTags: [
    { key: "shop", value: "mobile_phone", label: "手机商店", reason: "移动终端销售" },
    { key: "shop", value: "telecommunication", label: "通信设备商店", reason: "通信设备销售" },
  ] },
];

export function mapBusinessTypeOsmTags(ids: string[]) {
  const selected = new Set(ids);
  const unique = new Map<string, BusinessTypeOption["osmTags"][number] & { match: "primary" | "related" }>();
  for (const option of BUSINESS_TYPE_OPTIONS) if (selected.has(option.id)) {
    for (const tag of option.osmTags) unique.set(tag.key + "=" + tag.value, { ...tag, match: "primary" });
  }
  return [...unique.values()].map((tag) => ({
    key: tag.key, value: tag.value, label: tag.label, match: tag.match, reason: tag.reason,
  }));
}
