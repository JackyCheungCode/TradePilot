import { errorResponse, successResponse } from "../lib/http";
import { buildLeadDedupeKey, normalizeBusinessName } from "../lib/deduplication";

export interface DiscoveryEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_MAPS_API_KEY?: string;
  LEAD_DISCOVERY_WORKFLOW: { create(options: { id: string; params: { runId: string; ownerId: string; input: DiscoveryRunInput } }): Promise<{ id: string }> };
  OVERPASS_API_URL?: string;
}
export type DiscoveryProvider = "google_maps" | "openstreetmap";
export interface DiscoveryRunInput { countries: string[]; query: string; limitPerCountry: number; providers: DiscoveryProvider[]; state?: string; city?: string; }
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
async function searchOSM(code: string, query: string, limit: number, env: DiscoveryEnv, state?: string, city?: string): Promise<OSMElement[]> {
  const overpassEndpoints = env.OVERPASS_API_URL
    ? [env.OVERPASS_API_URL]
    : ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"];
  const safeQuery = query.normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  const terms = safeQuery.split(/\s+/).filter((word) => word.length > 2 && !["the", "and", "for", "with", "from"].includes(word.toLowerCase())).slice(0, 4);
  const pattern = terms.join("|") || ".*";
  const scopeName = city || state;
  const scopeClause = scopeName
    ? 'area["name"="' + overpassLiteral(scopeName) + '"](area.a)->.target;'
    : ".a->.target;";
  const q = '[out:json][timeout:45];area["ISO3166-1"="' + code + '"][admin_level=2]->.a;' + scopeClause + '(' +
    'nwr["name"~"' + pattern + '",i](area.target);' +
    'nwr["shop"~"electronics|electrical|computer|mobile_phone|hardware|wholesale|' + pattern + '",i](area.target);' +
    'nwr["office"~"' + pattern + '",i](area.target);' +
    'nwr["amenity"~"' + pattern + '",i](area.target);nwr["craft"~"' + pattern + '",i](area.target);nwr["industrial"~"' + pattern + '",i](area.target););out center tags ' + Math.min(500, limit) + ';';
  const failures: string[] = [];
  for (let index = 0; index < overpassEndpoints.length; index++) {
    const endpoint = overpassEndpoints[index];
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "TradePilot/0.1 (lead discovery)" },
        body: "data=" + encodeURIComponent(q),
        signal: AbortSignal.timeout(55000),
      });
      if (!response.ok) {
        failures.push(new URL(endpoint).host + ":OVERPASS_" + response.status);
        if ([429, 502, 503, 504, 521, 522, 524].includes(response.status) && index < overpassEndpoints.length - 1) continue;
        throw new Error("OVERPASS_" + response.status + (failures.length ? " (" + failures.join(", ") + ")" : ""));
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
async function searchGoogle(code: string, query: string, limit: number, env: DiscoveryEnv, state?: string, city?: string): Promise<GooglePlace[]> {
  if (!env.GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY_NOT_CONFIGURED");
  const location = [city, state, countryName(code)].filter(Boolean).join(", ");
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.types,places.rating,places.userRatingCount,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query + " in " + location, regionCode: code, maxResultCount: Math.min(20, limit) }),
  });
  if (!response.ok) throw new Error("GOOGLE_PLACES_" + response.status);
  const body = await response.json() as { places?: GooglePlace[] };
  return body.places ?? [];
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
  const rows = await db<Array<{ id: string }>>(env, "discovery_records?on_conflict=owner_id,channel,dedupe_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      owner_id: ownerId, channel: "map_local_businesses", record_type: "business", entity_id: entityId,
      name: item.name, country_code: item.countryCode, address: item.address ?? null,
      phone: item.phone ?? null, website: item.website ?? null,
      latitude: item.latitude ?? null, longitude: item.longitude ?? null,
      dedupe_key: item.dedupeKey, raw_data: item.rawData,
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
  const providers = input.providers?.length ? input.providers : ["google_maps", "openstreetmap"];
  const totalUnits = input.countries.length * providers.length;
  let doneUnits = 0, discovered = 0, created = 0, googleCount = 0, osmCount = 0, failures = 0;
  await updateRun(env, runId, { status: "running", message: "正在执行所选数据源：" + providers.join("、") });
  await log(env, runId, ownerId, "info", "任务开始；关键词：" + input.query + "；数据源：" + providers.join("、"));
  for (const code of input.countries) {
    const scope = [input.city, input.state, countryName(code)].filter(Boolean).join(" · ");
    const osmResult: ProviderResult<OSMElement[]> | null = providers.includes("openstreetmap")
      ? await searchOSM(code, input.query, input.limitPerCountry, env, input.state, input.city).then(value => ({ok:true as const,value})).catch(error => ({ok:false as const,error}))
      : null;
    const googleResult: ProviderResult<GooglePlace[]> | null = providers.includes("google_maps")
      ? await searchGoogle(code, input.query, input.limitPerCountry, env, input.state, input.city).then(value => ({ok:true as const,value})).catch(error => ({ok:false as const,error}))
      : null;
    const osm = osmResult?.ok ? osmResult.value : [];
    const google = googleResult?.ok ? googleResult.value : [];
    if (osmResult) {
      doneUnits++; if (osmResult.ok) osmCount += osm.length; else { failures++; await log(env, runId, ownerId, "warning", scope + " · OpenStreetMap 查询失败：" + String(osmResult.error).slice(0,180)); }
      await log(env, runId, ownerId, osmResult.ok ? "success" : "warning", scope + " · OpenStreetMap " + (osmResult.ok ? "返回 " + osm.length + " 条候选" : "查询失败"));
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
      const dedupeKey = buildLeadDedupeKey({countryCode:code,name,website,phone,latitude:lat,longitude:lon});
      const address = [tags["addr:housenumber"],tags["addr:street"],tags["addr:city"],tags["addr:state"],tags["addr:postcode"]].filter(Boolean).join(", ") || null;
      await persistDiscoveryRecord(env,ownerId,runId,input,{
        provider:"openstreetmap", externalId:element.type+"/"+element.id, name, countryCode:code,
        address,phone,website,latitude:lat,longitude:lon,
        sourceUrl:"https://www.openstreetmap.org/"+element.type+"/"+element.id,
        license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",
        email,businessType,confidenceScore:calculateConfidence({provider:"openstreetmap",address,phone,website,email,latitude:lat,longitude:lon,businessType}),\n        rawData:{osm_type:element.type,osm_id:element.id,tags},dedupeKey,
      });
      osmByName.set(normalizeBusinessName(name),{dedupeKey,lat,lon});
      created++;
    }
    for (const place of google) {
      if (!place.id || !place.displayName?.text) continue;
      const name = place.displayName.text.trim();
      const lat = place.location?.latitude ?? null, lon = place.location?.longitude ?? null;
      const match = osmByName.get(normalizeBusinessName(name));
      const matched = !!match && lat != null && lon != null && match.lat != null && match.lon != null && Math.abs(match.lat-lat)<0.001 && Math.abs(match.lon-lon)<0.001;
      const dedupeKey = matched && match ? match.dedupeKey : buildLeadDedupeKey({countryCode:code,name,latitude:lat,longitude:lon});
      await persistDiscoveryRecord(env,ownerId,runId,input,{
        provider:"google_maps",externalId:place.id,name,countryCode:code,address,phone,website,businessType,latitude:lat,longitude:lon,\n        confidenceScore:calculateConfidence({provider:"google_maps",address,phone,website,latitude:lat,longitude:lon,businessType}),
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
      (input.state !== undefined && (typeof input.state !== "string" || !input.state.trim())) ||
      (input.city !== undefined && (typeof input.city !== "string" || !input.city.trim()))) {
      return errorResponse(request,"VALIDATION_ERROR","请选择一个国家和至少一个数据源；关键词、地区或数量参数无效。",400);
    }
    input.providers = providers as DiscoveryProvider[];
    const code=input.countries[0], scope=[input.city,input.state,countryName(code)].filter(Boolean).join(" · ");
    const rows=await db<Array<{id:string;task_code:string}>>(env,"discovery_runs",{
      method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({owner_id:userId,query:input.query.trim(),countries:input.countries,limit_per_country:input.limitPerCountry,state:input.state??null,city:input.city??null,providers,channel:"map_local_businesses",status:"queued",progress:0,discovered_count:0,created_lead_count:0,message:"任务已排队 · "+scope,task_code:"MAP-"+code+"-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase()})
    });
    const run=rows?.[0]; if(!run?.id) throw new Error("DISCOVERY_RUN_CREATE_FAILED");
    await log(env,run.id,userId,"info","任务编号："+run.task_code+"；关键词："+input.query+"；数据源："+providers.join("、"));
    try { await env.LEAD_DISCOVERY_WORKFLOW.create({id:run.id,params:{runId:run.id,ownerId:userId,input}}); }
    catch(error){await markRunFailed(env,run.id,userId,error);return errorResponse(request,"WORKFLOW_START_FAILED","任务创建成功，但后台工作流启动失败。",503);}
    return successResponse(request,{id:run.id,taskCode:run.task_code,channel:"map_local_businesses",query:input.query,countries:input.countries,providers,status:"queued",progress:0,discoveredCount:0,createdLeadCount:0,message:"任务已排队 · "+scope},202);
  }

  if(request.method==="GET" && url.pathname==="/api/v1/discovery-runs"){
    const rows=await db<Array<Record<string,unknown>>>(env,"discovery_runs?owner_id=eq."+userId+"&select=*&order=created_at.desc&limit=200");
    return successResponse(request,(rows??[]).map(row=>({id:row.id,taskCode:row.task_code,channel:row.channel,query:row.query,countries:row.countries,state:row.state,city:row.city,providers:row.providers,status:row.status,progress:row.progress,discoveredCount:row.discovered_count,createdLeadCount:row.created_lead_count,message:row.message,createdAt:row.created_at})));
  }

  const runMatch=url.pathname.match(/^\/api\/v1\/discovery-runs\/([0-9a-f-]+)$/i);
  if(request.method==="GET" && runMatch){
    const rows=await db<Array<Record<string,unknown>>>(env,"discovery_runs?id=eq."+runMatch[1]+"&owner_id=eq."+userId+"&select=*");
    if(!rows[0]) return errorResponse(request,"NOT_FOUND","找不到该发现任务。",404);
    const logs=await db<Array<Record<string,unknown>>>(env,"discovery_run_logs?run_id=eq."+runMatch[1]+"&owner_id=eq."+userId+"&select=id,level,message,created_at&order=created_at.asc");
    const row=rows[0];
    return successResponse(request,{id:row.id,taskCode:row.task_code,channel:row.channel,query:row.query,countries:row.countries,state:row.state,city:row.city,providers:row.providers,status:row.status,progress:row.progress,discoveredCount:row.discovered_count,createdLeadCount:row.created_lead_count,message:row.message,createdAt:row.created_at,logs:(logs??[]).map(item=>({id:item.id,level:item.level,message:item.message,createdAt:item.created_at}))});
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
        const created=await db<Array<{id:string}>>(env,"leads",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:userId,name:record.name,country_code:record.country_code??"ZZ",address:record.address,phone:record.phone,website:record.website,latitude:record.latitude,longitude:record.longitude,status:"qualified",dedupe_key:"discovery:"+record.id,discovery_record_id:record.id,entity_id:record.entity_id,is_formal:true})});
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
