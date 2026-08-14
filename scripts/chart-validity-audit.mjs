#!/usr/bin/env node
/**
 * CHART / STAT / INFOGRAPHIC VALIDITY AUDIT
 * =========================================
 *
 * Static, offline audit of a generated .pptx that answers one question:
 *
 *   "will PowerPoint open every data graphic in this deck without the repair
 *    dialog, and are the graphics real objects rather than flattened pixels?"
 *
 * It reads the package with JSZip and asserts the OOXML rules that Office's
 * strict validator actually enforces on chart parts (the ones that produced
 * "PowerPoint found a problem with content" for us), plus the editability
 * contract for stats/infographics.
 *
 * CHECKS (per ppt/charts/chartN.xml)
 *   axid-count        a plot may not declare more <c:axId> than the chart has axes
 *   valax-purity      <c:auto> / <c:lblAlgn> / <c:noMultiLvlLbl> are cat-axis only
 *   grouping-present  line/area/bar plots need <c:grouping> before the first <c:ser>
 *   child-order       grouping/varyColors must precede <c:ser>; axIds must follow it
 *   ser-order         <c:ser> children in idx/order/tx/spPr/…/cat/val sequence
 *   no-series         a plot block with zero <c:ser> draws nothing in PowerPoint
 *   ser-idx-unique    duplicated c:ser idx/order values crash the plot
 *   numcache-arity    <c:val> point count must match <c:cat> point count
 *   axid-crossref     every plot axId must resolve to a declared axis
 *   line-width        <a:ln w> must be an integer EMU in [0, 20116800]
 *   rel-part          each chart has a colors/style rel target that exists
 *
 * CHECKS (per ppt/slides/slideN.xml)
 *   graphic-tier      a slide whose only visual is one full-bleed <p:pic> and no
 *                     <p:sp>/<a:graphicFrame> is FLAT — the regression where a
 *                     stat/bento/process module renders as a screenshot
 *   stat-text         big-number stat text is present as <a:t>, not baked in a pic
 *
 * USAGE
 *   node scripts/chart-validity-audit.mjs deck.pptx [more.pptx…] [--json out.json] [--ci]
 *
 * EXIT CODES
 *   0 clean   1 violations found with --ci   2 usage/read error
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith("--") && a.endsWith(".pptx"));
const jsonOut = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
const CI = argv.includes("--ci");

const PLOTS = [
  "barChart",
  "bar3DChart",
  "lineChart",
  "line3DChart",
  "areaChart",
  "area3DChart",
  "radarChart",
  "pieChart",
  "doughnutChart",
  "scatterChart",
  "bubbleChart",
];
const NEEDS_GROUPING = new Set([
  "barChart",
  "bar3DChart",
  "lineChart",
  "line3DChart",
  "areaChart",
  "area3DChart",
]);
const SER_ORDER = [
  "c:idx",
  "c:order",
  "c:tx",
  "c:spPr",
  "c:invertIfNegative",
  "c:marker",
  "c:dPt",
  "c:dLbls",
  "c:trendline",
  "c:errBars",
  "c:cat",
  "c:xVal",
  "c:val",
  "c:yVal",
  "c:bubbleSize",
  "c:smooth",
];

const count = (s, re) => (s.match(re) ?? []).length;

function plotBlocks(xml) {
  const out = [];
  for (const type of PLOTS) {
    const re = new RegExp(`<c:${type}>([\\s\\S]*?)</c:${type}>`, "g");
    let m;
    while ((m = re.exec(xml))) out.push({ type, inner: m[1] });
  }
  return out;
}

function auditChart(name, xml) {
  const issues = [];
  const add = (rule, detail) => issues.push({ part: name, rule, detail });

  const declaredAxes = [
    ...xml.matchAll(/<c:(catAx|dateAx|valAx|serAx)>([\s\S]*?)<\/c:\1>/g),
  ].map((m) => ({ kind: m[1], body: m[2] }));
  const axIdsDeclared = new Set(
    declaredAxes.flatMap((a) => [...a.body.matchAll(/<c:axId val="(\d+)"\s*\/>/g)].map((x) => x[1])),
  );

  for (const { kind, body } of declaredAxes) {
    if (kind !== "valAx") continue;
    for (const bad of ["c:auto", "c:lblAlgn", "c:noMultiLvlLbl"]) {
      if (new RegExp(`<${bad}[ /]`).test(body)) add("valax-purity", `<${bad}> inside <c:valAx>`);
    }
  }

  // ST_LineWidth must be an integer EMU in [0, 20116800].
  for (const m of xml.matchAll(/<a:ln\b[^>]*?\sw="([^"]+)"/g)) {
    const n = Number(m[1]);
    if (!Number.isInteger(n) || n < 0 || n > 20116800) {
      add("line-width", `illegal <a:ln w="${m[1]}">`);
    }
  }

  for (const { type, inner } of plotBlocks(xml)) {
    const axIds = [...inner.matchAll(/<c:axId val="(\d+)"\s*\/>/g)].map((m) => m[1]);
    const cartesian = !/^(pie|doughnut)Chart$/.test(type);

    if (cartesian && axIds.length > declaredAxes.length) {
      add("axid-count", `${type} declares ${axIds.length} axId for ${declaredAxes.length} axes`);
    }
    for (const id of axIds) {
      if (!axIdsDeclared.has(id)) add("axid-crossref", `${type} axId ${id} has no matching axis`);
    }

    if (NEEDS_GROUPING.has(type) && !/<c:grouping\s+val="/.test(inner)) {
      add("grouping-present", `${type} has no <c:grouping>`);
    }
    const serIdx = inner.indexOf("<c:ser>");
    if (serIdx >= 0) {
      for (const pre of ["c:grouping", "c:varyColors", "c:barDir"]) {
        const at = inner.search(new RegExp(`<${pre}[ /]`));
        if (at > serIdx) add("child-order", `<${pre}> appears after <c:ser> in ${type}`);
      }
      const firstAxId = inner.search(/<c:axId /);
      if (firstAxId >= 0 && firstAxId < serIdx) {
        add("child-order", `<c:axId> appears before <c:ser> in ${type}`);
      }
    }

    const sers0 = [...inner.matchAll(/<c:ser>/g)].length;
    if (sers0 === 0) add("no-series", `${type} has no <c:ser> — renders blank`);

    const sers = [...inner.matchAll(/<c:ser>([\s\S]*?)<\/c:ser>/g)].map((m) => m[1]);
    const idxs = new Set();
    sers.forEach((ser, i) => {
      const idx = /<c:idx val="(\d+)"\s*\/>/.exec(ser)?.[1];
      if (idx !== undefined) {
        if (idxs.has(idx)) add("ser-idx-unique", `${type} repeats c:idx ${idx}`);
        idxs.add(idx);
      }
      // child order within the series
      let last = -1;
      for (const tag of SER_ORDER) {
        const at = ser.indexOf(`<${tag}`);
        if (at === -1) continue;
        if (at < last) add("ser-order", `${type} ser#${i}: <${tag}> out of sequence`);
        last = at;
      }
      const cats = count(/<c:cat>([\s\S]*?)<\/c:cat>/.exec(ser)?.[1] ?? "", /<c:pt idx="/g);
      const vals = count(/<c:val>([\s\S]*?)<\/c:val>/.exec(ser)?.[1] ?? "", /<c:pt idx="/g);
      if (cats && vals && cats !== vals) {
        add("numcache-arity", `${type} ser#${i}: ${vals} values for ${cats} categories`);
      }
    });
  }
  return issues;
}

function auditSlide(name, xml) {
  const issues = [];
  const shapes = count(xml, /<p:sp>/g);
  const frames = count(xml, /<p:graphicFrame>/g);
  const pics = count(xml, /<p:pic>/g);
  const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1].trim()).filter(Boolean);

  if (pics >= 1 && shapes === 0 && frames === 0) {
    issues.push({
      part: name,
      rule: "graphic-tier",
      detail: `flattened: ${pics} picture(s), no native shapes or frames`,
    });
  }
  // A stats/KPI slide with a chart frame but zero text runs means the labels got
  // baked into the raster.
  if (frames > 0 && texts.length === 0) {
    issues.push({ part: name, rule: "stat-text", detail: "chart frame with no text runs" });
  }
  return { issues, shapes, frames, pics, texts: texts.length };
}

async function auditFile(file) {
  const zip = await JSZip.loadAsync(await readFile(file));
  const names = Object.keys(zip.files);
  const issues = [];
  let charts = 0;
  let slides = 0;
  let nativeShapes = 0;
  let flattened = 0;

  for (const name of names) {
    if (/^ppt\/charts\/chart\d+\.xml$/.test(name)) {
      charts += 1;
      const xml = await zip.file(name).async("string");
      issues.push(...auditChart(name, xml));
      // rel targets must exist
      const relName = name.replace(/charts\/(chart\d+)\.xml$/, "charts/_rels/$1.xml.rels");
      const rels = zip.file(relName);
      if (rels) {
        const relXml = await rels.async("string");
        for (const m of relXml.matchAll(/Target="([^"]+)"/g)) {
          if (m[1].startsWith("http")) continue;
          const target = path.posix.normalize(path.posix.join("ppt/charts", m[1]));
          if (!zip.file(target)) {
            issues.push({ part: name, rule: "rel-part", detail: `missing rel target ${target}` });
          }
        }
      }
    } else if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
      slides += 1;
      const xml = await zip.file(name).async("string");
      const r = auditSlide(name, xml);
      issues.push(...r.issues);
      nativeShapes += r.shapes;
      if (r.issues.some((i) => i.rule === "graphic-tier")) flattened += 1;
    }
  }
  return { file, slides, charts, nativeShapes, flattened, issues };
}

async function main() {
  if (!files.length) {
    console.error("usage: node scripts/chart-validity-audit.mjs <deck.pptx…> [--json out] [--ci]");
    process.exit(2);
  }
  const results = [];
  for (const f of files) results.push(await auditFile(f));

  let total = 0;
  for (const r of results) {
    console.log(
      `\n${path.basename(r.file)} — ${r.slides} slides · ${r.charts} chart parts · ${r.nativeShapes} native shapes · ${r.flattened} flattened slide(s)`,
    );
    if (!r.issues.length) {
      console.log("  ✓ no validity violations");
      continue;
    }
    const byRule = new Map();
    for (const i of r.issues) byRule.set(i.rule, [...(byRule.get(i.rule) ?? []), i]);
    for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ✗ ${rule} × ${list.length}`);
      for (const i of list.slice(0, 5)) console.log(`      ${i.part}: ${i.detail}`);
      if (list.length > 5) console.log(`      … ${list.length - 5} more`);
    }
    total += r.issues.length;
  }

  if (jsonOut) {
    await writeFile(jsonOut, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\n· report → ${jsonOut}`);
  }
  console.log(`\n${total === 0 ? "✓ clean" : `✗ ${total} violation(s)`}`);
  if (total && CI) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
