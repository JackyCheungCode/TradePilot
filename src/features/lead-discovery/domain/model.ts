export type DiscoveryProvider = "google_maps" | "openstreetmap";
export type DiscoveryStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
export interface DiscoveryRunInput { countries: string[]; query: string; limitPerCountry: number; state?: string; city?: string; }
export interface DiscoveryRun { id: string; status: DiscoveryStatus; progress: number; discoveredCount: number; createdLeadCount: number; message: string; }
export interface DiscoveryLog { id: string; level: "info" | "success" | "warning" | "error"; message: string; createdAt: string; }
export interface CountryOption { code: string; numericCode: string; name: string; flag: string; }
