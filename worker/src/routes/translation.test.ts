import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTranslation } from "./translation";
afterEach(() => vi.unstubAllGlobals());
describe("DeepL keyword translation API", () => {
  it("translates through the server using the configured DeepL key", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: "user-1" }))
      .mockResolvedValueOnce(Response.json({ translations: [{ text: "elektrischer Großhändler", detected_source_language: "EN" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleTranslation(new Request("https://tradepilot.test/api/v1/discovery/translate", {
      method: "POST", headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
      body: JSON.stringify({ text: "electrical distributor", targetLanguage: "DE" }),
    }), { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "anon", DEEPL_API_KEY: "free-key:fx" });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ translatedText: "elektrischer Großhändler", targetLanguage: "DE" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://api-free.deepl.com/v2/translate");
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: "DeepL-Auth-Key free-key:fx" });
  });
  it("rejects unsupported target languages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ id: "user-1" })));
    const response = await handleTranslation(new Request("https://tradepilot.test/api/v1/discovery/translate", {
      method: "POST", headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
      body: JSON.stringify({ text: "electrical distributor", targetLanguage: "XX" }),
    }), { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "anon", DEEPL_API_KEY: "free-key:fx" });
    expect(response.status).toBe(400);
  });
});
