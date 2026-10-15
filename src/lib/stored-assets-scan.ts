// Loads stored decks, print pieces and social kits for read-only compliance
// scans (Needs source, Approved figures usage counts). Never edits.
import { lintContent, type ComplianceViolation } from "@/lib/compliance-check";
import type { ApprovedFigure } from "@/lib/approved-figures";

export type StoredAsset = {
  surface: "Deck" | "Print" | "Social kit";
  id: string;
  title: string;
  division: string | null;
  link: { to: string; params: Record<string, string> } | null;
  content: unknown;
  extraBanned: string[];
};

type Sb = { from: (t: string) => any };

export async function loadStoredAssets(supabase: unknown): Promise<StoredAsset[]> {
  const sb = supabase as Sb;
  const out: StoredAsset[] = [];
  const [decks, prints, kits] = await Promise.all([
    sb.from("decks").select("id,title,context,brand_mode_id").limit(2000),
    sb.from("print_assets").select("id,title,content,brand_mode_id").limit(2000),
    sb.from("campaign_kits").select("id,name,copy,event_facts").limit(2000),
  ]);
  const deckRows = (decks.data ?? []) as Array<{ id: string; title: string | null; context: unknown; brand_mode_id: string | null }>;
  for (let i = 0; i < deckRows.length; i += 100) {
    const chunk = deckRows.slice(i, i + 100);
    const { data } = await sb.from("deck_slides").select("deck_id,position,content").in("deck_id", chunk.map((d) => d.id));
    const by = new Map<string, unknown[]>();
    for (const s of (data ?? []) as Array<{ deck_id: string; position: number; content: unknown }>)
      by.set(s.deck_id, [...(by.get(s.deck_id) ?? []), { [`slide ${s.position + 1}`]: s.content }]);
    for (const d of chunk) {
      const ctx = (d.context ?? {}) as Record<string, unknown>;
      const extra = Array.isArray(ctx["risksToAvoid"])
        ? (ctx["risksToAvoid"] as unknown[]).filter((x): x is string => typeof x === "string" && x.length < 40)
        : [];
      out.push({ surface: "Deck", id: d.id, title: d.title ?? "Untitled deck", division: d.brand_mode_id, link: { to: "/decks/$deckId", params: { deckId: d.id } }, content: by.get(d.id) ?? [], extraBanned: extra });
    }
  }
  for (const p of (prints.data ?? []) as Array<{ id: string; title: string | null; content: unknown; brand_mode_id: string | null }>)
    out.push({ surface: "Print", id: p.id, title: p.title ?? "Untitled print piece", division: p.brand_mode_id, link: { to: "/asset/$assetId", params: { assetId: p.id } }, content: p.content, extraBanned: [] });
  for (const k of (kits.data ?? []) as Array<{ id: string; name: string | null; copy: unknown; event_facts: unknown }>)
    out.push({ surface: "Social kit", id: k.id, title: k.name ?? "Untitled kit", division: null, link: null, content: { copy: k.copy, facts: k.event_facts }, extraBanned: [] });
  return out;
}

export function lintAsset(a: StoredAsset, approved: readonly ApprovedFigure[]): ComplianceViolation[] {
  return lintContent(a.content, a.extraBanned, "", { approved, division: a.division });
}

/** Text around a hit, for prefilling the "Add as approved figure" form. */
export function phraseAround(content: unknown, path: string, match: string): string {
  let v: unknown = content;
  let parent: unknown = null;
  for (const part of path.match(/[^.[\]]+/g) ?? []) {
    if (v == null) break;
    parent = v;
    v = (v as Record<string, unknown>)[part];
  }
  const text = typeof v === "string" ? v : match;
  const i = text.indexOf(match);
  if (i < 0) return match;
  const after = text.slice(i).split(/\s+/).slice(0, 4).join(" ").replace(/[.,;:]+$/, "");
  if (after.trim() !== match.trim() || !parent || typeof parent !== "object") return after;
  // Bare value ("90%"): use its sibling label ("Of the Fortune 500").
  const label = Object.values(parent as Record<string, unknown>).find((x) => typeof x === "string" && x !== text);
  return typeof label === "string" ? `${match} ${label.toLowerCase()}`.slice(0, 80) : after;
}
