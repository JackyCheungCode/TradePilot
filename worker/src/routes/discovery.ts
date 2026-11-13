import { errorResponse, successResponse } from "../lib/http";
import { buildLeadDedupeKey, normalizeBusinessName } from "../lib/deduplication";

export interface DiscoveryEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_MAPS_API_KEY?: string;
  LEAD_DISCOVERY_WORKFLOW: { create(options: { id: string; params: { runId: string; ownerId: string; input: DiscoveryDiscoveryRunInput } }): Promise<{ id: string }> };
  OVERPASS_API_URL?: string;
}
export interface DiscoveryDiscoveryRunInput { countries: string[]; query: string; limitPerCountry: number; }
interface OSMElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; }
interface GooglePlace { id?: string; displayName?: { text?: string }; location?: { latitude?: number; longitude?: number }; }
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
  if (!response.ok) throw new Error("DATABASE_" + response.status + ": " + (await response.text()).slice(0, 400));
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
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
async function searchOSM(code: string, query: string, limit: number, env: DiscoveryEnv): Promise<OSMElement[]> {
  const overpass = env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";
  const safeQuery = query.normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  const terms = safeQuery.split(/\s+/).filter((word) => word.length > 2 && !["the", "and", "for", "with", "from"].includes(word.toLowerCase())).slice(0, 4);
  const pattern = terms.join("|") || ".*";
  const q = '[out:json][timeout:45];area["ISO3166-1"="' + code + '"][admin_level=2]->.a;(' +
    'nwr["name"~"' + pattern + '",i](area.a);' +
    'nwr["shop"~"electronics|electrical|computer|mobile_phone|hardware|wholesale|' + pattern + '",i](area.a);' +
    'nwr["office"~"' + pattern + '",i](area.a);' +
    'nwr["amenity"~"' + pattern + '",i](area.a);nwr["craft"~"' + pattern + '",i](area.a);nwr["industrial"~"' + pattern + '",i](area.a););out center tags ' + Math.min(500, limit) + ';';
  const response = await fetch(overpass, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "TradePilot/0.1 (lead discovery)" },
    body: "data=" + encodeURIComponent(q),
  });
  if (!response.ok) throw new Error("OVERPASS_" + response.status);
  const body = await response.json() as { elements?: OSMElement[] };
  return (body.elements ?? []).filter((element) => element.tags?.name).slice(0, limit);
}
async function searchGoogle(code: string, query: string, limit: number, env: DiscoveryEnv): Promise<GooglePlace[]> {
  if (!env.GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY_NOT_CONFIGURED");
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location",
    },
    body: JSON.stringify({ textQuery: query + " in " + countryName(code), regionCode: code, maxResultCount: Math.min(20, limit) }),
  });
  if (!response.ok) throw new Error("GOOGLE_PLACES_" + response.status);
  const body = await response.json() as { places?: GooglePlace[] };
  return body.places ?? [];
}
export async function processRun(env: DiscoveryEnv, runId: string, ownerId: string, input: DiscoveryDiscoveryRunInput) {
  const totalUnits = input.countries.length * 2;
  let doneUnits = 0, discovered = 0, created = 0, googleCount = 0, osmCount = 0, failures = 0;
  await updateRun(env, runId, { status: "running", message: "正在并行查询 Google Maps 与 OpenStreetMap" });
  await log(env, runId, ownerId, "info", "双数据源并行发现任务开始");
  for (const code of input.countries) {
    const updateProgress = async () => updateRun(env, runId, {
      progress: Math.round(doneUnits / totalUnits * 100),
      discovered_count: discovered,
      created_lead_count: created,
      message: "正在处理 " + code + " · 双源并行查询",
    });
    const osmPromise: Promise<ProviderResult<OSMElement[]>> = searchOSM(code, input.query, input.limitPerCountry, env)
      .then(async (value) => { osmCount += value.length; discovered += value.length; doneUnits++; await log(env, runId, ownerId, "success", code + " · OpenStreetMap 返回 " + value.length + " 条候选"); await updateProgress(); return { ok: true, value }; })
      .catch(async (error) => { failures++; doneUnits++; await log(env, runId, ownerId, "warning", code + " · OpenStreetMap 查询失败：" + String(error).slice(0, 180)); await updateProgress(); return { ok: false, error }; });
    const googlePromise: Promise<ProviderResult<GooglePlace[]>> = searchGoogle(code, input.query, input.limitPerCountry, env)
      .then(async (value) => { googleCount += value.length; discovered += value.length; doneUnits++; await log(env, runId, ownerId, "success", code + " · Google Maps 返回 " + value.length + " 条候选（仅持久化允许保留的 Place ID）"); await updateProgress(); return { ok: true, value }; })
      .catch(async (error) => { failures++; doneUnits++; await log(env, runId, ownerId, "warning", code + " · Google Maps 查询失败：" + String(error).slice(0, 180)); await updateProgress(); return { ok: false, error }; });
    const [osmResult, googleResult] = await Promise.all([osmPromise, googlePromise]);
    const osm = osmResult.ok ? osmResult.value : [];
    const google = googleResult.ok ? googleResult.value : [];
    const googleMatches = google.filter((place) => place.id && place.displayName?.text && place.location?.latitude != null && place.location?.longitude != null);
    for (const item of osm) {
      const tags = item.tags ?? {};
      const name = tags.name;
      if (!name) continue;
      const lat = item.lat ?? item.center?.lat;
      const lon = item.lon ?? item.center?.lon;
      const website = tags.website ?? tags["contact:website"] ?? null;
      const phone = tags.phone ?? tags["contact:phone"] ?? null;
      const dedupeKey = buildLeadDedupeKey({ countryCode: code, name, website, phone, latitude: lat, longitude: lon });
      const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(", ") || null;
      const matchedGoogle = googleMatches.find((place) =>
        normalizeBusinessName(place.displayName?.text ?? "") === normalizeBusinessName(name) &&
        lat != null && lon != null &&
        Math.abs((place.location?.latitude ?? 99) - lat) < 0.001 &&
        Math.abs((place.location?.longitude ?? 99) - lon) < 0.001
      );
      const leadRows = await db<Array<{ id: string }>>(env, "leads?on_conflict=owner_id,dedupe_key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ owner_id: ownerId, name, country_code: code, address, phone, website, latitude: lat ?? null, longitude: lon ?? null, status: "draft", dedupe_key: dedupeKey }),
      });
      const leadId = leadRows[0]?.id;
      if (!leadId) continue;
      await db(env, "lead_sources?on_conflict=provider,external_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ lead_id: leadId, owner_id: ownerId, provider: "openstreetmap", external_id: item.type + "/" + item.id, source_url: "https://www.openstreetmap.org/" + item.type + "/" + item.id, license: "ODbL-1.0", attribution: "© OpenStreetMap contributors", metadata: { osm_type: item.type, osm_id: item.id, tags } }),
      });
      if (matchedGoogle?.id) await db(env, "lead_sources?on_conflict=provider,external_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ lead_id: leadId, owner_id: ownerId, provider: "google_maps", external_id: matchedGoogle.id, source_url: "https://www.google.com/maps/search/?api=1&query_place_id=" + encodeURIComponent(matchedGoogle.id), license: "Google Maps Platform Place ID", attribution: "Google Maps", metadata: {} }),
      });
      created++;
    }
    await updateRun(env, runId, { discovered_count: discovered, created_lead_count: created, message: "已完成 " + code + " 的候选归并与草稿线索写入" });
  }
  const status = failures === 0 ? "completed" : failures < totalUnits ? "partial" : "failed";
  await updateRun(env, runId, { status, progress: 100, discovered_count: discovered, created_lead_count: created, message: "任务结束：OSM " + osmCount + " 条，Google " + googleCount + " 条，草稿线索 " + created + " 条" });
  await log(env, runId, ownerId, status === "completed" ? "success" : "warning", "任务结束。OSM " + osmCount + " 条；Google " + googleCount + " 条；草稿线索 " + created + " 条。Google 独有记录不持久化。");
  return { status, discovered, created, googleCount, osmCount };
}
export async function handleDiscovery(request: Request, env: DiscoveryEnv): Promise<Response> {
  const url = new URL(request.url);
  const userId = await authenticate(request, env);
  if (!userId) return errorResponse(request, "UNAUTHORIZED", "请先登录后再执行潜客发现。", 401);
  if (request.method === "POST" && url.pathname === "/api/v1/discovery-runs") {
    let input: DiscoveryRunInput;
    try { input = await request.json() as DiscoveryRunInput; } catch { return errorResponse(request, "VALIDATION_ERROR", "请求内容不是有效 JSON。", 400); }
    if (!Array.isArray(input.countries) || !input.countries.length || input.countries.some((code) => !/^[A-Z]{2}$/.test(code)) || !input.query?.trim() || !Number.isInteger(input.limitPerCountry) || input.limitPerCountry < 1 || input.limitPerCountry > 500) {
      return errorResponse(request, "VALIDATION_ERROR", "国家、关键词或数量参数无效。", 400);
    }
    const rows = await db<Array<{ id: string }>>(env, "discovery_runs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ owner_id: userId, query: input.query, countries: input.countries, limit_per_country: input.limitPerCountry, status: "queued", progress: 0, discovered_count: 0, created_lead_count: 0, message: "任务已排队" }),
    });
    const run = rows[0];
    await log(env, run.id, userId, "info", "任务已创建，准备启动两个数据源");
    await env.LEAD_DISCOVERY_WORKFLOW.create({ id: run.id, params: { runId: run.id, ownerId: userId, input } });
    return successResponse(request, { id: run.id, status: "queued", progress: 0, discoveredCount: 0, createdLeadCount: 0, message: "任务已排队" }, 202);
  }
  const match = url.pathname.match(/^\/api\/v1\/discovery-runs\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const rows = await db<Array<Record<string, unknown>>>(env, "discovery_runs?id=eq." + match[1] + "&owner_id=eq." + userId + "&select=*");
    if (!rows[0]) return errorResponse(request, "NOT_FOUND", "找不到该发现任务。", 404);
    const logs = await db<Array<Record<string, unknown>>>(env, "discovery_run_logs?run_id=eq." + match[1] + "&owner_id=eq." + userId + "&select=id,level,message,created_at&order=created_at.asc");
    const row = rows[0];
    return successResponse(request, { id: row.id, status: row.status, progress: row.progress, discoveredCount: row.discovered_count, createdLeadCount: row.created_lead_count, message: row.message, logs: logs.map((item) => ({ id: item.id, level: item.level, message: item.message, createdAt: item.created_at })) });
  }
  return errorResponse(request, "NOT_FOUND", "The requested discovery endpoint does not exist.", 404);
}
