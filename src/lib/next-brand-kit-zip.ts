// Download pack for the Master NEXT event brand kit. Built in the browser from
// the same data as the page. Supplied masters are copied byte-for-byte; any
// file that cannot be fetched is listed in MISSING.txt rather than skipped
// silently.
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import {
  BRAND_KIT_COLOUR_NOTE,
  BRAND_KIT_PRINT_NOTES,
  BRAND_KIT_VERSION,
  NEW_CITY_CHECKLIST,
  NEXT_APPLICATION_RULES,
  NEXT_DIVISIONS,
  NEXT_LOGO_RULES,
  NEXT_MARKS,
  canvaCopyValues,
  paletteCsv,
  paletteJson,
  type KitFamily,
} from "@/lib/next-brand-kit";
import {
  BREW_RULES,
  GRADIENT_RULES,
  RESIZE_RULES,
  REUSE_RULES,
  digitalFormatsCsv,
  gradientsCsv,
  kitEventSections,
  kitGradients,
  kitMart,
  kitSignSizes,
  signSizesCsv,
} from "@/lib/next-brand-kit-guide";

async function bytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

function b64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

function safe(s: string) {
  return s.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function buildBrandRulesPdf(): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const [reg, bold] = await Promise.all([bytes("/fonts/Geist-Regular.ttf"), bytes("/fonts/Geist-Bold.ttf")]);
  doc.addFileToVFS("Geist-Regular.ttf", b64(reg));
  doc.addFont("Geist-Regular.ttf", "Geist", "normal");
  doc.addFileToVFS("Geist-Bold.ttf", b64(bold));
  doc.addFont("Geist-Bold.ttf", "Geist", "bold");
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 54;
  let y = M;
  const need = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const head = (t: string, size = 16) => {
    need(size + 16);
    doc.setFont("Geist", "bold").setFontSize(size).setTextColor(3, 0, 44);
    doc.text(t, M, y + size);
    y += size + 12;
  };
  const para = (t: string, size = 10) => {
    doc.setFont("Geist", "normal").setFontSize(size).setTextColor(3, 0, 44);
    const lines = doc.splitTextToSize(t, W - M * 2) as string[];
    for (const l of lines) {
      need(size * 1.4);
      doc.text(l, M, y + size);
      y += size * 1.4;
    }
    y += 4;
  };

  head("TransPerfect NEXT — Master event brand kit", 22);
  para(`Version ${BRAND_KIT_VERSION}`);
  head("Logo rules");
  for (const r of NEXT_LOGO_RULES) para(`${r.do ? "Do" : "Don't"} — ${r.title}. ${r.body}`);
  head("Division colours");
  para(BRAND_KIT_COLOUR_NOTE);
  for (const d of NEXT_DIVISIONS) {
    need(22);
    const [r, g, b] = d.rgb.split(",").map((n) => Number(n.trim()));
    doc.setFillColor(r, g, b).rect(M, y, 14, 14, "F");
    doc.setFont("Geist", "normal").setFontSize(10).setTextColor(3, 0, 44);
    doc.text(`${d.name}   ${d.accent}   RGB ${d.rgb}   CMYK ${d.cmyk}   ${d.pantone}`, M + 22, y + 11);
    y += 20;
  }
  y += 6;
  head("Print");
  for (const n of BRAND_KIT_PRINT_NOTES) para(`• ${n}`);
  head("Where it's used");
  for (const s of NEXT_APPLICATION_RULES) {
    para(s.surface, 11);
    for (const r of s.rules) para(`• ${r}`);
  }
  head("Gradients");
  for (const g of kitGradients()) para(`${g.label} (${g.family}) — ${g.stops.map((x) => x.hex + (x.cmyk ? ` [CMYK ${x.cmyk}]` : "")).join(" → ")}`, 9);
  for (const r of GRADIENT_RULES) para(`${r.do ? "Do" : "Don't"} — ${r.text}`);
  head("Sizes");
  for (const z of kitSignSizes()) para(`${z.title}: ${z.supplied}${z.presets.length ? ` · ready-made: ${z.presets.join(", ")}` : ""}`, 9);
  head("Resizing");
  RESIZE_RULES.forEach((r, i) => para(`${i + 1}. ${r}`));
  head("Using what we already have");
  para(`Copy: ${REUSE_RULES.copy}`);
  para(`Change: ${REUSE_RULES.change}`);
  para(`Never change: ${REUSE_RULES.never}`);
  head("Event sections");
  for (const g of kitEventSections().formatGroups) para(`${g.label} — ${g.detail}`);
  head("NEXT Mart");
  const mart = kitMart();
  para(`Reference price bands: ${mart.reference.priceBands.map((b) => mart.reference.currency + b).join(", ")}. Currencies: ${mart.currencies.map((c) => c.code).join(", ")}.`);
  for (const p of mart.pillars) para(`Pillar: ${p.name} × ${p.quantity} — ${p.role}`);
  for (const f of mart.flats) para(`Flat: ${f.name} ${f.trimW}×${f.trimH} mm × ${f.quantity}`);
  head("NEXTbrew");
  for (const r of BREW_RULES) para(`• ${r}`);
  head("Starting a new city");
  NEW_CITY_CHECKLIST.forEach((c, i) => para(`${i + 1}. ${c.step}. ${c.body}`));
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildBrandKitZip(
  families: KitFamily[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; filename: string; missing: string[] }> {
  const pack = await import("@/lib/next-designer-pack");
  const { londonCmykRamp } = await import("@/lib/next-london-cmyk");
  const zip = new JSZip();
  const root = zip.folder(pack.PACK_ROOT)!;
  const missing: string[] = [];
  const manifest: { path: string; source: string; sha256: string; bytes: number }[] = [];
  const put = async (path: string, data: Uint8Array | string, source = "generated") => {
    root.file(path, data);
    const u = typeof data === "string" ? new TextEncoder().encode(data) : data;
    manifest.push({ path, source, sha256: await pack.sha256Hex(u), bytes: u.length });
  };

  const logos = [
    ...NEXT_DIVISIONS.flatMap((d) =>
      d.lockups.map((l) => ({ dir: `01-logos/${safe(d.id)}`, division: d.id, asset: l.lockup, variant: l.variant, src: l.src })),
    ),
    ...NEXT_MARKS.map((m) => ({ dir: "02-marks", division: "next", asset: m.id, variant: m.src.match(/-(\w+)\.svg$/)?.[1] ?? "", src: m.src })),
  ];
  const masters = families.flatMap((f) =>
    f.templates
      .filter((t) => t.downloadUrl)
      .map((t) => ({ folder: safe(f.label), t })),
  );
  const { BRAND_ICON_SETS } = await import("@/lib/brand-icon-sets");
  const iconSets = BRAND_ICON_SETS.filter((s) => s.slug.startsWith("next-2026"));
  const total = logos.length + masters.length + iconSets.length + 4;
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  // 01 / 02 — every lockup and mark as SVG, EPS and transparent PNG
  const seen = new Set<string>();
  for (const l of logos) {
    if (!seen.has(l.src)) {
      seen.add(l.src);
      const f = pack.logoFormats(l.src);
      for (const [ext, url] of [["svg", f.svg], ["eps", f.eps], ["png", f.png]] as const) {
        try {
          await put(`${l.dir}/${pack.designerFileName(l.division, l.asset, l.variant, ext)}`, await bytes(url), url);
        } catch {
          missing.push(`logo ${url}`);
        }
      }
    }
    tick();
  }

  // 03 — colour
  await put("03-colour/next-division-palette.csv", paletteCsv());
  await put("03-colour/next-division-palette.json", paletteJson());
  await put("03-colour/canva-brand-kit-values.txt", canvaCopyValues());
  await put(
    "03-colour/next26_division_swatches.ase",
    pack.buildAse(
      "NEXT 2026 divisions",
      NEXT_DIVISIONS.map((d) => ({ name: d.name, hex: d.accent, cmyk: pack.parseCmykPercent(d.cmyk) })),
    ),
  );
  tick();

  // 04 — gradients with CMYK labelled approved / proof first
  const grads = kitGradients();
  const gradRows = ["id,label,family,stop,hex,cmyk,cmyk_status"];
  const aseGrad: { name: string; hex: string; cmyk?: [number, number, number, number] }[] = [];
  for (const g of grads) {
    const hexes = g.stops.map((x) => x.hex);
    const builds = londonCmykRamp(hexes);
    hexes.forEach((h, i) => {
      const measured = g.stops[i].cmyk;
      const b = builds[i];
      const cm = measured ?? [b.c, b.m, b.y, b.k].map((n) => Math.round(n * 100)).join(", ");
      const status = measured ? "approved (measured)" : b.approved ? "approved" : "proof first";
      gradRows.push([g.id, `"${g.label}"`, `"${g.family}"`, i + 1, h, `"${cm}"`, status].join(","));
      aseGrad.push({ name: `${g.label} ${i + 1}`, hex: h, cmyk: measured || b.approved ? pack.parseCmykPercent(cm) : undefined });
    });
    await put(`04-gradients/${pack.designerFileName("next", g.id, "swatch", "svg")}`, pack.gradientSwatchSvg(hexes, g.label));
  }
  await put("04-gradients/next-gradients-cmyk.csv", gradRows.join("\n"));
  await put("04-gradients/next-gradients.json", JSON.stringify(grads, null, 2));
  await put("04-gradients/next26_gradient_swatches.ase", pack.buildAse("NEXT 2026 gradients", aseGrad));
  tick();

  // 05 — icons (SVG for every NEXT set, transparent PNG for the event set)
  const { iconSvgString, iconPngBlob } = await import("@/lib/icon-export");
  for (const set of iconSets) {
    for (const area of set.subAreas)
      for (const icon of area.icons) {
        const svg = iconSvgString(icon.name);
        if (!svg) continue;
        const base = `05-icons/${safe(set.slug)}/${safe(area.name)}/${safe(icon.name).toLowerCase()}`;
        await put(`${base}.svg`, svg);
        if (set.slug === "next-2026-event") {
          try {
            await put(`${base}.png`, new Uint8Array(await (await iconPngBlob(svg, 512)).arrayBuffer()));
          } catch {
            missing.push(`icon png ${icon.name}`);
          }
        }
      }
    tick();
  }

  // 06 — supplied masters, byte-for-byte
  for (const m of masters) {
    try {
      const ext = (m.t.downloadUrl!.split("?")[0].split(".").pop() ?? "bin").slice(0, 5);
      await put(
        `06-templates/${m.folder}/${pack.designerFileName(m.t.divisionId, m.t.format, m.t.code, ext)}`,
        await bytes(m.t.downloadUrl!),
        m.t.downloadUrl!,
      );
    } catch {
      missing.push(`master ${m.folder} ${m.t.format}`);
    }
    tick();
  }

  // 07 / 08 — type and sizes
  for (const f of ["Geist-Regular.ttf", "Geist-Bold.ttf"]) {
    try {
      await put(`07-type/${f}`, await bytes(`/fonts/${f}`), `/fonts/${f}`);
    } catch {
      missing.push(`font ${f}`);
    }
  }
  await put("07-type/LICENSE.txt", "Geist is licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).");
  await put("08-sizes/next-sign-sizes.csv", signSizesCsv());
  await put("08-sizes/next-digital-formats.csv", digitalFormatsCsv());
  tick();

  // 00 — start-here guide with live links and real examples
  try {
    const { buildDesignerGuidePdf } = await import("@/lib/next-designer-guide-pdf");
    await put("00-START-HERE.pdf", await buildDesignerGuidePdf({ families }));
  } catch {
    missing.push("start-here PDF");
  }
  try {
    await put("NEXT-brand-rules.pdf", await buildBrandRulesPdf());
  } catch {
    missing.push("brand rules PDF");
  }
  tick();

  await put(
    "README.txt",
    [
      `TransPerfect NEXT 2026 — Designer pack v${pack.DESIGNER_PACK_VERSION} (kit ${BRAND_KIT_VERSION})`,
      "",
      ...pack.PACK_FOLDERS.map((f) => `${(f.dir || "00-START-HERE.pdf").padEnd(18)} ${f.body}`),
      "manifest.json      every file with its source and SHA-256 checksum",
      "",
      "File names: next26_<division>_<asset>_<variant>.<format>",
      BRAND_KIT_COLOUR_NOTE,
      "CMYK marked \"proof first\" is a calculated build: get a signed printed proof before a run. Only approved builds are written into the .ase swatches as CMYK.",
      "Supplied masters are copied byte-for-byte. PNG files are raster proofs, not vector masters.",
      "",
      "Changes:",
      ...pack.DESIGNER_PACK_CHANGELOG.map((c) => `v${c.version} ${c.date}: ${c.notes.join(" ")}`),
    ].join("\n"),
  );
  if (missing.length) root.file("MISSING.txt", missing.join("\n"));
  root.file("manifest.json", JSON.stringify({ pack: pack.PACK_ROOT, version: pack.DESIGNER_PACK_VERSION, built: new Date().toISOString(), files: manifest }, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: `${pack.PACK_ROOT}.zip`, missing };
}
