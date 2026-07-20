// Export preflight — cheap, grounded checks that predict whether a PPTX
// export will lose fidelity. The main risk we catch: pasted custom image
// URLs (content.mediaUrl) whose host lacks CORS headers, which the PPTX
// exporter can't fetch → image silently dropped from the deck.
//
// The check mirrors `fetchAsDataUrl` in src/lib/pptx-export.ts exactly:
// same `mode: "cors"` fetch, same failure mode. If our probe fails, the
// exporter's fetch will fail too.

import type { Deck, DeckSlide } from "./deck-store";
import { variantSupportsImagery } from "./variant-media";

export type PreflightIssue = {
  slideId: string;
  slideIndex: number;
  variantId: string;
  kind: "cors-image" | "empty-title";
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
    const res = await fetch(url, { mode: "cors", credentials: "omit", signal });
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
  return issues;
}
