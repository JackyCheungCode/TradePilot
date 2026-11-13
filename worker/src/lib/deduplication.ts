export function normalizeWebsiteHost(value?: string | null): string {
 if (!value) return "";
 try { return new URL(value.startsWith("http") ? value : "https://" + value).hostname.toLowerCase().replace(/^www\./, ""); }
 catch { return ""; }
}
export function normalizeBusinessName(value: string): string {
 return value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function buildLeadDedupeKey(input: { countryCode: string; name: string; website?: string | null; phone?: string | null; latitude?: number | null; longitude?: number | null }): string {
 const host = normalizeWebsiteHost(input.website);
 if (host) return "domain:" + host;
 const phone = (input.phone ?? "").replace(/\D/g, "");
 if (phone.length >= 7) return "phone:" + input.countryCode + ":" + phone;
 const geo = input.latitude != null && input.longitude != null ? Math.round(input.latitude * 1000) + ":" + Math.round(input.longitude * 1000) : "no-geo";
 return "name:" + input.countryCode + ":" + normalizeBusinessName(input.name) + ":" + geo;
}
