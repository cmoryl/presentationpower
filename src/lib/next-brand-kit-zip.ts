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
  head("Starting a new city");
  NEW_CITY_CHECKLIST.forEach((c, i) => para(`${i + 1}. ${c.step}. ${c.body}`));
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function buildBrandKitZip(
  families: KitFamily[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; filename: string; missing: string[] }> {
  const zip = new JSZip();
  const root = zip.folder(`NEXT-brand-kit-${BRAND_KIT_VERSION}`)!;
  const missing: string[] = [];

  const logoUrls = [
    ...NEXT_DIVISIONS.flatMap((d) => d.lockups.map((l) => ({ folder: safe(d.name), url: l.src }))),
    ...NEXT_MARKS.map((m) => ({ folder: "marks", url: m.src })),
  ];
  const masters = families.flatMap((f) =>
    f.templates
      .filter((t) => t.downloadUrl)
      .map((t) => ({ folder: f.label, name: `${t.code}-${safe(t.format)}`, url: t.downloadUrl! })),
  );
  const total = logoUrls.length + masters.length + 3;
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  const seen = new Set<string>();
  for (const l of logoUrls) {
    if (seen.has(l.url)) {
      tick();
      continue;
    }
    seen.add(l.url);
    try {
      root.file(`logos/${l.folder}/${l.url.split("/").pop()}`, await bytes(l.url));
    } catch {
      missing.push(`logo ${l.url}`);
    }
    tick();
  }

  for (const f of ["Geist-Regular.ttf", "Geist-Bold.ttf"]) {
    try {
      root.file(`fonts/${f}`, await bytes(`/fonts/${f}`));
    } catch {
      missing.push(`font ${f}`);
    }
  }
  root.file("fonts/LICENSE.txt", "Geist is licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).");
  tick();

  root.file("colour/next-division-palette.csv", paletteCsv());
  root.file("colour/next-division-palette.json", paletteJson());
  root.file("colour/canva-brand-kit-values.txt", canvaCopyValues());
  tick();

  for (const m of masters) {
    try {
      const ext = (m.url.split("?")[0].split(".").pop() ?? "bin").slice(0, 5);
      root.file(`templates/${m.folder}/${m.name}.${ext}`, await bytes(m.url));
    } catch {
      missing.push(`master ${m.folder} ${m.name}`);
    }
    tick();
  }

  try {
    root.file("NEXT-brand-rules.pdf", await buildBrandRulesPdf());
  } catch {
    missing.push("brand rules PDF");
  }
  tick();

  root.file(
    "README.txt",
    [
      `TransPerfect NEXT — Master event brand kit, version ${BRAND_KIT_VERSION}`,
      "",
      "logos/      every division NEXT lockup (SVG) and the NEXT marks",
      "colour/     division palette (CSV, JSON) and values for the Canva brand kit",
      "fonts/      Geist Regular and Bold",
      "templates/  supplied sign masters, exactly as supplied",
      "NEXT-brand-rules.pdf  logo, colour, print and new-city rules",
      "",
      BRAND_KIT_COLOUR_NOTE,
      "Supplied masters are copied byte-for-byte. Check every print file with your printer before production.",
    ].join("\n"),
  );
  if (missing.length) root.file("MISSING.txt", missing.join("\n"));

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: `NEXT-brand-kit-${BRAND_KIT_VERSION}.zip`, missing };
}
