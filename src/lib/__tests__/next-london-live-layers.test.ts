import { describe, expect, it } from "vitest";

import { classifyLondonLayerName, parseLondonLiveFileLayers } from "@/lib/next-london-live-layers";

describe("live file layer recognition", () => {
  it("reads Illustrator/PDF optional-content layer names", () => {
    const pdf = `%PDF-1.6
1 0 obj << /Type /OCG /Name (Hero lockup) >> endobj
2 0 obj << /Type /OCG /Name (Ground gradient) >> endobj
3 0 obj << /Type /OCG /Name (Headline copy) >> endobj
`;
    const layers = parseLondonLiveFileLayers(pdf, "r001-sign.ai");
    expect(layers.map((l) => l.name)).toEqual(["Hero lockup", "Ground gradient", "Headline copy"]);
    expect(layers.map((l) => l.kind)).toEqual(["lockup", "ground", "copy"]);
  });

  it("reads named groups out of an SVG master", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><g data-layer="ground"></g><g data-layer="qr"></g></svg>`;
    expect(parseLondonLiveFileLayers(svg, "sign.svg").map((l) => l.kind)).toEqual(["ground", "qr"]);
  });

  it("reads EPS layer comments and drops duplicates", () => {
    const eps = `%!PS-Adobe-3.0 EPSF-3.0
%%BeginLayer: Logo
%%BeginLayer: Logo
%%BeginLayer: Artwork
`;
    expect(parseLondonLiveFileLayers(eps, "sign.eps").map((l) => l.name)).toEqual([
      "Logo",
      "Artwork",
    ]);
  });

  it("classifies layer names the way the editor expects", () => {
    expect(classifyLondonLayerName("NEXT wordmark")).toBe("lockup");
    expect(classifyLondonLayerName("QR")).toBe("qr");
    expect(classifyLondonLayerName("Background")).toBe("ground");
    expect(classifyLondonLayerName("Die line")).toBe("other");
  });
});
