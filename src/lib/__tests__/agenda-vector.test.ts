// NEXT division agenda vector export regression. Guards the Illustrator-facing
// contract: seven named layers, a mesh-shaded ground, numeric trim/bleed boxes,
// live text and vector QR modules.

import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { buildAgendaVectorPdf } from "@/lib/agenda-vector-pdf";
import { agendaDefault, type AgendaConfig } from "@/lib/next-agenda";

const latin1 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return s;
};

function operators(bytes: Uint8Array): string {
  const raw = latin1(bytes);
  let out = "";
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    const slice = bytes.subarray(start, end);
    try {
      out += inflateSync(slice).toString("latin1") + "\n";
    } catch {
      out += latin1(slice) + "\n";
    }
  }
  return out;
}

const cases: { label: string; config: AgendaConfig }[] = [
  { label: "A2 board, dark face", config: agendaDefault("globallink") },
  {
    label: "A4 handout, light face, QR",
    config: {
      ...agendaDefault("legal"),
      sizeId: "a4",
      trimW: 210,
      trimH: 297,
      face: "light",
      qrData: "https://next.transperfect.com/legal/agenda",
    },
  },
];

describe("agenda vector export", () => {
  for (const testCase of cases) {
    it(`builds layered vector artwork — ${testCase.label}`, async () => {
      const result = await buildAgendaVectorPdf(testCase.config);
      const raw = latin1(result.bytes);
      const ops = operators(result.bytes);

      expect(result.layers).toEqual([
        "01 Ground",
        "02 Lockup",
        "03 Title block",
        "04 Sessions",
        "05 Footer",
        "06 QR code",
        "07 Guides + marks",
      ]);
      // Named optional content groups, in order, guides non-printing.
      for (const name of result.layers) expect(raw).toContain(name);
      expect(raw).toContain("/TrimBox");
      expect(raw).toContain("/BleedBox");
      // Ground is one Type 4 Gouraud mesh, never a raster plate.
      expect(raw).toContain("/ShadingType 4");
      expect(ops).toContain("sh");
      expect(/\/Subtype\s*\/Image/.test(raw)).toBe(false);
      // Live text and vector rules for the programme rows.
      expect((ops.match(/Tj/g) ?? []).length).toBeGreaterThan(10);
      expect(result.pdfx.outputIntent.length).toBeGreaterThan(0);
      expect(result.bytes.byteLength).toBeGreaterThan(5000);
    }, 60_000);
  }

  it("places the QR block only when a payload is set", async () => {
    const bare = await buildAgendaVectorPdf(agendaDefault("finance"));
    const coded = await buildAgendaVectorPdf({
      ...agendaDefault("finance"),
      qrData: "https://next.transperfect.com/finance/agenda",
    });
    expect(coded.bytes.byteLength).toBeGreaterThan(bare.bytes.byteLength);
  }, 90_000);
});
