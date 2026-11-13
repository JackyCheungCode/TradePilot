import { describe, expect, it } from "vitest";
import { buildLeadDedupeKey, normalizeBusinessName, normalizeWebsiteHost } from "./deduplication";
describe("lead deduplication", () => {
 it("normalizes website hosts", () => expect(normalizeWebsiteHost("https://www.Example.com/contact")).toBe("example.com"));
 it("normalizes Unicode business names", () => expect(normalizeBusinessName("臺灣 電子股份有限公司")).toBe("臺灣 電子股份有限公司"));
 it("prefers domain identity", () => expect(buildLeadDedupeKey({ countryCode:"US",name:"A",website:"https://www.example.com" })).toBe("domain:example.com"));
 it("falls back to phone identity", () => expect(buildLeadDedupeKey({ countryCode:"US",name:"A",phone:"+1 (555) 123-4567" })).toBe("phone:US:15551234567"));
});
