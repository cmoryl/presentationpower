// Export preflight — cheap, grounded checks that predict whether a PPTX
// export will lose fidelity. The main risk we catch: pasted custom image
// URLs (content.mediaUrl) whose host lacks CORS headers, which the PPTX
// exporter can't fetch → image silently dropped from the deck.
//
// The check mirrors `fetchAsDataUrl` in src/lib/pptx-export.ts exactly:
// same `mode: "cors"` fetch, same failure mode. If our probe fails, the
// exporter's fetch will fail too.

import { useDeckStore, type Deck, type DeckSlide } from "./deck-store";
import { variantSupportsImagery } from "./variant-media";
import { lintContent } from "./compliance-check";

export type PreflightIssue = {
  slideId: string;
  slideIndex: number;
  variantId: string;
  kind: "cors-image" | "empty-title" | "banned-word" | "needs-source" | "brief-leak";
  /** Blocking issues stop the download; "Export anyway" is not offered. */
  blocking?: boolean;
  message: string;
  detail?: string;
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

/** Same-origin or Supabase-hosted assets are always safe to embed. */
function isTrustedImageHost(url: string): boolean {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://x");
    if (typeof window !== "undefined" && u.origin === window.location.origin) return true;
    if (SUPABASE_URL && u.origin === new URL(SUPABASE_URL).origin) return true;
    // Data URIs are already embedded.
    if (u.protocol === "data:") return true;
    return false;
  } catch {
    return false;
  }
}

async function probeCors(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, { mode: "cors", signal });
    return res.ok;
  } catch {
    return false;
  }
}

/** Scan the deck for likely export-fidelity problems. Fast (parallel probes,
 *  4s timeout). Empty result means proceed straight to export. */
export async function runExportPreflight(deck: Deck): Promise<PreflightIssue[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  const targets: { slide: DeckSlide; index: number; url: string }[] = [];
  deck.slides.forEach((slide, index) => {
    const c = slide.content as Record<string, unknown>;
    const url = typeof c.mediaUrl === "string" ? c.mediaUrl : "";
    if (!url) return;
    if (!variantSupportsImagery(slide.variantId)) return;
    if (isTrustedImageHost(url)) return;
    targets.push({ slide, index, url });
  });

  const results = await Promise.all(
    targets.map(async (t) => ({ ...t, ok: await probeCors(t.url, controller.signal) })),
  );
  clearTimeout(timeout);

  const issues: PreflightIssue[] = [];
  for (const r of results) {
    if (r.ok) continue;
    issues.push({
      slideId: r.slide.id,
      slideIndex: r.index,
      variantId: r.slide.variantId,
      kind: "cors-image",
      message: `Slide ${r.index + 1}: pasted image URL can't be fetched for export`,
      detail: r.url,
    });
  }
  issues.push(...complianceIssues(deck));
  return issues;
}

/** Banned words and unsourced figures, one blocking issue per slide and kind. */
export function complianceIssues(
  deck: Deck,
  brief?: { meetingObjective?: string; audience?: string; clientFacts?: string } | null,
): PreflightIssue[] {
  const out: PreflightIssue[] = [];
  const b =
    brief === undefined
      ? (() => {
          try {
            return useDeckStore.getState().briefs[deck.briefId] ?? null;
          } catch {
            return null;
          }
        })()
      : brief;
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
  // Internal brief wording must never appear on the cover or closing slide.
  const internal = [b?.meetingObjective, b?.audience, b?.clientFacts]
    .map((t) => norm(t ?? ""))
    .filter((t) => t.length >= 12);
  if (internal.length && deck.slides.length) {
    const ends = [0, deck.slides.length - 1].filter((v, i, a) => a.indexOf(v) === i);
    for (const index of ends) {
      const slide = deck.slides[index];
      const text = norm(JSON.stringify(slide.content ?? {}));
      if (internal.some((t) => text.includes(t))) {
        out.push({
          slideId: slide.id,
          slideIndex: index,
          variantId: slide.variantId,
          kind: "brief-leak",
          blocking: true,
          message: `Slide ${index + 1}: internal brief wording is showing on the ${index === 0 ? "cover" : "closing slide"} — rewrite it for the client`,
        });
      }
    }
  }
  deck.slides.forEach((slide, index) => {
    const found = lintContent(slide.content);
    for (const kind of ["banned-word", "needs-source"] as const) {
      const hits = [...new Set(found.filter((f) => f.kind === kind).map((f) => f.match))];
      if (!hits.length) continue;
      out.push({
        slideId: slide.id,
        slideIndex: index,
        variantId: slide.variantId,
        kind,
        blocking: true,
        message:
          kind === "banned-word"
            ? `Slide ${index + 1}: banned word${hits.length > 1 ? "s" : ""} — reword before export`
            : `Slide ${index + 1}: figure${hits.length > 1 ? "s" : ""} with no source — add a source or remove`,
        detail: hits.join(", "),
      });
    }
  });
  return out;
}
