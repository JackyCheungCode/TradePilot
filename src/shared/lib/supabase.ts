import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
 if (client) return client;
 const url = import.meta.env.VITE_SUPABASE_URL;
 const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
 if (!url || !key) throw new Error("缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 环境变量。");
 client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
 return client;
}
