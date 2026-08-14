#!/usr/bin/env node
/**
 * POWERPOINT-GRADE RENDERER
 * =========================
 *
 * Renders a .pptx with REAL Microsoft PowerPoint instead of LibreOffice, by
 * routing through the linked Microsoft PowerPoint connection: upload the package
 * to OneDrive, ask Graph for the `pdf` conversion (that conversion is done by
 * Office itself), download the PDF, then delete the temp drive item.
 *
 * Why this exists: every visual-QA gate in this repo (pixel-diff-exports,
 * chart-parity) renders with LibreOffice, which mis-lays text, flattens
 * gradients and mis-scales chart plot areas. Those artifacts have repeatedly
 * been mistaken for export bugs. Office's own converter is ground truth for
 * "does this chart/infographic actually open and draw correctly in PowerPoint".
 *
 * A non-2xx from Graph is surfaced verbatim (status + body) — never retried
 * against the provider API directly.
 *
 * USAGE
 *   node scripts/render-via-powerpoint.mjs deck.pptx --out artifacts/pp
 *   node scripts/render-via-powerpoint.mjs deck.pptx --png --dpi 150
 *
 * FLAGS
 *   --out <dir>   artifact dir (default artifacts/powerpoint-render)
 *   --png         also rasterize the PDF to page images with pdftoppm
 *   --dpi N       raster dpi (default 150)
 *   --keep        do not delete the uploaded OneDrive item
 *
 * EXIT CODES
 *   0 rendered   1 render/convert failed   2 misconfigured (no connector creds)
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_powerpoint";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);
const input = argv.find((a) => !a.startsWith("--") && a.endsWith(".pptx"));

const OUT = flag("out", "artifacts/powerpoint-render");
const DPI = Number(flag("dpi", 150));

function creds() {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.MICROSOFT_POWERPOINT_API_KEY;
  if (!lovable || !conn) return null;
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
  };
}

async function graph(method, url, { headers = {}, body } = {}) {
  const res = await fetch(url.startsWith("http") ? url : `${GATEWAY}${url}`, {
    method,
    headers: { ...creds(), ...headers },
    body,
    redirect: "follow",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PowerPoint/Graph ${method} ${url} failed [${res.status}]: ${text.slice(0, 600)}`);
  }
  return res;
}

/**
 * Upload `bytes` as a temp OneDrive .pptx, convert it to PDF with Office, and
 * return { pdf: Uint8Array, itemId }.
 */
export async function renderPptxWithPowerPoint(bytes, remoteName) {
  if (!creds()) {
    const err = new Error(
      "Microsoft PowerPoint connector credentials are missing (LOVABLE_API_KEY / MICROSOFT_POWERPOINT_API_KEY).",
    );
    err.code = "NO_CREDS";
    throw err;
  }
  const name = remoteName ?? `lovable-qa-${Date.now()}.pptx`;
  const up = await graph("PUT", `/me/drive/root:/${encodeURIComponent(name)}:/content`, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
    body: bytes,
  });
  const item = await up.json();
  const itemId = item.id;

  // Office does this conversion — a failure here means PowerPoint itself
  // could not open or draw the package.
  const conv = await graph("GET", `/me/drive/items/${itemId}/content?format=pdf`);
  const pdf = new Uint8Array(await conv.arrayBuffer());
  return { pdf, itemId, name };
}

export async function deleteDriveItem(itemId) {
  await graph("DELETE", `/me/drive/items/${itemId}`).catch(() => {});
}

async function main() {
  if (!input) {
    console.error("usage: node scripts/render-via-powerpoint.mjs <deck.pptx> [--png] [--out dir]");
    process.exit(2);
  }
  if (!creds()) {
    console.error(
      "! Microsoft PowerPoint connector is not available in this environment (missing credentials).",
    );
    process.exit(2);
  }
  await mkdir(OUT, { recursive: true });
  const bytes = await readFile(input);
  const base = path.basename(input, ".pptx");
  console.log(`→ uploading ${input} (${(bytes.length / 1024 / 1024).toFixed(2)} MB) to PowerPoint…`);

  let rendered;
  try {
    rendered = await renderPptxWithPowerPoint(bytes, `${base}-${Date.now()}.pptx`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(err.code === "NO_CREDS" ? 2 : 1);
  }

  const pdfPath = path.join(OUT, `${base}.pdf`);
  await writeFile(pdfPath, rendered.pdf);
  console.log(`✓ PowerPoint rendered → ${pdfPath} (${(rendered.pdf.length / 1024).toFixed(0)} KB)`);

  if (has("png")) {
    await run("pdftoppm", ["-jpeg", "-r", String(DPI), pdfPath, path.join(OUT, `${base}-page`)]);
    console.log(`✓ rasterized at ${DPI}dpi → ${OUT}/${base}-page-*.jpg`);
  }

  if (!has("keep")) await deleteDriveItem(rendered.itemId);
  else console.log(`· kept OneDrive item ${rendered.itemId}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { rm };
