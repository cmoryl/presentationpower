import { describe, expect, it } from "vitest";
import { SJB_EVENT } from "./san-juan-bowl";

describe("Official Bowl website facts", () => {
  it("uses the official website supplied by the organiser", () => {
    expect(SJB_EVENT.websiteUrl).toBe("https://www.sanjuanbowl.com/");
  });
  it("keeps the announced kickoff and San Juan time at the same instant", () => {
    expect(Date.parse(SJB_EVENT.kickoffUtc)).toBe(Date.parse("2026-12-16T20:30:00-04:00"));
    expect(SJB_EVENT.localKickoffLabel).toBe("8:30 p.m. AST · San Juan time");
  });
  it("links to the official Ticketera event rather than a generic shop", () => {
    expect(SJB_EVENT.ticketsUrl).toBe("https://shop.ticketera.com/event/san-juan-bowl-ipb5yw?lang=en");
  });
});