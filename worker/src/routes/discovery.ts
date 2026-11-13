import { errorResponse, successResponse } from "../lib/http";

import isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
isoCountries.registerLocale(enLocale);
interface Env {
 SUPABASE_URL: string;
 SUPABASE_ANON_KEY: string;
 SUPABASE_SERVICE_ROLE_KEY: string;
 GOOGLE_MAPS_API_KEY?: string;
 OVERPASS_API_URL?: string;
}
interface RunInput { countries: string[]; query: string; limitPerCountry: number; }
interface OSMElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string,string>; }
interface GooglePlace { id?: string; displayName?: { text?: string }; location?: { latitude?: number; longitude?: number }; }

async function authenticate(request: Request, env: Env): Promise<string | null> {
 const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
 if (!token) return null;
 const response = await fetch(env.SUPABASE_URL + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token } });
 if (!response.ok) return null;
 const user = await response.json() as { id?: string };
 return user.id ?? null;
}
async function db<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
 const response = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", ...init.headers } });
 if (!response.ok) throw new Error("DATABASE_" + response.status + ": " + (await response.text()).slice(0, 400));
 if (response.status === 204) return undefined as T;
 return await response.json() as T;
}
async function log(env: Env, runId: string, ownerId: string, level: string, message: string) {
 await db(env, "discovery_run_logs", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ run_id: runId, owner_id: ownerId, level, message }) });
}
async function updateRun(env: Env, id: string, patch: Record<string, unknown>) {
 await db(env, "discovery_runs?id=eq." + id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
}
function normalizeHost(value?: string) {
 if (!value) return "";
 try { return new URL(value.startsWith("http") ? value : "https://" + value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
function normalizeName(value: string) { return value.normalize("NFKD").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, " ").trim(); }
function countryName(code: string) {
 const special: Record<string,string> = { HK:"Hong Kong", MO:"Macao", TW:"Taiwan" };
 return special[code] ?? isoCountries.getName(code, "en") ?? code;
}
async function searchOSM(code: string, query: string, limit: number, env: Env): Promise<OSMElement[]> {
 const overpass = env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";
 const escaped = code.replace(/[^A-Z]/g, "");
 const terms = query.split(/\\s+/).filter((word) => word.length > 2 && !["the","and","for","with","from"].includes(word.toLowerCase())).slice(0,4);
 const pattern = terms.map((word) => word.replace(/[.*+?^$()|[\\]\\\\]/g, "\\\\const q = `[out:json][timeout:45];area["ISO3166-1"="${escaped}"][admin_level=2]->.a;(nwr["name"]["shop"](area.a);nwr["name"]["office"](area.a);nwr["name"]["craft"](area.a);nwr["name"]["industrial"](area.a);nwr["name"]["amenity"](area.a);nwr["name"]["man_made"](area.a););out center tags ${Math.min(500,limit)};`;")).join("|");
 const q = `[out:json][timeout:45];area["ISO3166-1"="${escaped}"][admin_level=2]->.a;(nwr["name"~"${pattern}",i](area.a);nwr["shop"~"electronics|electrical|computer|mobile_phone|hardware|wholesale",i](area.a);nwr["office"~"company|industrial|telecommunication",i](area.a);nwr["craft"](area.a);nwr["industrial"](area.a););out center tags ${Math.min(500,limit)};`;
 const response = await fetch(overpass, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "TradePilot/0.1 (lead discovery)" }, body: "data=" + encodeURIComponent(q) });
 if (!response.ok) throw new Error("OVERPASS_" + response.status);
 const body = await response.json() as { elements?: OSMElement[] };
 const term = normalizeName(query.split(/\s+/).slice(0,2).join(" "));
 return (body.elements ?? []).filter((e) => e.tags?.name).slice(0, limit);
}
async function searchGoogle(code: string, query: string, limit: number, env: Env): Promise<GooglePlace[]> {
 if (!env.GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY_NOT_CONFIGURED");
 const response = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.location" }, body: JSON.stringify({ textQuery: query + " in " + countryName(code), regionCode: code, maxResultCount: Math.min(20, limit) }) });
 if (!response.ok) throw new Error("GOOGLE_PLACES_" + response.status);
 const body = await response.json() as { places?: GooglePlace[] };
 return body.places ?? [];
}
async function processRun(env: Env, runId: string, ownerId: string, input: RunInput) {
 const totalUnits = input.countries.length * 2; let doneUnits = 0; let discovered = 0; let created = 0; let googleCount = 0; let osmCount = 0; let failures = 0;
 await updateRun(env, runId, { status: "running", message: "正在并行查询 Google Maps 与 OpenStreetMap" });
 await log(env, runId, ownerId, "info", "双数据源并行发现任务开始");
 for (const code of input.countries) {
  const [osmResult, googleResult] = await Promise.allSettled([searchOSM(code, input.query, input.limitPerCountry, env), searchGoogle(code, input.query, input.limitPerCountry, env)]);
  const osm = osmResult.status === "fulfilled" ? osmResult.value : [];
  const google = googleResult.status === "fulfilled" ? googleResult.value : [];
  if (osmResult.status === "rejected") { failures++; await log(env, runId, ownerId, "warning", code + " · OpenStreetMap 查询失败：" + String(osmResult.reason).slice(0,180)); }
  else await log(env, runId, ownerId, "success", code + " · OpenStreetMap 返回 " + osm.length + " 条候选");
  if (googleResult.status === "rejected") { failures++; await log(env, runId, ownerId, "warning", code + " · Google Maps 查询失败：" + String(googleResult.reason).slice(0,180)); }
  else { googleCount += google.length; await log(env, runId, ownerId, "success", code + " · Google Maps 返回 " + google.length + " 条候选（仅保留允许持久化的 Place ID）"); }
  osmCount += osm.length; discovered += osm.length + google.length;
  const googleMatches = google.filter((g) => g.id && g.displayName?.text && g.location?.latitude != null && g.location?.longitude != null);
  for (const item of osm) {
   const tags = item.tags ?? {}; const name = tags.name; if (!name) continue;
   const lat = item.lat ?? item.center?.lat; const lon = item.lon ?? item.center?.lon;
   const website = tags.website ?? tags["contact:website"] ?? null; const phone = tags.phone ?? tags["contact:phone"] ?? null;
   const host = normalizeHost(website); const phoneKey = (phone ?? "").replace(/\\D/g, ""); const geoKey = lat != null && lon != null ? Math.round(lat * 1000) + ":" + Math.round(lon * 1000) : "no-geo"; const dedupeKey = host ? "domain:" + host : phoneKey.length >= 7 ? "phone:" + phoneKey : "name:" + code + ":" + normalizeName(name) + ":" + geoKey;
   const addr = [tags["addr:housenumber"],tags["addr:street"],tags["addr:city"],tags["addr:state"],tags["addr:postcode"]].filter(Boolean).join(", ") || null;
   const matchedGoogle = googleMatches.find((g) => normalizeName(g.displayName?.text ?? "") === normalizeName(name) && lat != null && lon != null && Math.abs((g.location?.latitude ?? 99)-lat) < 0.001 && Math.abs((g.location?.longitude ?? 99)-lon) < 0.001);
   const leadRows = await db<Array<{id:string}>>(env, "leads?on_conflict=owner_id,dedupe_key", { method:"POST", headers:{ Prefer:"resolution=merge-duplicates,return=representation" }, body:JSON.stringify({ owner_id:ownerId, name, country_code:code, address:addr, phone, website, latitude:lat ?? null, longitude:lon ?? null, status:"draft", dedupe_key:dedupeKey }) });
   const leadId = leadRows[0]?.id; if (!leadId) continue;
   await db(env, "lead_sources?on_conflict=provider,external_id", { method:"POST", headers:{ Prefer:"resolution=merge-duplicates,return=minimal" }, body:JSON.stringify({ lead_id:leadId, owner_id:ownerId, provider:"openstreetmap", external_id:item.type + "/" + item.id, source_url:"https://www.openstreetmap.org/" + item.type + "/" + item.id, license:"ODbL-1.0", attribution:"© OpenStreetMap contributors", metadata:{ osm_type:item.type, osm_id:item.id, tags } }) });
   if (matchedGoogle?.id) await db(env, "lead_sources?on_conflict=provider,external_id", { method:"POST", headers:{ Prefer:"resolution=merge-duplicates,return=minimal" }, body:JSON.stringify({ lead_id:leadId, owner_id:ownerId, provider:"google_maps", external_id:matchedGoogle.id, source_url:"https://www.google.com/maps/search/?api=1&query_place_id=" + encodeURIComponent(matchedGoogle.id), license:"Google Maps Platform Place ID", attribution:"Google Maps", metadata:{} }) });
   created++;
  }
  doneUnits += 2; await updateRun(env, runId, { progress: Math.round(doneUnits / totalUnits * 100), discovered_count:discovered, created_lead_count:created, message:"已完成 " + code + " 的双源查询与线索归并" });
 }
 const status = failures === 0 ? "completed" : failures < totalUnits ? "partial" : "failed";
 await updateRun(env, runId, { status, progress:100, discovered_count:discovered, created_lead_count:created, message:"任务结束：OSM " + osmCount + " 条，Google " + googleCount + " 条，草稿线索 " + created + " 条" });
 await log(env, runId, ownerId, status === "completed" ? "success" : "warning", "任务结束。OSM " + osmCount + " 条；Google " + googleCount + " 条；草稿线索 " + created + " 条。Google 独有记录不持久化。");
}
export async function handleDiscovery(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
 const url = new URL(request.url); const userId = await authenticate(request, env);
 if (!userId) return errorResponse(request, "UNAUTHORIZED", "请先登录后再执行潜客发现。", 401);
 if (request.method === "POST" && url.pathname === "/api/v1/discovery-runs") {
  let input: RunInput; try { input = await request.json() as RunInput; } catch { return errorResponse(request,"VALIDATION_ERROR","请求内容不是有效 JSON。",400); }
  if (!Array.isArray(input.countries) || !input.countries.length || input.countries.some((c) => !/^[A-Z]{2}$/.test(c)) || !input.query?.trim() || !Number.isInteger(input.limitPerCountry) || input.limitPerCountry < 1 || input.limitPerCountry > 500) return errorResponse(request,"VALIDATION_ERROR","国家、关键词或数量参数无效。",400);
  const rows = await db<Array<{id:string;status:string;progress:number}>>(env,"discovery_runs",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:userId,query:input.query,countries:input.countries,limit_per_country:input.limitPerCountry,status:"queued",progress:0,discovered_count:0,created_lead_count:0,message:"任务已排队"})});
  const run = rows[0]; await log(env,run.id,userId,"info","任务已创建，准备启动两个数据源");
  ctx.waitUntil(processRun(env,run.id,userId,input).catch(async (error) => { await updateRun(env,run.id,{status:"failed",message:"任务执行失败"}); await log(env,run.id,userId,"error","任务异常终止：" + String(error).slice(0,300)); }));
  return successResponse(request,{id:run.id,status:"queued",progress:0,discoveredCount:0,createdLeadCount:0,message:"任务已排队"},202);
 }
 const match = url.pathname.match(/^\/api\/v1\/discovery-runs\/([0-9a-f-]+)$/i);
 if (request.method === "GET" && match) {
  const rows = await db<Array<Record<string,unknown>>>(env,"discovery_runs?id=eq."+match[1]+"&owner_id=eq."+userId+"&select=*");
  if (!rows[0]) return errorResponse(request,"NOT_FOUND","找不到该发现任务。",404);
  const logs = await db<Array<Record<string,unknown>>>(env,"discovery_run_logs?run_id=eq."+match[1]+"&owner_id=eq."+userId+"&select=id,level,message,created_at&order=created_at.asc");
  const row=rows[0]; return successResponse(request,{id:row.id,status:row.status,progress:row.progress,discoveredCount:row.discovered_count,createdLeadCount:row.created_lead_count,message:row.message,logs:logs.map((l)=>({id:l.id,level:l.level,message:l.message,createdAt:l.created_at}))});
 }
 return errorResponse(request,"NOT_FOUND","The requested discovery endpoint does not exist.",404);
}
