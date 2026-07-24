// Event & campaign types + the scaffolded pipeline that turns any source
// artifact (slide variant, print asset, module, or manual copy) into
// per-format CampaignAsset records. This pass is placeholder-only — no
// persistence, no AI. The signature is the contract we'll wire real
// adaptation into later.

import type { SocialFormat } from "./social-formats";
import { getFormat } from "./social-formats";

export type EventSpeaker = { name: string; role?: string };
export type EventSponsor = { name: string; tier?: "title" | "gold" | "silver" | "supporter" };

export type EventFacts = {
  name: string;
  /** Maps to a BrandMode.id in taxonomy.ts (e.g. "bm-tp-media"). */
  subBrand: string;
  city?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  registrationUrl?: string;
  hashtag?: string;
  speakers: EventSpeaker[];
  sponsors: EventSponsor[];
  tone?: "confident" | "curious" | "authoritative" | "warm";
};

export type CampaignSource =
  | { kind: "slide"; variantId: string; title?: string; summary?: string; stat?: { value: string; label: string } }
  | { kind: "print-asset"; assetId: string; title?: string; summary?: string }
  | { kind: "module"; moduleId: string; title?: string; summary?: string }
  | { kind: "manual"; copy: { title: string; summary?: string; cta?: string } };

export type CampaignCopy = {
  eyebrow?: string;
  title: string;
  summary?: string;
  cta?: string;
  stat?: { value: string; label: string };
};

export type CampaignAsset = {
  id: string;
  formatId: string;
  format: SocialFormat;
  brandId: string;
  mode: "light" | "dark";
  copy: CampaignCopy;
  /** For the pipeline stub — where the copy came from + what still needs work. */
  provenance: {
    sourceKind: CampaignSource["kind"];
    /** TODO markers for the future AI adaptation slot. */
    todos: string[];
  };
};

// ────────────────────────────────────────────────────────────────────────────
// Extraction — turn a CampaignSource into a base CampaignCopy without any
// per-format tailoring. This is the deterministic fallback path; the AI
// adapter will read this + EventFacts + the target SocialFormat and return
// a per-format CampaignCopy.
// ────────────────────────────────────────────────────────────────────────────
function extractBaseCopy(source: CampaignSource, event: EventFacts): CampaignCopy {
  const dateLabel = event.startDate
    ? new Date(event.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : undefined;
  const eyebrow = [event.name, event.city].filter(Boolean).join(" · ") || event.name;

  switch (source.kind) {
    case "slide":
      return {
        eyebrow,
        title: source.title ?? "Untitled slide",
        summary: source.summary,
        stat: source.stat,
        cta: dateLabel ? `Join us · ${dateLabel}` : "Learn more",
      };
    case "print-asset":
      return {
        eyebrow,
        title: source.title ?? "Featured story",
        summary: source.summary,
        cta: event.registrationUrl ? "Register" : "Read the story",
      };
    case "module":
      return {
        eyebrow,
        title: source.title ?? "Module preview",
        summary: source.summary,
        cta: "Explore",
      };
    case "manual":
      return {
        eyebrow,
        title: source.copy.title,
        summary: source.copy.summary,
        cta: source.copy.cta ?? (event.registrationUrl ? "Register" : "Learn more"),
      };
  }
}

// TODO(ai): swap this deterministic mapper for a Lovable AI Gateway call
// that reshapes headline length, tone, and CTA per SocialFormat + EventFacts.
// Contract: same input → same CampaignCopy shape. The renderer stays stable.
function adaptCopyForFormat(base: CampaignCopy, format: SocialFormat): CampaignCopy {
  // Minimal placeholder logic: strip summary on extreme landscape (1600×900,
  // 1200×628) where there's no room, keep eyebrow on portrait/story where
  // the platform chrome eats the top edge.
  if (format.aspect >= 2.0) {
    return { ...base, summary: undefined };
  }
  return base;
}

export type BuildOptions = {
  formatIds: string[];
  mode?: "light" | "dark" | "both";
  brandId?: string; // override event.subBrand for co-branded runs
};

/** Pipeline stub — proves the shape: source → per-format copy → assets. */
export function buildCampaignAssets(
  source: CampaignSource,
  event: EventFacts,
  options: BuildOptions,
): CampaignAsset[] {
  const base = extractBaseCopy(source, event);
  const modes: Array<"light" | "dark"> =
    options.mode === "both" ? ["light", "dark"] : [options.mode ?? "dark"];
  const brandId = options.brandId ?? event.subBrand;

  const out: CampaignAsset[] = [];
  for (const fid of options.formatIds) {
    const format = getFormat(fid);
    if (!format) continue;
    const copy = adaptCopyForFormat(base, format);
    for (const mode of modes) {
      out.push({
        id: `${source.kind}:${fid}:${mode}:${brandId}`,
        formatId: fid,
        format,
        brandId,
        mode,
        copy,
        provenance: {
          sourceKind: source.kind,
          todos: [
            "TODO(ai): rewrite title for platform + character budget",
            "TODO(ai): tone-shift summary per EventFacts.tone",
            "TODO(ai): choose CTA verb per registration state",
          ],
        },
      });
    }
  }
  return out;
}
