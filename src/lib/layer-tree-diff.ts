// -----------------------------------------------------------------------------
// PPTX object-tree diff.
//
// Compares the object tree of two layered exports (a saved baseline vs. the
// bytes we just produced) and names the exact element(s) that changed, so a
// layering regression can be reviewed element by element instead of as a single
// "export failed" line.
//
// Input is the per-slide `LayerReport` inventory (see layer-report.ts) which
// both the export-verify harness and the debug manifest already produce.
//
// Matching is intentionally identity-free: PowerPoint drawing ids shuffle
// whenever the exporter emits objects in a different order, so objects are
// paired on what a reviewer would recognise — type, object name, copy, and
// position — and only then compared field by field.
// -----------------------------------------------------------------------------

import type { LayerObject, LayerObjectType, LayerReport } from "./layer-report";

/** Rect drift (fraction of slide) below which a move is not worth reporting. */
export const MOVE_EPSILON = 0.004;
/** Rect drift above which a move is treated as a layout regression, not noise. */
export const MOVE_REGRESSION = 0.02;
/** Max centre distance for pairing two otherwise-similar objects. */
const PAIR_RADIUS = 0.25;

export type DiffKind = "added" | "removed" | "changed" | "unchanged";
export type DiffSeverity = "regression" | "warning" | "info" | "ok";

export interface FieldChange {
  field: "type" | "editable" | "layered" | "text" | "name" | "rect";
  before: string;
  after: string;
}

export interface ObjectDiff {
  kind: DiffKind;
  severity: DiffSeverity;
  /** Reviewer-facing element label, e.g. `Text "Connecting every stage…"`. */
  label: string;
  type: LayerObjectType;
  /** Baseline object, absent for additions. */
  before?: LayerObject;
  /** Current object, absent for removals. */
  after?: LayerObject;
  changes: FieldChange[];
  /** Rect centre drift in slide fractions, when both sides exist. */
  drift?: number;
  /** Why this diff is a regression, when it is one. */
  reason?: string;
}

export interface SlideTreeDiff {
  index: number;
  variantId?: string;
  objects: ObjectDiff[];
  counts: { added: number; removed: number; changed: number; unchanged: number };
  byType: Partial<Record<LayerObjectType, { before: number; after: number }>>;
  /** Element-level regressions on this slide, in reviewer wording. */
  regressions: string[];
  warnings: string[];
  /** Slide flipped from layered content to a single flat picture. */
  flattened: boolean;
  ok: boolean;
}

export interface TreeDiffResult {
  slides: SlideTreeDiff[];
  totals: {
    slides: number;
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
    regressions: number;
    warnings: number;
  };
  /** Flat list of `slide N · <element> · <reason>` regression lines. */
  regressions: string[];
  warnings: string[];
  ok: boolean;
}

/** Compact per-object row: what a baseline snapshot needs to store. */
export interface LayerTreeNode {
  type: LayerObjectType;
  name: string;
  text?: string;
  editable: boolean;
  layered: boolean;
  rect: [number, number, number, number];
}

export interface LayerTreeSnapshot {
  /** `variantId@packId@mode` for harness snapshots. */
  key: string;
  variantId?: string;
  slides: LayerTreeNode[][];
}

const TYPE_LABEL: Record<LayerObjectType, string> = {
  text: "Text",
  image: "Image",
  icon: "Icon",
  logo: "Logo",
  shape: "Shape",
  chart: "Chart",
  plate: "Design plate",
};

/** Types whose disappearance means content vanished from the deck. */
const CONTENT_TYPES: LayerObjectType[] = ["text", "image", "icon", "logo", "shape", "chart"];

function norm(s: string | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function centre(r: LayerObject["rect"]): [number, number] {
  return [r.x + r.w / 2, r.y + r.h / 2];
}

function distance(a: LayerObject["rect"], b: LayerObject["rect"]): number {
  const [ax, ay] = centre(a);
  const [bx, by] = centre(b);
  return Math.hypot(ax - bx, ay - by);
}

function rectDrift(a: LayerObject["rect"], b: LayerObject["rect"]): number {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.w - b.w),
    Math.abs(a.h - b.h),
  );
}

function rectText(r: LayerObject["rect"]): string {
  return [r.x, r.y, r.w, r.h].map((n) => n.toFixed(3)).join(", ");
}

/** Reviewer-facing element label: type plus the most recognisable identifier. */
export function objectLabel(o: LayerObject): string {
  const head = TYPE_LABEL[o.type] ?? o.type;
  if (o.text) return `${head} "${o.text.slice(0, 48)}"`;
  if (o.name) return `${head} ${o.name}`;
  return `${head} @ ${rectText(o.rect)}`;
}

/** Expand a stored snapshot node back into the shape the differ compares. */
export function nodeToObject(n: LayerTreeNode, index: number): LayerObject {
  return {
    id: String(index + 1),
    name: n.name,
    type: n.type,
    editable: n.editable,
    layered: n.layered,
    rect: { x: n.rect[0], y: n.rect[1], w: n.rect[2], h: n.rect[3] },
    text: n.text,
  };
}

/** Compact a live report for storage in a baseline snapshot. */
export function reportToNodes(report: LayerReport): LayerTreeNode[] {
  return report.objects.map((o) => ({
    type: o.type,
    name: o.name,
    text: o.text,
    editable: o.editable,
    layered: o.layered,
    rect: [
      Number(o.rect.x.toFixed(4)),
      Number(o.rect.y.toFixed(4)),
      Number(o.rect.w.toFixed(4)),
      Number(o.rect.h.toFixed(4)),
    ] as [number, number, number, number],
  }));
}

export function snapshotFromReports(
  key: string,
  reports: LayerReport[],
  variantId?: string,
): LayerTreeSnapshot {
  return { key, variantId, slides: reports.map(reportToNodes) };
}

/**
 * Pair objects across two slides. Exact identity (type + name + copy) wins; the
 * remainder is matched by type and proximity so a retitled or nudged element
 * reads as "changed" rather than a bogus add/remove pair.
 */
function pair(
  before: LayerObject[],
  after: LayerObject[],
): Array<[LayerObject | undefined, LayerObject | undefined]> {
  const usedAfter = new Set<number>();
  const pairs: Array<[LayerObject | undefined, LayerObject | undefined]> = [];
  const leftovers: LayerObject[] = [];

  const keyOf = (o: LayerObject) => `${o.type}|${norm(o.name)}|${norm(o.text)}`;

  for (const b of before) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < after.length; i += 1) {
      if (usedAfter.has(i)) continue;
      if (keyOf(after[i]) !== keyOf(b)) continue;
      const d = distance(b.rect, after[i].rect);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      usedAfter.add(bestIdx);
      pairs.push([b, after[bestIdx]]);
    } else {
      leftovers.push(b);
    }
  }

  // Second pass: same type, nearest unmatched neighbour within PAIR_RADIUS.
  for (const b of leftovers) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < after.length; i += 1) {
      if (usedAfter.has(i)) continue;
      if (after[i].type !== b.type) continue;
      const d = distance(b.rect, after[i].rect);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDist <= PAIR_RADIUS) {
      usedAfter.add(bestIdx);
      pairs.push([b, after[bestIdx]]);
    } else {
      pairs.push([b, undefined]);
    }
  }

  after.forEach((a, i) => {
    if (!usedAfter.has(i)) pairs.push([undefined, a]);
  });

  return pairs;
}

function diffPair(b: LayerObject, a: LayerObject): ObjectDiff {
  const changes: FieldChange[] = [];
  if (b.type !== a.type) changes.push({ field: "type", before: b.type, after: a.type });
  if (b.editable !== a.editable)
    changes.push({ field: "editable", before: String(b.editable), after: String(a.editable) });
  if (b.layered !== a.layered)
    changes.push({ field: "layered", before: String(b.layered), after: String(a.layered) });
  if (norm(b.text) !== norm(a.text))
    changes.push({ field: "text", before: b.text ?? "—", after: a.text ?? "—" });
  if (norm(b.name) !== norm(a.name))
    changes.push({ field: "name", before: b.name || "—", after: a.name || "—" });

  const drift = rectDrift(b.rect, a.rect);
  if (drift > MOVE_EPSILON)
    changes.push({ field: "rect", before: rectText(b.rect), after: rectText(a.rect) });

  let severity: DiffSeverity = changes.length === 0 ? "ok" : "info";
  let reason: string | undefined;

  if (b.editable && !a.editable) {
    severity = "regression";
    reason = "was editable in the baseline, now exports as non-editable";
  } else if (b.layered && !a.layered) {
    severity = "regression";
    reason = "was an independent layer, now baked into another object";
  } else if (b.type !== a.type && b.type !== "plate" && a.type === "plate") {
    severity = "regression";
    reason = `${TYPE_LABEL[b.type]} collapsed into the rasterized design plate`;
  } else if (drift > MOVE_REGRESSION) {
    severity = "warning";
    reason = `moved / resized by ${(drift * 100).toFixed(1)}% of the slide`;
  } else if (changes.some((c) => c.field === "text")) {
    severity = "warning";
    reason = "copy changed";
  }

  return {
    kind: changes.length === 0 ? "unchanged" : "changed",
    severity,
    label: objectLabel(a),
    type: a.type,
    before: b,
    after: a,
    changes,
    drift,
    reason,
  };
}

function tallyTypes(before: LayerObject[], after: LayerObject[]) {
  const byType: SlideTreeDiff["byType"] = {};
  const bump = (t: LayerObjectType, side: "before" | "after") => {
    const cur = byType[t] ?? { before: 0, after: 0 };
    cur[side] += 1;
    byType[t] = cur;
  };
  before.forEach((o) => bump(o.type, "before"));
  after.forEach((o) => bump(o.type, "after"));
  return byType;
}

export function diffSlideTree(
  before: LayerObject[],
  after: LayerObject[],
  index: number,
  variantId?: string,
): SlideTreeDiff {
  const objects: ObjectDiff[] = [];

  for (const [b, a] of pair(before, after)) {
    if (b && a) {
      objects.push(diffPair(b, a));
      continue;
    }
    if (b && !a) {
      const isContent = CONTENT_TYPES.includes(b.type);
      objects.push({
        kind: "removed",
        severity: isContent ? "regression" : "warning",
        label: objectLabel(b),
        type: b.type,
        before: b,
        changes: [],
        reason: isContent
          ? `${TYPE_LABEL[b.type]} present in the baseline is missing from this export`
          : "design plate no longer emitted",
      });
      continue;
    }
    if (a) {
      objects.push({
        kind: "added",
        severity: a.type === "plate" && before.some((o) => o.type !== "plate") ? "warning" : "info",
        label: objectLabel(a),
        type: a.type,
        after: a,
        changes: [],
        reason: a.type === "plate" ? "extra rasterized plate in this export" : undefined,
      });
    }
  }

  // Reviewer-first ordering: regressions, then warnings, then everything else.
  const rank: Record<DiffSeverity, number> = { regression: 0, warning: 1, info: 2, ok: 3 };
  objects.sort(
    (x, y) =>
      rank[x.severity] - rank[y.severity] ||
      (x.after ?? x.before)!.rect.y - (y.after ?? y.before)!.rect.y,
  );

  const counts = {
    added: objects.filter((o) => o.kind === "added").length,
    removed: objects.filter((o) => o.kind === "removed").length,
    changed: objects.filter((o) => o.kind === "changed").length,
    unchanged: objects.filter((o) => o.kind === "unchanged").length,
  };

  const contentBefore = before.filter((o) => o.type !== "plate").length;
  const contentAfter = after.filter((o) => o.type !== "plate").length;
  const flattened = contentBefore > 0 && contentAfter === 0;

  const regressions = objects
    .filter((o) => o.severity === "regression")
    .map((o) => `${o.label} — ${o.reason ?? "layering regression"}`);
  const warnings = objects
    .filter((o) => o.severity === "warning")
    .map((o) => `${o.label} — ${o.reason ?? "changed"}`);

  if (flattened)
    regressions.unshift(
      `slide flattened: ${contentBefore} native objects in the baseline, none above the plate now`,
    );

  return {
    index,
    variantId,
    objects,
    counts,
    byType: tallyTypes(before, after),
    regressions,
    warnings,
    flattened,
    ok: regressions.length === 0,
  };
}

/**
 * Diff a whole export: baseline snapshot vs. the reports parsed from the bytes
 * we just produced. A slide count change is itself reported as a regression on
 * the missing slides.
 */
export function diffLayerTrees(
  baseline: LayerTreeSnapshot,
  current: LayerReport[],
  variantId?: string,
): TreeDiffResult {
  const slideCount = Math.max(baseline.slides.length, current.length);
  const slides: SlideTreeDiff[] = [];

  for (let i = 0; i < slideCount; i += 1) {
    const before = (baseline.slides[i] ?? []).map(nodeToObject);
    const after = current[i]?.objects ?? [];
    const diff = diffSlideTree(before, after, i, variantId ?? baseline.variantId);
    if (!current[i]) {
      diff.regressions.unshift("slide missing from this export (present in the baseline)");
      diff.ok = false;
    } else if (!baseline.slides[i]) {
      diff.warnings.unshift("new slide, not present in the baseline");
    }
    slides.push(diff);
  }

  const totals = {
    slides: slides.length,
    added: slides.reduce((n, s) => n + s.counts.added, 0),
    removed: slides.reduce((n, s) => n + s.counts.removed, 0),
    changed: slides.reduce((n, s) => n + s.counts.changed, 0),
    unchanged: slides.reduce((n, s) => n + s.counts.unchanged, 0),
    regressions: slides.reduce((n, s) => n + s.regressions.length, 0),
    warnings: slides.reduce((n, s) => n + s.warnings.length, 0),
  };

  return {
    slides,
    totals,
    regressions: slides.flatMap((s) => s.regressions.map((r) => `slide ${s.index + 1} · ${r}`)),
    warnings: slides.flatMap((s) => s.warnings.map((r) => `slide ${s.index + 1} · ${r}`)),
    ok: totals.regressions === 0,
  };
}

/** One-line summary for logs and CI output. */
export function summarizeTreeDiff(result: TreeDiffResult): string {
  const { totals } = result;
  return `${result.ok ? "no regressions" : `${totals.regressions} regression(s)`} · +${totals.added} / -${totals.removed} / ~${totals.changed} objects · ${totals.warnings} warning(s)`;
}
