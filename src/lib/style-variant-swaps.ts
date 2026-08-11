// Style-scoped variant equivalences.
//
// Some layouts have a house sibling in a different visual language that carries
// the *same* argument. A before/after split and MV-BENTO-VALUE-CLOSE both say
// "here is the shift, here is the promise, here is the ask" — one as two facing
// columns, the other as a bento grid closed by a summary band.
//
// When the reviewer sets the deck to the cards / bento style we therefore swap
// those slides onto the bento sibling automatically and translate the authored
// copy into the sibling's content shape. Nothing is invented: every clause is
// carried across from the source slide, and a slide whose copy can't fill the
// bento shape is left exactly as it was.
//
// Pure module: no React, no network.

/**
 * Source variant → bento sibling. Keyed by the variant the design pass chose,
 * and only applied when the active style favours the target (see
 * `bentoSiblingFor`).
 */
export const BENTO_SIBLINGS: Record<string, string> = {
  "MV-PROC-BEFORE-AFTER": "MV-BENTO-VALUE-CLOSE",
  "MV-PROC-BEFORE-AFTER-SPLIT": "MV-BENTO-VALUE-CLOSE",
  "MV-CLOSE-SPLIT": "MV-BENTO-VALUE-CLOSE",
  "MV-CLOSE-DUAL-CTA": "MV-BENTO-VALUE-CLOSE",
  "MV-CLOSE-DECISION": "MV-BENTO-VALUE-CLOSE",
  "MV-CLOSE-STATEMENT": "MV-BENTO-VALUE-CLOSE",
  "MV-CLOSE-METRIC-PROMISE": "MV-BENTO-VALUE-CLOSE",
};

/**
 * The bento sibling for `variantId`, but only when `favoured` (the deck- or
 * slide-level style bias) actually asks for that sibling. Returns null when the
 * style is balanced, is a different language, or the variant has no sibling.
 */
export function bentoSiblingFor(
  variantId: string,
  favoured: ReadonlySet<string> | null | undefined,
): string | null {
  const target = BENTO_SIBLINGS[variantId];
  if (!target) return null;
  if (!favoured || favoured.size === 0) return null;
  return favoured.has(target) ? target : null;
}

// ── content translation ──────────────────────────────────────────────────

type Rec = Record<string, unknown>;

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const obj = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(Boolean).map(obj) : []);

/** Pull `{ lead, emphasis }` out of a band-shaped field or a plain string. */
function band(v: unknown): { lead: string; emphasis: string } {
  if (typeof v === "string") return { lead: v.trim(), emphasis: "" };
  const o = obj(v);
  return { lead: s(o.lead), emphasis: s(o.emphasis) };
}

/** Normalise a card-ish item to the bento cell shape, keeping any icon. */
function cell(it: Rec): { icon?: string; title: string; body: string } | null {
  const title = s(it.title) || s(it.label) || s(it.statement) || s(it.head);
  const body = s(it.body) || s(it.copy) || s(it.description) || s(it.detail);
  if (!title && !body) return null;
  const icon = s(it.icon);
  return { ...(icon ? { icon } : {}), title: title || body.slice(0, 48), body: title ? body : "" };
}

/**
 * Translate before/after or split-close copy into MV-BENTO-VALUE-CLOSE content.
 *
 * · cells come from the *after* / "with us" column (the value being promised),
 *   falling back to the slide's own items when there is no split;
 * · the hub promise becomes the top promise band;
 * · the slide's summary / closing clauses become the close band, with any CTA
 *   copy carried into the second clause.
 *
 * Returns null when there isn't enough real copy to fill the bento (fewer than
 * three cells) — the caller then keeps the original layout.
 */
export function toBentoValueClose(content: unknown): Rec | null {
  const c = obj(content);
  const after = obj(c.after);
  const before = obj(c.before);
  const hub = obj(c.hub);

  const source = arr(after.items).length
    ? arr(after.items)
    : arr(c.items).length
      ? arr(c.items)
      : arr(before.items);
  const items = source.map(cell).filter(Boolean).slice(0, 6) as Array<{
    icon?: string;
    title: string;
    body: string;
  }>;
  if (items.length < 3) return null;

  const hubLines = arr(hub.lines).length
    ? []
    : Array.isArray(hub.lines)
      ? (hub.lines as unknown[]).map(s).filter(Boolean)
      : [];
  const lines = Array.isArray(hub.lines)
    ? (hub.lines as unknown[]).map(s).filter(Boolean)
    : hubLines;

  const summary = band(c.summary ?? c.promise);
  const closing = band(c.close ?? c.cta);

  const promiseLead = summary.lead || s(hub.title) || lines[0] || "";
  const promiseEmphasis = summary.emphasis || (summary.lead ? "" : lines.slice(1).join(" "));

  const out: Rec = {
    title: s(c.title) || s(hub.title),
    ...(s(c.kicker) ? { kicker: s(c.kicker) } : {}),
    ...(s(c.subtitle) || s(hub.title) ? { subtitle: s(c.subtitle) || s(hub.title) } : {}),
    ...(promiseLead || promiseEmphasis
      ? { promise: { lead: promiseLead, emphasis: promiseEmphasis } }
      : {}),
    itemsLabel: s(after.label) || s(c.itemsLabel) || "What you get",
    items,
    close: {
      lead: closing.lead || summary.lead || lines[0] || "",
      emphasis: closing.emphasis || summary.emphasis || lines.slice(1).join(" "),
      ctaTitle: s(obj(c.cta).title) || s(c.ctaTitle) || s(obj(c.close).ctaTitle),
      ctaBody: s(obj(c.cta).body) || s(c.ctaBody) || s(obj(c.close).ctaBody),
    },
    ...(s(c.accentOverride) ? { accentOverride: s(c.accentOverride) } : {}),
  };
  return out;
}
