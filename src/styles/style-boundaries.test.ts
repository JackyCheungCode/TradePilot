import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("global stylesheet boundaries", () => {
  it("keeps application and feature selectors out of the global entry", () => {
    expect(globalStyles).not.toContain(".tp-");
    expect(globalStyles).not.toContain("[role=");
  });

  it("does not style native controls or data tables globally", () => {
    expect(globalStyles).not.toMatch(/^\s*(?:button|input|textarea|select|table|label)\s*[{,]/m);
  });
});
