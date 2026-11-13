import { getSupabaseClient } from "@/shared/lib/supabase";

export interface KeywordTranslation {
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
}

export async function translateDiscoveryKeyword(text: string, targetLanguage: string): Promise<KeywordTranslation> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  if (!session?.access_token) throw new Error("请先登录 TradePilot，再使用 DeepL 翻译。");
  const response = await fetch("/api/v1/discovery/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
    body: JSON.stringify({ text, targetLanguage }),
  });
  const raw = await response.text();
  let body: { data?: KeywordTranslation; error?: { message?: string } };
  try { body = JSON.parse(raw) as typeof body; }
  catch { throw new Error("翻译接口返回了无效响应（HTTP " + response.status + "）。"); }
  if (!response.ok) throw new Error(body.error?.message ?? "DeepL 翻译失败。");
  if (!body.data?.translatedText) throw new Error("DeepL 没有返回翻译结果。");
  return body.data;
}
