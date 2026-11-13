export type DiscoveryProvider = "google_maps" | "openstreetmap";
export type DiscoveryStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
export interface DiscoveryRunInput { countries: string[]; query: string; limitPerCountry: number; providers: DiscoveryProvider[]; state?: string; city?: string; }
export interface DiscoveryRun {
  id: string; taskCode?: string; channel?: string; query?: string; countries?: string[];
  state?: string | null; city?: string | null; providers?: DiscoveryProvider[];
  status: DiscoveryStatus; progress: number; discoveredCount: number; createdLeadCount: number;
  message: string; createdAt?: string;
}
export interface DiscoveryLog { id: string; level: "info" | "success" | "warning" | "error"; message: string; createdAt: string; }
export interface DiscoveryOccurrence { id: string; run_id: string; provider: DiscoveryProvider; keyword: string; external_id: string; source_url?: string | null; captured_at: string; }
export interface DiscoveryRecord {
  id: string; name: string; country_code: string | null; address: string | null; phone: string | null;
  website: string | null; latitude: number | null; longitude: number | null;
  status: "new" | "removed" | "discarded" | "promoted"; channel: string; raw_data?: Record<string, unknown>;
  discovery_record_occurrences: DiscoveryOccurrence[];
}
export interface FormalLead { id: string; name: string; country_code: string; address: string | null; phone: string | null; website: string | null; created_at: string; }
export interface CountryOption { code: string; numericCode: string; name: string; flag: string; }
