import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const designTokens = readFileSync(new URL("./design-tokens.css", import.meta.url), "utf8");
const resetStyles = readFileSync(new URL("./reset.css", import.meta.url), "utf8");
const appShellStyles = readFileSync(new URL("../app/layouts/app-shell.css", import.meta.url), "utf8");
const pageLayoutStyles = readFileSync(new URL("../shared/ui/page-layout.css", import.meta.url), "utf8");
const agentMarketStyles = readFileSync(new URL("../features/agent-center/presentation/agent-center.css", import.meta.url), "utf8");

describe("stylesheet ownership boundaries", () => {
  it("keeps application and feature selectors out of the global entry", () => {
    expect(globalStyles).not.toContain(".tp-");
    expect(globalStyles).not.toContain("[role=");
  });

  it("does not style native controls or data tables globally", () => {
    expect(globalStyles).not.toMatch(/^\s*(?:button|input|textarea|select|table|label)\s*[{,]/m);
  });

  it("does not reset typography on native controls or Carbon control internals", () => {
    expect(resetStyles).not.toMatch(/(?:button|input|textarea|select)\s*\{[^}]*font\s*:/s);
  });

  it("does not set border color through a universal selector", () => {
    expect(designTokens).not.toMatch(/\*\s*\{[^}]*border-color/s);
  });

  it("keeps Carbon implementation selectors out of application and feature styles", () => {
    for (const stylesheet of [appShellStyles, pageLayoutStyles, agentMarketStyles]) {
      expect(stylesheet).not.toContain(".cds--");
    }
  });
});
