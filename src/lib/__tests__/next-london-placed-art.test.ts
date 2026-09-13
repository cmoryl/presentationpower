// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  londonPlacedArtBox,
  normalisePlacedArt,
  parseArtworkFile,
  parseEpsArtwork,
  normalisePathData,
  parseSvgArtwork,
  type LondonPlacedArt,
} from "@/lib/next-london-placed-art";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { auditAi, auditSvg, gateOnQa } from "@/lib/london-signage-qa";
import { loadLondonSignageFace } from "@/lib/next-london-text-outline";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <g transform="translate(10 5) scale(2)">
    <path d="M0 0 L10 0 L10 10 Z" fill="#003FC7" fill-rule="evenodd"/>
    <rect x="2" y="2" width="6" height="4" fill="rgb(255,255,255)"/>
    <circle cx="5" cy="5" r="3" style="fill:#A1FBF9"/>
    <path d="M0 0 L5 5" fill="none" stroke="#000"/>
  </g>
</svg>`;

const EPS = `%!PS-Adobe-3.0 EPSF-3.0
%%HiResBoundingBox: 0 0 200 100
0.2 0.8 1 Xa
10 10 m
90 10 l
90 90 l
f
0 g
20 20 m
40 20 30 40 50 60 c
S
`;

describe("placed artwork import", () => {
  it("reads filled SVG shapes and skips stroke-only ones", () => {
    const { art, warnings } = parseSvgArtwork(SVG, "mark.svg");
    expect(art.w).toBe(100);
    expect(art.h).toBe(50);
    // path + rect + circle = 3 filled shapes; the unfilled path is reported.
    expect(art.paths).toHaveLength(3);
    expect(art.paths[0]!.fill).toBe("#003FC7");
    expect(art.paths[0]!.fillRule).toBe("evenodd");
    expect(art.paths[1]!.fill).toBe("#FFFFFF");
    expect(art.paths[2]!.fill).toBe("#A1FBF9");
    // The group transform is carried on every path.
    expect(art.paths[0]!.m).toEqual([2, 0, 0, 2, 10, 5]);
    expect(warnings.join(" ")).toMatch(/stroke-only/);
  });

  it("converts quadratic curves and elliptical arcs to cubics", () => {
    const q = normalisePathData("M 0 0 Q 10 0 10 10 T 20 20");
    expect(q.arcs).toBe(false);
    const n = q.d.match(/-?\d*\.?\d+/g)!.map(Number);
    expect(q.d.replace(/[-\d.\s]+/g, " ").trim()).toBe("M C C");
    expect(n.slice(0, 8)).toEqual(
      [0, 0, 6.666667, 0, 10, 3.333333, 10, 10].map(
        (v, i) => expect.closeTo(v, 4) as unknown as number,
      ) as unknown as number[],
    );

    // A quarter-turn arc keeps its endpoint and becomes real curve geometry.
    const a = normalisePathData("M0 0 A5 5 0 0 1 10 10");
    expect(a.arcs).toBe(false);
    expect(a.d).toMatch(/C/);
    expect(a.d).not.toMatch(/[Aa]/);
    const an = a.d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g)!.map(Number);
    expect(an[an.length - 2]).toBeCloseTo(10, 3);
    expect(an[an.length - 1]).toBeCloseTo(10, 3);

    const { art } = parseSvgArtwork(
      `<svg viewBox="0 0 20 20"><path d="M0 0 A5 5 0 0 1 10 10 Z" fill="#000"/><path d="M0 0 Q10 0 10 10 Z" fill="#000"/></svg>`,
      "mixed.svg",
    );
    expect(art.paths).toHaveLength(2);
    for (const p of art.paths) expect(p.d).not.toMatch(/[QqAa]/);
  });

  it("keeps rounded rectangle corners", () => {
    const { art } = parseSvgArtwork(
      `<svg viewBox="0 0 40 20"><rect x="0" y="0" width="40" height="20" rx="6" fill="#000"/></svg>`,
      "rounded.svg",
    );
    expect(art.paths).toHaveLength(1);
    expect((art.paths[0]!.d.match(/C/g) ?? []).length).toBe(4);
  });

  it("refuses live text and placed rasters", () => {
    expect(() =>
      parseSvgArtwork(`<svg viewBox="0 0 10 10"><text x="0" y="5">NEXT</text></svg>`, "a.svg"),
    ).toThrow(/live text/i);
    expect(() =>
      parseSvgArtwork(
        `<svg viewBox="0 0 10 10"><image href="x.jpg" width="10" height="10"/></svg>`,
        "a.svg",
      ),
    ).toThrow(/vector only/i);
  });

  it("interprets Illustrator EPS path operators and flips the y axis", () => {
    const { art, warnings } = parseEpsArtwork(EPS, "logo.eps");
    expect(art.format).toBe("eps");
    expect(art.w).toBe(200);
    expect(art.h).toBe(100);
    expect(art.paths).toHaveLength(1);
    // EPS y-up 10 → y-down 90 inside a 100pt-high box.
    expect(art.paths[0]!.d.startsWith("M 10.000 90.000")).toBe(true);
    expect(art.paths[0]!.fill).toBe("#33CCFF");
    expect(warnings.join(" ")).toMatch(/stroked path/);
  });

  it("interprets a plain-PostScript EPS written by non-Illustrator tools", () => {
    const { art } = parseEpsArtwork(
      [
        "%!PS-Adobe-3.0 EPSF-3.0",
        "%%BoundingBox: 0 0 200 100",
        "0 0.247 0.780 setrgbcolor",
        "newpath 0 0 moveto 200 0 rlineto 0 100 rlineto -200 0 rlineto closepath fill",
      ].join("\n"),
      "plain.eps",
    );
    expect(art.w).toBe(200);
    expect(art.h).toBe(100);
    expect(art.paths).toHaveLength(1);
    expect(art.paths[0]!.fill).toBe("#003FC7");
    expect(art.paths[0]!.d.startsWith("M 0.000 100.000")).toBe(true);
  });

  it("routes uploads by extension and rejects other files", () => {
    expect(parseArtworkFile(SVG, "mark.svg").art.format).toBe("svg");
    expect(parseArtworkFile(EPS, "logo.eps").art.format).toBe("eps");
    expect(() => parseArtworkFile("hello", "notes.txt")).toThrow(/\.svg or \.eps/);
  });

  it("clamps stored records and drops empty ones", () => {
    expect(normalisePlacedArt({ paths: [] })).toBeNull();
    const art = normalisePlacedArt({
      name: "x",
      paths: [{ d: "M0 0 L1 1", fill: "bogus" }],
      w: 10,
      h: 10,
      size: 99,
      rotate: -900,
      opacity: 0,
    })!;
    expect(art.size).toBe(1.2);
    expect(art.rotate).toBe(-180);
    expect(art.opacity).toBe(0.05);
    expect(art.paths[0]!.fill).toBe("#03002C");
    expect(art.paths[0]!.m).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("sizes the printed box off the trim and centres it", () => {
    const panel = LONDON_PANELS[0]!;
    const art = parseSvgArtwork(SVG, "mark.svg").art;
    const box = londonPlacedArtBox(panel, { ...art, size: 0.5, dx: 0, dy: 0 });
    expect(box.w).toBeCloseTo(panel.trimW * 0.5, 6);
    expect(box.h).toBeCloseTo(box.w * (art.h / art.w), 6);
    expect(box.cx).toBeCloseTo(panel.bleedW / 2, 6);
  });
});

describe("placed artwork in the masters", () => {
  const panel = LONDON_PANELS[0]!;
  const art: LondonPlacedArt = parseSvgArtwork(SVG, "mark.svg").art;

  it("writes a live vector layer into the .svg master", async () => {
    await loadLondonSignageFace();
    const svg = buildLondonPanelSvg(panel, { placedArt: art });
    expect(svg).toContain('data-layer="placed-art"');
    expect(svg).toContain('data-artwork="mark.svg"');
    expect(svg).toContain("matrix(2 0 0 2 10 5)");
    // Vector only: no placed raster and no live text sneaks in with it.
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("<text");
  });

  it("passes signage QA with the layer on, in .svg and .ai", async () => {
    await loadLondonSignageFace();
    const svg = buildLondonPanelSvg(panel, { placedArt: art });
    expect(() => gateOnQa(auditSvg(panel, svg))).not.toThrow();
    const ai = buildLondonPanelAi(panel, { placedArt: art });
    expect(() => gateOnQa(auditAi(panel, ai))).not.toThrow();
    const text = new TextDecoder("latin1").decode(ai);
    // The layer is a named optional-content group of live fill operators.
    expect(text).toContain("Placed art");
    expect(text).toMatch(/\/OC \/oc4 BDC/);
    expect(text).not.toContain("/Subtype /Image\n%placed-art");
  });

  it("keeps placed geometry the right way up in the .ai master", () => {
    // One flat triangle: y-down SVG must land y-up in the PDF stream.
    const one = parseSvgArtwork(
      `<svg viewBox="0 0 100 100"><path d="M0 0 L100 0 L100 100 Z" fill="#03002C"/></svg>`,
      "tri.svg",
    ).art;
    const text = new TextDecoder("latin1").decode(buildLondonPanelAi(panel, { placedArt: one }));
    const stream = text.slice(text.indexOf("/OC /oc4 BDC"));
    // First point of the path: SVG (0,0) → PDF (0,100) in artwork units.
    expect(stream).toMatch(/0 100 m/);
  });

  it("leaves the master untouched when the layer is off or absent", async () => {
    await loadLondonSignageFace();
    expect(buildLondonPanelSvg(panel, { placedArt: null })).not.toContain("placed-art");
    expect(buildLondonPanelSvg(panel, { placedArt: { ...art, on: false } })).not.toContain(
      "placed-art",
    );
  });
});

describe("uploaded artwork transparency", () => {
  it("keeps declared transparency and drops invisible shapes", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g opacity="0.5"><rect x="0" y="0" width="10" height="10" fill="#FF0000" fill-opacity="0.6"/></g>
      <rect x="20" y="0" width="10" height="10" fill="rgba(0,0,255,0.25)"/>
      <rect x="40" y="0" width="10" height="10" fill="#00FF00" opacity="0"/>
      <rect x="60" y="0" width="10" height="10" fill="none"/>
      <rect x="80" y="0" width="10" height="10" fill="#112233"/>
    </svg>`;
    const { art, warnings } = parseSvgArtwork(svg, "t.svg");
    expect(art.paths).toHaveLength(3);
    expect(art.paths[0]!.alpha).toBeCloseTo(0.3, 3);
    expect(art.paths[1]!.alpha).toBeCloseTo(0.25, 3);
    expect(art.paths[1]!.fill).toBe("#0000FF");
    expect(art.paths[2]!.alpha).toBeUndefined();
    expect(warnings.join(" ")).toMatch(/transparent/i);
  });
});
