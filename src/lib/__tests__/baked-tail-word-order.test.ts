import { describe, expect, it } from "vitest";
import { placeTextRuns } from "../export-text-place";
import type { TextRun } from "../export-text-layer";

const base = {
  fontFamily: "Geist",
  bold: true,
  italic: false,
  underline: false,
  color: "03002C",
  transparency: 0,
  align: "left" as const,
  letterSpacingPx: 0,
  leadWs: false,
  trailWs: false,
  linePitchPx: 112,
  paragraph: {
    textIndentPx: 0,
    padLeftPx: 0,
    padRightPx: 0,
    spaceBeforePx: 0,
    spaceAfterPx: 0,
    whiteSpace: "normal",
    overflowWrap: "normal",
    hyphens: "manual",
    listMarker: null,
  },
};

describe("baked headline with an emphasised tail word", () => {
  it("keeps the tail word on the line it sits on under tight leading", () => {
    // 124px type at ~0.9 leading: pitch (112) is smaller than the line box (140).
    const para = {
      ...base,
      x: 100,
      y: 300,
      w: 1500,
      h: 252,
      text: "Treat localization as a supply chain, not a",
      fontSizePx: 124,
      lineHeightPx: 112,
      singleLine: false,
      valign: "top",
      lines: [
        { text: "Treat localization as a", x: 100, y: 300, w: 1400, h: 140 },
        { text: "supply chain, not a", x: 100, y: 412, w: 1100, h: 140 },
      ],
    } as unknown as TextRun;
    const tail = {
      ...base,
      color: "003FC7",
      x: 1230,
      y: 412,
      w: 420,
      h: 140,
      text: "service.",
      fontSizePx: 124,
      lineHeightPx: 112,
      singleLine: true,
      valign: "middle",
    } as unknown as TextRun;

    const calls: unknown[] = [];
    placeTextRuns({ addText: (t) => calls.push(t) }, [para, tail]);
    const parts = calls[0] as { text: string }[];
    const joined = parts.map((p) => p.text).join("|");
    expect(joined).toBe("Treat localization as a|supply chain, not a| service.");
  });
});
