import { describe, expect, it } from "vitest";
import { sanitizeAgentReply } from "../sanitize-reply";

describe("sanitizeAgentReply", () => {
  it("removes module codes", () => {
    expect(sanitizeAgentReply("I used MV-12 and BENTO-5 here.")).toBe("I used and here.");
    expect(sanitizeAgentReply("Layout (MV-4) is set.")).toBe("Layout is set.");
    expect(sanitizeAgentReply("Picked MV… for it.")).toBe("Picked for it.");
  });

  it("rewrites jargon phrases", () => {
    expect(sanitizeAgentReply("The section framework is chosen.")).toBe(
      "The deck structure is chosen.",
    );
    expect(sanitizeAgentReply("Narrative archetype: challenger.")).toBe("Story arc: challenger.");
  });

  it("rewrites quoted internal labels", () => {
    expect(sanitizeAgentReply('Added a "Cover" and a "Challenge".')).toBe(
      "Added a opening slide and a the problem.",
    );
    expect(sanitizeAgentReply("Cover slide is ready.")).toBe("opening slide is ready.");
  });

  it("leaves normal prose and code blocks alone", () => {
    expect(sanitizeAgentReply("The challenge for retail buyers is speed.")).toBe(
      "The challenge for retail buyers is speed.",
    );
    const code = "```\nMV-4\n```";
    expect(sanitizeAgentReply(code)).toBe(code);
  });
});
