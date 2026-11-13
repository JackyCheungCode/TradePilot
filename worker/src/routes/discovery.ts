import { errorResponse, successResponse } from "../lib/http";
import { buildLeadDedupeKey, normalizeBusinessName } from "../lib/deduplication";

export interface DiscoveryEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_MAPS_API_KEY?: string;
  SERPER_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  LEAD_DISCOVERY_WORKFLOW: { create(options: { id: string; params: { runId: string; ownerId: string; input: DiscoveryRunInput } }): Promise<{ id: string }> };
  OVERPASS_API_URL?: string;
}
export type DiscoveryProvider = "google_maps" | "openstreetmap";
export interface DiscoveryRunInput {
  countries: string[]; query: string; limitPerCountry: number; providers: DiscoveryProvider[];
  state?: string; city?: string; osmTags?: Array<{ key: string; value: string }>;
  businessTypes?: string[];
  filters?: { minRating?: number; openNow?: boolean; requireWebsite?: boolean; requirePhone?: boolean };
  originalQuery?: string; translatedQuery?: string; targetLanguage?: string;
  channel?: "map_local_businesses" | "search_engine";
  searchEngines?: Array<"serper" | "serpapi">;
  searchTypes?: Array<"web" | "shopping" | "images" | "news" | "videos" | "scholar" | "patents">;
  searchLanguage?: string; advancedQuery?: string; excludeCategories?: string[];
}
const BUSINESS_TYPE_FILTERS: Record<string, { googleTypes: string[]; osmTags: Array<{key:string;value:string}> }> = {
  distributor: { googleTypes: ["supplier", "wholesaler"], osmTags: [{key:"shop",value:"trade"},{key:"shop",value:"wholesale"}] },
  manufacturer: { googleTypes: ["manufacturer"], osmTags: [{key:"man_made",value:"works"}] },
  electrical_equipment: { googleTypes: ["supplier", "hardware_store"], osmTags: [{key:"shop",value:"electrical"},{key:"shop",value:"hardware"}] },
  electronics: { googleTypes: ["electronics_store"], osmTags: [{key:"shop",value:"electronics"}] },
  computer_network: { googleTypes: ["electronics_store","telecommunications_service_provider"], osmTags: [{key:"shop",value:"computer"},{key:"shop",value:"telecommunication"}] },
  electrical_services: { googleTypes: ["electrician"], osmTags: [{key:"craft",value:"electrician"}] },
  industrial_supplies: { googleTypes: ["supplier","wholesaler"], osmTags: [{key:"shop",value:"trade"},{key:"shop",value:"wholesale"}] },
  corporate_office: { googleTypes: ["corporate_office"], osmTags: [{key:"office",value:"company"}] },
  mobile_communications: { googleTypes: ["cell_phone_store","telecommunications_service_provider"], osmTags: [{key:"shop",value:"mobile_phone"},{key:"shop",value:"telecommunication"}] },
};
interface OSMElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; }
interface GooglePlace { id?: string; displayName?: { text?: string }; location?: { latitude?: number; longitude?: number }; formattedAddress?: string; nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string; types?: string[]; rating?: number; userRatingCount?: number; businessStatus?: string; }
type ProviderResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function authenticate(request: Request, env: DiscoveryEnv): Promise<string | null> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const response = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ?? null;
}
async function db<T>(env: DiscoveryEnv, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("DATABASE_" + response.status + ": " + raw.slice(0, 400));
  if (!raw.trim()) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("DATABASE_INVALID_JSON: Supabase returned a non-JSON response for " + path);
  }
}
async function log(env: DiscoveryEnv, runId: string, ownerId: string, level: string, message: string) {
  await db(env, "discovery_run_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ run_id: runId, owner_id: ownerId, level, message }),
  });
}
async function updateRun(env: DiscoveryEnv, id: string, patch: Record<string, unknown>) {
  await db(env, "discovery_runs?id=eq." + id, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}
function countryName(code: string) {
  const special: Record<string, string> = { HK: "Hong Kong", MO: "Macao", TW: "Taiwan" };
  return special[code] ?? new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
}
function overpassLiteral(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function overpassRegexLiteral(value: string) {
  return overpassLiteral(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}
async function searchOSM(code: string, tags: Array<{key:string;value:string}>, limit: number, env: DiscoveryEnv, state?: string, city?: string, filters: DiscoveryRunInput["filters"] = {}): Promise<OSMElement[]> {
  const overpassEndpoints = [...new Set([
    env.OVERPASS_API_URL,
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ].filter((endpoint): endpoint is string => Boolean(endpoint)))];
  if (!tags.length) return [];
  const scopeClauses = ['area["ISO3166-1"="' + code + '"][admin_level=2]->.country;'];
  let parentArea = "country";
  if (state) {
    scopeClauses.push('area["name"~"^' + overpassRegexLiteral(state) + '$",i](area.country)->.state;');
    parentArea = "state";
  }
  if (city) {
    scopeClauses.push('area["name"~"^' + overpassRegexLiteral(city) + '$",i](area.' + parentArea + ')->.target;');
  } else if (state) {
    scopeClauses.push(".state->.target;");
  } else {
    scopeClauses.push(".country->.target;");
  }
  const websiteKeys = filters.requireWebsite ? ["website", "contact:website"] : [null];
  const phoneKeys = filters.requirePhone ? ["phone", "contact:phone"] : [null];
  const tagQueries = tags.flatMap(({key,value}) => websiteKeys.flatMap((websiteKey) => phoneKeys.map((phoneKey) =>
    'nwr["' + overpassLiteral(key) + '"="' + overpassLiteral(value) + '"]' +
    (websiteKey ? '["' + websiteKey + '"]' : '') +
    (phoneKey ? '["' + phoneKey + '"]' : '') +
    '(area.target);'
  ))).join("");
  const q = '[out:json][timeout:70];' + scopeClauses.join("") + '(' + tagQueries + ');out center tags;';
  const failures: string[] = [];
  for (let index = 0; index < overpassEndpoints.length; index++) {
    const endpoint = overpassEndpoints[index];
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "TradePilot/0.1 (lead discovery)" },
        body: "data=" + encodeURIComponent(q),
        signal: AbortSignal.timeout(80000),
      });
      if (!response.ok) {
        failures.push(new URL(endpoint).host + ":OVERPASS_" + response.status);
        if ([429, 502, 503, 504, 521, 522, 524].includes(response.status) && index < overpassEndpoints.length - 1) continue;
        throw new Error("OVERPASS_" + response.status + " (" + failures.join(", ") + ")");
      }
      const body = await response.json() as { elements?: OSMElement[] };
      return (body.elements ?? []).filter((element) => element.tags?.name).slice(0, limit);
    } catch (error) {
      failures.push(new URL(endpoint).host + ":" + String(error).slice(0,100));
      if (index === overpassEndpoints.length - 1) throw new Error("OVERPASS_ALL_ENDPOINTS_FAILED: " + failures.join(" | "));
    }
  }
  throw new Error("OVERPASS_ALL_ENDPOINTS_FAILED: " + failures.join(" | "));
}
async function searchGoogle(
  code: string, query: string, limit: number, env: DiscoveryEnv, state?: string, city?: string,
  businessTypes: string[] = [], filters: DiscoveryRunInput["filters"] = {},
): Promise<GooglePlace[]> {
  if (!env.GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY_NOT_CONFIGURED");
  const location = [city, state, countryName(code)].filter(Boolean).join(", ");
  const requestedTypes = [...new Set(businessTypes.flatMap((id) => BUSINESS_TYPE_FILTERS[id]?.googleTypes ?? []))];
  const typeQueries: Array<string | undefined> = requestedTypes.length ? requestedTypes : [undefined];
  const perTypeLimit = Math.max(1, Math.ceil(limit / typeQueries.length));
  const pageSize = Math.min(20, perTypeLimit);
  const placesById = new Map<string, GooglePlace>();
  for (const includedType of typeQueries) {
    let pageToken: string | undefined;
    for (let page = 0; page < Math.ceil(perTypeLimit / 20); page++) {
      const body: Record<string, unknown> = {
        textQuery: query + " in " + location,
        regionCode: code,
        pageSize,
      };
      if (includedType) { body.includedType = includedType; body.strictTypeFiltering = true; }
      if (filters.minRating !== undefined) body.minRating = filters.minRating;
      if (filters.openNow) body.openNow = true;
      if (pageToken) body.pageToken = pageToken;
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.types,places.rating,places.userRatingCount,places.businessStatus,nextPageToken",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("GOOGLE_PLACES_" + response.status + (includedType ? " (" + includedType + ")" : ""));
      const result = await response.json() as { places?: GooglePlace[]; nextPageToken?: string };
      for (const place of result.places ?? []) if (place.id) placesById.set(place.id, place);
      pageToken = result.nextPageToken;
      if (!pageToken || !(result.places?.length)) break;
    }
  }
  let places = [...placesById.values()];
  if (filters.requireWebsite) places = places.filter((place) => Boolean(place.websiteUri));
  if (filters.requirePhone) places = places.filter((place) => Boolean(place.internationalPhoneNumber || place.nationalPhoneNumber));
  return places.slice(0, limit);
}
function calculateConfidence(input:{provider:DiscoveryProvider;address?:string|null;phone?:string|null;website?:string|null;email?:string|null;latitude?:number|null;longitude?:number|null;businessType?:string|null}):number {
  let score=input.provider==="google_maps"?55:45;
  if(input.address)score+=10;if(input.phone)score+=10;if(input.website)score+=8;
  if(input.email)score+=5;if(input.latitude!=null&&input.longitude!=null)score+=7;
  if(input.businessType)score+=5;
  return Math.min(100,score);
}
export async function markRunFailed(env: DiscoveryEnv, runId: string, ownerId: string, error: unknown) {
  await updateRun(env, runId, { status: "failed", message: "任务执行失败" });
  await log(env, runId, ownerId, "error", "任务异常终止：" + String(error).slice(0, 300));
}


async function persistDiscoveryRecord(
  env: DiscoveryEnv,
  ownerId: string,
  runId: string,
  input: DiscoveryRunInput,
  item: { provider: DiscoveryProvider; externalId: string; name: string; countryCode: string; address?: string | null; phone?: string | null; email?: string | null; website?: string | null; businessType?: string | null; confidenceScore?: number | null; latitude?: number | null; longitude?: number | null; sourceUrl?: string | null; license?: string | null; attribution?: string | null; rawData: Record<string, unknown>; dedupeKey: string },
): Promise<string> {
  const entityRows = await db<Array<{id:string}>>(env, "discovery_entities?on_conflict=owner_id,dedupe_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({owner_id:ownerId,entity_type:"business",display_name:item.name,dedupe_key:item.dedupeKey,attributes:{country_code:item.countryCode}}),
  });
  let entityId=entityRows?.[0]?.id;
  if(!entityId){
    const existingEntity=await db<Array<{id:string}>>(env,"discovery_entities?owner_id=eq."+ownerId+"&dedupe_key=eq."+encodeURIComponent(item.dedupeKey)+"&select=id");
    entityId=existingEntity[0]?.id;
  }
  if(!entityId)throw new Error("DISCOVERY_ENTITY_UPSERT_FAILED");
  const previous = await db<Array<Record<string,unknown>>>(env,"discovery_records?owner_id=eq."+ownerId+"&channel=eq.map_local_businesses&dedupe_key=eq."+encodeURIComponent(item.dedupeKey)+"&select=id,address,phone,email,website,business_type,confidence_score,raw_data");
  const prior = previous[0] ?? {};
  const mergedRawData = {...(prior.raw_data && typeof prior.raw_data==="object" ? prior.raw_data as Record<string,unknown> : {}),...item.rawData};
  const rows = await db<Array<{ id: string }>>(env, "discovery_records?on_conflict=owner_id,channel,dedupe_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      owner_id: ownerId, channel: "map_local_businesses", record_type: "business", entity_id: entityId,
      name: item.name, country_code: item.countryCode,
      address: item.address ?? prior.address ?? null, phone: item.phone ?? prior.phone ?? null,
      email: item.email ?? prior.email ?? null, website: item.website ?? prior.website ?? null,
      business_type: item.businessType ?? prior.business_type ?? null,
      confidence_score: Math.max(item.confidenceScore ?? 0, Number(prior.confidence_score ?? 0)) || null,
      latitude: item.latitude ?? null, longitude: item.longitude ?? null,
      dedupe_key: item.dedupeKey, raw_data: mergedRawData,
    }),
  });
  let recordId = rows?.[0]?.id;
  if (!recordId) {
    const existing = await db<Array<{ id: string }>>(env, "discovery_records?owner_id=eq." + ownerId + "&channel=eq.map_local_businesses&dedupe_key=eq." + encodeURIComponent(item.dedupeKey) + "&select=id");
    recordId = existing[0]?.id;
  }
  if (!recordId) throw new Error("DISCOVERY_RECORD_UPSERT_FAILED");
  await db(env, "discovery_record_occurrences?on_conflict=owner_id,run_id,provider,external_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      owner_id: ownerId, record_id: recordId, run_id: runId, provider: item.provider,
      keyword: input.query, external_id: item.externalId, source_url: item.sourceUrl ?? null,
      license: item.license ?? null, attribution: item.attribution ?? null, raw_data: item.rawData,
    }),
  });
  return recordId;
}

export async function processRun(env: DiscoveryEnv, runId: string, ownerId: string, input: DiscoveryRunInput) {
  if (input.channel === "search_engine") { const { processSearchRun } = await import("./search-discovery-process"); return processSearchRun(env, runId, ownerId, input); }
  const providers = input.providers?.length ? input.providers : ["google_maps", "openstreetmap"];
  const totalUnits = input.countries.length * providers.length;
  let doneUnits = 0, discovered = 0, created = 0, googleCount = 0, osmCount = 0, failures = 0;
  await updateRun(env, runId, { status: "running", message: "正在执行所选数据源：" + providers.join("、") });
  await log(env, runId, ownerId, "info", "任务开始；关键词：" + input.query + "；业务类型：" + (input.businessTypes ?? []).join("、") + "；筛选条件：" + JSON.stringify(input.filters ?? {}) + "；数据源：" + providers.join("、"));
  if (providers.includes("openstreetmap")) await log(env, runId, ownerId, "info", "OSM 标签映射：" + (input.osmTags ?? []).map(tag => tag.key + "=" + tag.value).join("、") + "；地区范围：" + [input.city, input.state, countryName(input.countries[0])].filter(Boolean).join(" · "));
  for (const code of input.countries) {
    const scope = [input.city, input.state, countryName(code)].filter(Boolean).join(" · ");
    const osmResult: ProviderResult<OSMElement[]> | null = providers.includes("openstreetmap")
      ? await searchOSM(code, input.osmTags ?? [], input.limitPerCountry, env, input.state, input.city, input.filters).then(value => ({ok:true as const,value})).catch(error => ({ok:false as const,error}))
      : null;
    const googleResult: ProviderResult<GooglePlace[]> | null = providers.includes("google_maps")
      ? await searchGoogle(code, input.query, input.limitPerCountry, env, input.state, input.city, input.businessTypes ?? [], input.filters).then(value => ({ok:true as const,value})).catch(error => ({ok:false as const,error}))
      : null;
    const osm = osmResult?.ok ? osmResult.value : [];
    const google = googleResult?.ok ? googleResult.value : [];
    if (osmResult) {
      doneUnits++; if (osmResult.ok) osmCount += osm.length; else { failures++; await log(env, runId, ownerId, "warning", scope + " · OpenStreetMap 查询失败：" + String(osmResult.error).slice(0,180)); }
      await log(env, runId, ownerId, osmResult.ok ? (osm.length ? "success" : "warning") : "warning", scope + " · OpenStreetMap " + (osmResult.ok ? (osm.length ? "查询完成，返回 " + osm.length + " 条候选" : "查询已执行，但返回 0 条；请检查标签覆盖和地区边界匹配") : "查询失败"));
    }
    if (googleResult) {
      doneUnits++; if (googleResult.ok) googleCount += google.length; else { failures++; await log(env, runId, ownerId, "warning", scope + " · Google Maps 查询失败：" + String(googleResult.error).slice(0,180)); }
      await log(env, runId, ownerId, googleResult.ok ? "success" : "warning", scope + " · Google Maps " + (googleResult.ok ? "返回 " + google.length + " 条候选" : "查询失败"));
    }
    const osmByName = new Map<string, { dedupeKey: string; lat: number | null; lon: number | null }>();
    for (const element of osm) {
      const tags = element.tags ?? {};
      const name = tags.name?.trim();
      if (!name) continue;
      const lat = element.lat ?? element.center?.lat ?? null;
      const lon = element.lon ?? element.center?.lon ?? null;
      const website = tags.website ?? tags["contact:website"] ?? null;
      const phone = tags.phone ?? tags["contact:phone"] ?? null;
      const email = tags.email ?? tags["contact:email"] ?? null;
      const businessType = tags.shop ?? tags.office ?? tags.amenity ?? tags.craft ?? tags.industrial ?? tags.company ?? null;
      const dedupeKey = buildLeadDedupeKey({countryCode:code,name,website,phone,latitude:lat,longitude:lon});
      const address = [tags["addr:housenumber"],tags["addr:street"],tags["addr:city"],tags["addr:state"],tags["addr:postcode"]].filter(Boolean).join(", ") || null;
      await persistDiscoveryRecord(env,ownerId,runId,input,{
        provider:"openstreetmap", externalId:element.type+"/"+element.id, name, countryCode:code,
        address,phone,email,website,businessType,
        confidenceScore:calculateConfidence({provider:"openstreetmap",address,phone,website,email,latitude:lat,longitude:lon,businessType}),
        latitude:lat,longitude:lon,
        sourceUrl:"https://www.openstreetmap.org/"+element.type+"/"+element.id,
        license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",
        rawData:{osm_type:element.type,osm_id:element.id,tags},dedupeKey,
      });
      osmByName.set(normalizeBusinessName(name),{dedupeKey,lat,lon});
      created++;
    }
    for (const place of google) {
      if (!place.id || !place.displayName?.text) continue;
      const name = place.displayName.text.trim();
      const lat = place.location?.latitude ?? null, lon = place.location?.longitude ?? null;
      const address = place.formattedAddress ?? null;
      const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null;
      const website = place.websiteUri ?? null;
      const businessType = place.types?.[0] ?? null;
      const match = osmByName.get(normalizeBusinessName(name));
      const matched = !!match && lat != null && lon != null && match.lat != null && match.lon != null && Math.abs(match.lat-lat)<0.001 && Math.abs(match.lon-lon)<0.001;
      const dedupeKey = matched && match ? match.dedupeKey : buildLeadDedupeKey({countryCode:code,name,latitude:lat,longitude:lon});
      await persistDiscoveryRecord(env,ownerId,runId,input,{
        provider:"google_maps",externalId:place.id,name,countryCode:code,address,phone,website,businessType,
        confidenceScore:calculateConfidence({provider:"google_maps",address,phone,website,latitude:lat,longitude:lon,businessType}),
        latitude:lat,longitude:lon,
        sourceUrl:"https://www.google.com/maps/search/?api=1&query_place_id="+encodeURIComponent(place.id),
        license:"Google Maps Platform Place ID",attribution:"Google Maps",
        rawData:{place_id:place.id,formatted_address:address,phone,website,types:place.types??[],rating:place.rating??null,user_rating_count:place.userRatingCount??null,business_status:place.businessStatus??null},dedupeKey,
      });
      if (!matched) created++;
    }
    discovered = osmCount + googleCount;
    await updateRun(env,runId,{progress:Math.round(doneUnits/totalUnits*100),discovered_count:discovered,created_lead_count:created,message:"已处理 "+scope+" · 发现记录已保存"});
  }
  const status = failures===0 ? "completed" : failures<totalUnits ? "partial" : "failed";
  await updateRun(env,runId,{status,progress:100,discovered_count:discovered,created_lead_count:created,message:"任务结束：OSM "+osmCount+" 条，Google "+googleCount+" 条；发现记录已归档"});
  await log(env,runId,ownerId,status==="completed"?"success":"warning","任务结束。所有发现记录及关键词、来源已保存。");
  return {status,discovered,created,googleCount,osmCount};
}

export async function handleDiscovery(request: Request, env: DiscoveryEnv): Promise<Response> {
  const url = new URL(request.url);
  const userId = await authenticate(request, env);
  if (!userId) return errorResponse(request, "UNAUTHORIZED", "请先登录后再执行潜客发现。", 401);

  if (request.method === "POST" && url.pathname === "/api/v1/discovery-runs") {
    let input: DiscoveryRunInput;
    try { input = await request.json() as DiscoveryRunInput; } catch { return errorResponse(request, "VALIDATION_ERROR", "请求内容不是有效 JSON。", 400); }
    const providers = Array.isArray(input.providers) ? [...new Set(input.providers)] : ["google_maps","openstreetmap"];
    if (!Array.isArray(input.countries) || input.countries.length !== 1 || input.countries.some(code => !/^[A-Z]{2}$/.test(code)) ||
      !input.query?.trim() || !Number.isInteger(input.limitPerCountry) || input.limitPerCountry < 1 || input.limitPerCountry > 500 ||
      providers.length < 1 || providers.some(provider => !["google_maps","openstreetmap"].includes(provider)) ||
      (providers.includes("openstreetmap") && (!Array.isArray(input.osmTags) || input.osmTags.length < 1 || input.osmTags.length > 20 || input.osmTags.some(tag => !tag || typeof tag.key !== "string" || typeof tag.value !== "string" || !/^[a-z0-9_:-]{1,64}$/i.test(tag.key) || !/^[a-z0-9_:-]{1,100}$/i.test(tag.value)))) ||
      (input.businessTypes !== undefined && (!Array.isArray(input.businessTypes) || input.businessTypes.length > 9 || input.businessTypes.some(type => typeof type !== "string" || !(type in BUSINESS_TYPE_FILTERS)))) ||
      (input.filters !== undefined && (!input.filters || typeof input.filters !== "object" || (input.filters.minRating !== undefined && (typeof input.filters.minRating !== "number" || input.filters.minRating < 0 || input.filters.minRating > 5 || input.filters.minRating * 2 % 1 !== 0)) || (input.filters.openNow !== undefined && typeof input.filters.openNow !== "boolean") || (input.filters.requireWebsite !== undefined && typeof input.filters.requireWebsite !== "boolean") || (input.filters.requirePhone !== undefined && typeof input.filters.requirePhone !== "boolean"))) ||
      (input.originalQuery !== undefined && (typeof input.originalQuery !== "string" || input.originalQuery.length > 300)) ||
      (input.translatedQuery !== undefined && (typeof input.translatedQuery !== "string" || input.translatedQuery.length > 300)) ||
      (input.targetLanguage !== undefined && (typeof input.targetLanguage !== "string" || !/^[A-Z]{2}(?:-[A-Z]{2,5})?$/.test(input.targetLanguage))) ||
      (input.state !== undefined && (typeof input.state !== "string" || !input.state.trim())) ||
      (input.city !== undefined && (typeof input.city !== "string" || !input.city.trim()))) {
      return errorResponse(request,"VALIDATION_ERROR","请选择一个国家和至少一个数据源；关键词、地区、数量或 OSM 标签映射无效。",400);
    }
    input.providers = providers as DiscoveryProvider[];
    if (input.osmTags) input.osmTags = [...new Map(input.osmTags.map(tag => [tag.key + "=" + tag.value, {key:tag.key,value:tag.value}])).values()];
    const code=input.countries[0], scope=[input.city,input.state,countryName(code)].filter(Boolean).join(" · ");
    const rows=await db<Array<{id:string;task_code:string}>>(env,"discovery_runs",{
      method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({owner_id:userId,query:input.query.trim(),countries:input.countries,limit_per_country:input.limitPerCountry,state:input.state??null,city:input.city??null,providers,search_config:{businessTypes:input.businessTypes??[],filters:input.filters??{},osmTags:input.osmTags??[],originalQuery:input.originalQuery??null,translatedQuery:input.translatedQuery??null,targetLanguage:input.targetLanguage??null},channel:"map_local_businesses",status:"queued",progress:0,discovered_count:0,created_lead_count:0,message:"任务已排队 · "+scope,task_code:"MAP-"+code+"-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase()})
    });
    const run=rows?.[0]; if(!run?.id) throw new Error("DISCOVERY_RUN_CREATE_FAILED");
    await log(env,run.id,userId,"info","任务编号："+run.task_code+"；关键词："+input.query+(input.originalQuery?"（原始关键词："+input.originalQuery+"）":"")+"；业务类型："+(input.businessTypes??[]).join("、")+"；数据源："+providers.join("、"));
    try { await env.LEAD_DISCOVERY_WORKFLOW.create({id:run.id,params:{runId:run.id,ownerId:userId,input}}); }
    catch(error){await markRunFailed(env,run.id,userId,error);return errorResponse(request,"WORKFLOW_START_FAILED","任务创建成功，但后台工作流启动失败。",503);}
    return successResponse(request,{id:run.id,taskCode:run.task_code,channel:"map_local_businesses",query:input.query,countries:input.countries,providers,searchConfig:{businessTypes:input.businessTypes??[],filters:input.filters??{},osmTags:input.osmTags??[],originalQuery:input.originalQuery??null,translatedQuery:input.translatedQuery??null,targetLanguage:input.targetLanguage??null},status:"queued",progress:0,discoveredCount:0,createdLeadCount:0,message:"任务已排队 · "+scope},202);
  }

  if(request.method==="GET" && url.pathname==="/api/v1/discovery-runs"){
    const rows=await db<Array<Record<string,unknown>>>(env,"discovery_runs?owner_id=eq."+userId+"&select=*&order=created_at.desc&limit=200");
    return successResponse(request,(rows??[]).map(row=>({id:row.id,taskCode:row.task_code,channel:row.channel,query:row.query,countries:row.countries,state:row.state,city:row.city,providers:row.providers,status:row.status,progress:row.progress,discoveredCount:row.discovered_count,createdLeadCount:row.created_lead_count,message:row.message,searchConfig:row.search_config??{},createdAt:row.created_at})));
  }

  const runMatch=url.pathname.match(/^\/api\/v1\/discovery-runs\/([0-9a-f-]+)$/i);
  if(request.method==="GET" && runMatch){
    const rows=await db<Array<Record<string,unknown>>>(env,"discovery_runs?id=eq."+runMatch[1]+"&owner_id=eq."+userId+"&select=*");
    if(!rows[0]) return errorResponse(request,"NOT_FOUND","找不到该发现任务。",404);
    const logs=await db<Array<Record<string,unknown>>>(env,"discovery_run_logs?run_id=eq."+runMatch[1]+"&owner_id=eq."+userId+"&select=id,level,message,created_at&order=created_at.asc");
    const row=rows[0];
    return successResponse(request,{id:row.id,taskCode:row.task_code,channel:row.channel,query:row.query,countries:row.countries,state:row.state,city:row.city,providers:row.providers,status:row.status,progress:row.progress,discoveredCount:row.discovered_count,createdLeadCount:row.created_lead_count,message:row.message,searchConfig:row.search_config??{},createdAt:row.created_at,logs:(logs??[]).map(item=>({id:item.id,level:item.level,message:item.message,createdAt:item.created_at}))});
  }

  if(request.method==="GET" && url.pathname==="/api/v1/discovery-records"){
    const runId=url.searchParams.get("runId"),status=url.searchParams.get("status"),limit=Math.min(500,Math.max(1,Number(url.searchParams.get("limit"))||250));
    const filters=["owner_id=eq."+userId,"channel=eq.map_local_businesses","select=*,discovery_record_occurrences!inner(id,run_id,provider,keyword,external_id,source_url,license,attribution,raw_data,captured_at,is_removed,run:discovery_runs!discovery_record_occurrences_run_id_owner_id_fkey(task_code,query))","order=created_at.desc","limit="+limit];
    filters.push("discovery_record_occurrences.is_removed=eq.false");
    if(runId) filters.push("discovery_record_occurrences.run_id=eq."+runId);
    if(status) filters.push("status=eq."+encodeURIComponent(status));
    else filters.push("status=neq.removed");
    const rows=await db<Array<Record<string,unknown>>>(env,"discovery_records?"+filters.join("&"));
    return successResponse(request,rows??[]);
  }

  const actionMatch=url.pathname.match(/^\/api\/v1\/discovery-records\/([0-9a-f-]+)\/action$/i);
  if(request.method==="POST" && actionMatch){
    let body:{action?:string;runId?:string};try{body=await request.json() as {action?:string;runId?:string};}catch{return errorResponse(request,"VALIDATION_ERROR","请求内容不是有效 JSON。",400);}
    const rows=await db<Array<Record<string,unknown>>>(env,"discovery_records?id=eq."+actionMatch[1]+"&owner_id=eq."+userId+"&select=*");
    const record=rows?.[0];if(!record)return errorResponse(request,"NOT_FOUND","找不到该搜索结果。",404);
    if(body.action==="remove"){
      if(typeof body.runId==="string" && /^[0-9a-f-]{36}$/i.test(body.runId)){
        const occurrences=await db<Array<{id:string}>>(env,"discovery_record_occurrences?owner_id=eq."+userId+"&record_id=eq."+record.id+"&run_id=eq."+body.runId+"&select=id");
        if(!occurrences.length)return errorResponse(request,"NOT_FOUND","当前任务中找不到该客户的发现记录。",404);
        await db(env,"discovery_record_occurrences?owner_id=eq."+userId+"&record_id=eq."+record.id+"&run_id=eq."+body.runId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({is_removed:true})});
        return successResponse(request,{id:record.id,status:"removed",scope:"run"});
      }
      await db(env,"discovery_records?id=eq."+actionMatch[1]+"&owner_id=eq."+userId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"removed",updated_at:new Date().toISOString()})});
      return successResponse(request,{id:record.id,status:"removed",scope:"channel"});
    }
    if(body.action==="discard"){
      await db(env,"discovery_records?id=eq."+actionMatch[1]+"&owner_id=eq."+userId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"discarded",updated_at:new Date().toISOString()})});
      return successResponse(request,{id:record.id,status:"discarded"});
    }
    if(body.action==="promote"){
      if(record.status==="promoted" && record.lead_id)return successResponse(request,{id:record.id,status:"promoted",leadId:record.lead_id});
      const existing=await db<Array<{id:string}>>(env,"leads?owner_id=eq."+userId+"&discovery_record_id=eq."+record.id+"&select=id");
      let leadId=existing?.[0]?.id;
      if(!leadId){
        const created=await db<Array<{id:string}>>(env,"leads",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:userId,name:record.name,country_code:record.country_code??"ZZ",address:record.address,phone:record.phone,email:record.email,website:record.website,business_type:record.business_type,confidence_score:record.confidence_score,latitude:record.latitude,longitude:record.longitude,status:"qualified",dedupe_key:"discovery:"+record.id,discovery_record_id:record.id,entity_id:record.entity_id,is_formal:true})});
        leadId=created?.[0]?.id;
      }
      if(!leadId)throw new Error("LEAD_PROMOTION_FAILED");
      await db(env,"discovery_records?id=eq."+record.id+"&owner_id=eq."+userId,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"promoted",lead_id:leadId,updated_at:new Date().toISOString()})});
      return successResponse(request,{id:record.id,status:"promoted",leadId});
    }
    return errorResponse(request,"VALIDATION_ERROR","不支持的操作。",400);
  }

  if(request.method==="GET" && url.pathname==="/api/v1/leads"){
    const rows=await db<Array<Record<string,unknown>>>(env,"leads?owner_id=eq."+userId+"&is_formal=eq.true&select=*,discovery_record:discovery_records!leads_discovery_record_owner_fkey(id,channel,name,raw_data,discovery_record_occurrences(provider,keyword,source_url))&order=created_at.desc&limit=500");
    return successResponse(request,rows??[]);
  }
  return errorResponse(request,"NOT_FOUND","The requested discovery endpoint does not exist.",404);
}
