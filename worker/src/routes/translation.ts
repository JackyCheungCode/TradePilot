import { errorResponse, successResponse } from "../lib/http";

interface TranslationEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DEEPL_API_KEY?: string;
}
const TARGET_LANGUAGES = new Set(["AR","BG","CS","DA","DE","EL","EN-US","EN-GB","ES","ET","FI","FR","HE","HU","ID","IT","JA","KO","LT","LV","NB","NL","PL","PT-BR","PT-PT","RO","RU","SK","SL","SV","TH","TR","UK","VI","ZH"]);
async function authenticated(request: Request, env: TranslationEnv) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const response = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
  });
  return response.ok;
}
export async function handleTranslation(request: Request, env: TranslationEnv): Promise<Response> {
  if (request.method !== "POST" || new URL(request.url).pathname !== "/api/v1/discovery/translate") {
    return errorResponse(request, "NOT_FOUND", "翻译接口不存在。", 404);
  }
  if (!(await authenticated(request, env))) return errorResponse(request, "UNAUTHORIZED", "请先登录后使用关键词翻译。", 401);
  if (!env.DEEPL_API_KEY) return errorResponse(request, "DEEPL_NOT_CONFIGURED", "请先在设置与集成中配置 DeepL API Key。", 503);
  let body: { text?: string; targetLanguage?: string };
  try { body = await request.json() as { text?: string; targetLanguage?: string }; }
  catch { return errorResponse(request, "INVALID_JSON", "请求内容格式不正确。", 400); }
  const text = body.text?.trim() ?? "";
  const targetLanguage = body.targetLanguage?.toUpperCase() ?? "";
  if (!text || text.length > 500 || !TARGET_LANGUAGES.has(targetLanguage)) {
    return errorResponse(request, "VALIDATION_ERROR", "关键词不能为空（最多 500 字符），并请选择支持的目标语言。", 400);
  }
  const baseUrl = env.DEEPL_API_KEY.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  try {
    const response = await fetch(baseUrl + "/v2/translate", {
      method: "POST",
      headers: { Authorization: "DeepL-Auth-Key " + env.DEEPL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: [text], target_lang: targetLanguage, context: "B2B company and industry search keyword for local business discovery. Preserve brand names, model names and technical product terms where appropriate." }),
    });
    if (!response.ok) {
      const message = response.status === 403 ? "DeepL API Key 无效或无权访问。" : response.status === 456 ? "DeepL API 额度已用尽。" : response.status === 429 ? "DeepL 请求过于频繁，请稍后重试。" : "DeepL 请求失败（HTTP " + response.status + "）。";
      return errorResponse(request, "DEEPL_REQUEST_FAILED", message, response.status === 429 ? 429 : 502);
    }
    const result = await response.json() as { translations?: Array<{ text?: string; detected_source_language?: string }> };
    const translated = result.translations?.[0];
    if (!translated?.text) return errorResponse(request, "DEEPL_EMPTY_RESPONSE", "DeepL 没有返回翻译内容。", 502);
    return successResponse(request, { translatedText: translated.text, detectedSourceLanguage: translated.detected_source_language, targetLanguage });
  } catch {
    return errorResponse(request, "DEEPL_UNAVAILABLE", "暂时无法连接 DeepL，请稍后重试。", 502);
  }
}
