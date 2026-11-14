import { describe, expect, it } from "vitest";
import { discoveryRunQuery } from "./owner-scoped-query";

describe("discoveryRunQuery", () => {
  it("always constrains workflow updates by both run and owner", () => {
    expect(discoveryRunQuery("run-123", "owner-456")).toBe(
      "discovery_runs?id=eq.run-123&owner_id=eq.owner-456",
    );
  });

  it("encodes identifiers before building the PostgREST filter", () => {
    expect(discoveryRunQuery("run id", "owner/id")).toBe(
      "discovery_runs?id=eq.run+id&owner_id=eq.owner%2Fid",
    );
  });
});
