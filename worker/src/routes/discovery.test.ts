import { afterEach, describe, expect, it, vi } from "vitest";
import { handleDiscovery, type DiscoveryEnv } from "./discovery";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleDiscovery", () => {
  it("accepts an empty successful Supabase response for return=minimal log writes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: "user-1" }))
      .mockResolvedValueOnce(Response.json([{ id: "run-1" }], { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const env: DiscoveryEnv = {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      LEAD_DISCOVERY_WORKFLOW: { create: vi.fn().mockResolvedValue({ id: "run-1" }) },
    };
    const request = new Request("https://tradepilot.test/api/v1/discovery-runs", {
      method: "POST",
      headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
      body: JSON.stringify({ countries: ["US"], query: "electronics distributor", limitPerCountry: 20, osmTags: [{ key: "shop", value: "electronics" }] }),
    });

    const response = await handleDiscovery(request, env);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ data: { id: "run-1", status: "queued" } });
    expect(env.LEAD_DISCOVERY_WORKFLOW.create).toHaveBeenCalledOnce();
  });

  it("requires explicit OSM tag mappings when OpenStreetMap is selected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ id: "user-1" })));
    const env = {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      LEAD_DISCOVERY_WORKFLOW: { create: vi.fn() },
    };
    const request = new Request("https://tradepilot.test/api/v1/discovery-runs", {
      method: "POST",
      headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
      body: JSON.stringify({ countries: ["US"], query: "electrical equipment distributor", limitPerCountry: 20, providers: ["openstreetmap"] }),
    });
    const response = await handleDiscovery(request, env);
    expect(response.status).toBe(400);
    expect(env.LEAD_DISCOVERY_WORKFLOW.create).not.toHaveBeenCalled();
  });

  it("rejects multiple countries because target market is single-country", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ id: "user-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const env = {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      LEAD_DISCOVERY_WORKFLOW: { create: vi.fn().mockResolvedValue({ id: "unused" }) },
    };
    const request = new Request("https://tradepilot.test/api/v1/discovery-runs", {
      method: "POST",
      headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
      body: JSON.stringify({ countries: ["US", "CA"], query: "electronics distributor", limitPerCountry: 20 }),
    });

    const response = await handleDiscovery(request, env);
    expect(response.status).toBe(400);
    expect(env.LEAD_DISCOVERY_WORKFLOW.create).not.toHaveBeenCalled();
  });
});
