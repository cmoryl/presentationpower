import { describe, expect, it } from "vitest";
import { KIOSK_LIVE_LAYOUTS, layoutKiosk, buildKioskFrontSvg, type KioskEdits } from "@/lib/next-california-kiosk-live";

describe("badge as text", () => {
  const L = KIOSK_LIVE_LAYOUTS["veeva"] ?? Object.values(KIOSK_LIVE_LAYOUTS)[0]!;
  const part = L.blocks.flatMap((b) => b.parts ?? [])[0]!;
  const edits: KioskEdits = { badges: [{ id: `badge-${part.id}`, of: part.id, text: "New Partner" }] };
  it("hides the picture and places editable text", () => {
    const p = layoutKiosk(L, edits);
    const t = p.flatMap((x) => x.texts).find((x) => x.id === `badge-${part.id}`);
    expect(t?.text).toBe("New Partner");
    expect(t?.fixed).toBe(false);
    expect(p.flatMap((x) => x.parts).find((q) => q.part.id === part.id)?.hidden).toBe(true);
  });
  it("exports as live text", () => {
    const svg = buildKioskFrontSvg(L, '<svg viewBox="0 0 10 10"></svg>', edits);
    expect(svg).toContain("New Partner");
    expect(svg).not.toContain(`id="object-${part.id}"`);
  });
});
