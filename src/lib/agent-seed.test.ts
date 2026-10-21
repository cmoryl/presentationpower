import { describe, expect, it } from "vitest";
import { guessAgentSurface } from "./agent-seed";

describe("one box routes to the right agent", () => {
  it("decks go to the presentation agent", () => {
    expect(guessAgentSurface("Build a 6-slide GlobalLink QBR deck")).toBe("presentation");
  });
  it("signage goes to the events agent", () => {
    expect(guessAgentSurface("Signage for NEXT London")).toBe("event");
  });
  it("LinkedIn posts go to the social agent", () => {
    expect(guessAgentSurface("Three LinkedIn posts about our AI launch")).toBe("social");
  });
  it("brochures go to the print agent", () => {
    expect(guessAgentSurface("A Life Sciences brochure")).toBe("print");
  });
  it("unclear requests stay with the chosen agent", () => {
    expect(guessAgentSurface("help me with Q3")).toBeNull();
  });
});
