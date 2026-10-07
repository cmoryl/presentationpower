// Learning loop helpers. Signals are fire-and-forget: a failed log must never
// block a save or a decision.
type Sb = { from: (t: string) => any };

export type LearningSignalInput = {
  source: "edit" | "approval" | "outcome";
  subjectType?: string | null;
  subjectId?: string | null;
  divisionId?: string | null;
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
export function textCorrections(before: unknown, after: unknown, max = 6): { field: string; before: string; after: string }[] {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  collect(before, "", a);
  collect(after, "", b);
  const out: { field: string; before: string; after: string }[] = [];
  for (const [k, was] of a) {
    const now = b.get(k);
    if (now && now !== was && out.length < max) out.push({ field: k.replace(/^\./, ""), before: was.slice(0, 400), after: now.slice(0, 400) });
  }
  return out;
}
