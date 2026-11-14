import { describe, expect, it } from "vitest";
import { readSjbHeroColours, SJB_HERO_DEFAULT_COLOURS } from "./sjb-hero-colours";

describe("Bowl hero colour preferences", () => {
  it("retains the supplied white face and blue shadow by default", () => {
    expect(SJB_HERO_DEFAULT_COLOURS).toEqual({ face: "#FFFFFF", shadow: "#1FA9E1" });
  });
  it("restores a yellow face without changing the shadow", () => {
    expect(readSjbHeroColours('{"face":"#FFD600","shadow":"#1FA9E1"}'))
      .toEqual({ face: "#FFD600", shadow: "#1FA9E1" });
  });
  it("rejects invalid colours and malformed saved preferences", () => {
    for (const raw of [null, "broken", '{"face":"red","shadow":"#1FA9E1"}']) {
      expect(readSjbHeroColours(raw)).toEqual(SJB_HERO_DEFAULT_COLOURS);
    }
  });
});