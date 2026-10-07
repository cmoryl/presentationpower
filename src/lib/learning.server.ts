// Learning loop helpers. Signals are fire-and-forget: a failed log must never
// block a save or a decision.
type Sb = { from: (t: string) => any };

export type LearningSignalInput = {
  source: "edit" | "approval" | "outcome";
  subjectType?: string | null;
  subjectId?: string | null;
  divisionId?: string | null;
  eventId?: string | null;
  city?: string | null;
  summary: string;
  detail?: Record<string, unknown>;
};

export async function logLearningSignal(sb: Sb, userId: string, s: LearningSignalInput): Promise<void> {
  try {
    await sb.from("learning_signals").insert({
      source: s.source,
      subject_type: s.subjectType ?? null,
      subject_id: s.subjectId ?? null,
      division_id: s.divisionId ?? null,
      event_id: s.eventId ?? null,
      city: s.city ?? null,
      summary: s.summary.slice(0, 1000),
      detail: s.detail ?? {},
      created_by: userId,
    });
  } catch {
    /* best-effort */
  }
}

const TEXT_KEYS = /^(title|headline|heading|subtitle|subhead|body|text|caption|quote|label|description|kicker|eyebrow)$/i;

function collect(node: unknown, path: string, out: Map<string, string>, depth = 0) {
  if (depth > 6 || node == null) return;
  if (Array.isArray(node)) return node.forEach((v, i) => collect(v, `${path}[${i}]`, out, depth + 1));
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("__")) continue;
      if (typeof v === "string" && TEXT_KEYS.test(k) && v.trim().length > 3) out.set(`${path}.${k}`, v.trim());
      else collect(v, `${path}.${k}`, out, depth + 1);
    }
  }
}

/** Text fields a person changed between the saved and incoming slide content. */
export type TextCorrection = { field: string; before: string; after: string; numeric?: boolean };

const nums = (t: string) => (t.match(/\d[\d.,]*\s*(%|k|m|bn|b|x)?/gi) ?? []).join("|");

export function textCorrections(before: unknown, after: unknown, max = 6): TextCorrection[] {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  collect(before, "", a);
  collect(after, "", b);
  const out: TextCorrection[] = [];
  for (const [k, was] of a) {
    const now = b.get(k);
    if (now && now !== was && out.length < max) {
      const numeric = nums(was) !== nums(now);
      out.push({ field: k.replace(/^\./, ""), before: was.slice(0, 400), after: now.slice(0, 400), ...(numeric ? { numeric } : {}) });
    }
  }
  return out;
}

/** Summary line for a set of corrections; numeric fixes are called out because
 *  they usually mean the AI made a figure up. */
export function correctionSummary(what: string, fixes: TextCorrection[]): string {
  const n = fixes.filter((f) => f.numeric).length;
  return `${fixes.length} text correction${fixes.length === 1 ? "" : "s"} saved on ${what}${n ? ` — ${n} changed a number or statistic (possible invented figure)` : ""}`;
}

const DESIGN_KEYS = ["mode", "canvasBlocks", "inkOverrides", "inkScopeOverrides", "textFormats", "templateOverride", "statLayout", "layers", "logoPosition", "hidden"] as const;

/** Layout/design changes between a saved slide row and the incoming slide. */
export function designChanges(
  before: { variant_id?: string | null; layout_id?: string | null; content?: Record<string, unknown> | null },
  after: Record<string, unknown>,
): string[] {
  const out: string[] = [];
  if (before.variant_id && after.variantId && before.variant_id !== after.variantId) out.push(`module ${before.variant_id} → ${String(after.variantId)}`);
  if (before.layout_id && after.layoutId && before.layout_id !== after.layoutId) out.push(`layout ${before.layout_id} → ${String(after.layoutId)}`);
  const was = ((before.content ?? {})["__extras"] ?? {}) as Record<string, unknown>;
  for (const k of DESIGN_KEYS) {
    const a = JSON.stringify(was[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a === b) continue;
    if (k === "canvasBlocks") {
      const n = Array.isArray(after[k]) ? (after[k] as unknown[]).length : 0;
      out.push(`custom canvas pieces now ${n}`);
    } else if (k === "mode") out.push(`appearance → ${String(after[k] ?? "default")}`);
    else out.push(`${k} changed`);
  }
  return out;
}
