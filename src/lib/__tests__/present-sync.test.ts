import { describe, expect, it } from "vitest";
import {
  formatElapsed,
  isPresentRole,
  presentChannelName,
  presentRoleFromSearch,
} from "@/lib/present-sync";

describe("present sync helpers", () => {
  it("scopes the channel to the deck", () => {
    expect(presentChannelName("deck-1")).toBe("element-present-deck-1");
  });

  it("only accepts the two known views", () => {
    expect(isPresentRole("console")).toBe(true);
    expect(isPresentRole("audience")).toBe(true);
    expect(isPresentRole("projector")).toBe(false);
    expect(presentRoleFromSearch("console")).toBe("console");
    expect(presentRoleFromSearch(undefined)).toBe("solo");
    expect(presentRoleFromSearch("nonsense")).toBe("solo");
  });

  it("formats the elapsed clock", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(65_000)).toBe("01:05");
    expect(formatElapsed(3_725_000)).toBe("1:02:05");
    expect(formatElapsed(-5)).toBe("00:00");
  });
});
