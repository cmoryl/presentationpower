import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { buildSjbSequencePack } from "./sjb-sequence-pack";

const jpg = new Uint8Array([0xff, 0xd8, 0xff, 1]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe("buildSjbSequencePack", () => {
  it("packs the exact bytes fetched from the shown picture URLs", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (u: string) => { seen.push(u); return new Response(u.includes("sync") ? png : jpg); });
    const blob = await buildSjbSequencePack("zip", [{ url: "/a.jpg", name: "p1.jpg" }, { url: "/api/public/canva-sync/D1?v=2", name: "p2.jpg" }], 1080, 1350);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(seen).toEqual(["/a.jpg", "/api/public/canva-sync/D1?v=2"]);
    expect(Object.keys(zip.files).sort()).toEqual(["p1.jpg", "p2.png"]);
    expect(new Uint8Array(await zip.file("p2.png")!.async("uint8array"))).toEqual(png);
  });
  it("fails loudly when a picture is missing", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    await expect(buildSjbSequencePack("zip", [{ url: "/x", name: "x.jpg" }], 1, 1)).rejects.toThrow("could not be downloaded");
  });
});
