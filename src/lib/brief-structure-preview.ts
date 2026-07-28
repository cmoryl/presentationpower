// Live structural preview for the brief command center.
//
// Mirrors the real assembly pipeline so Step 3 can show the *exact* structure
// each selected artifact will be generated with, before the brief is submitted:
//   • Deck  → the archetype's section recipe + the variant the assembler picks
//             (same ranking rules as assembleDeck in deck-store).
//   • Print → the actual seeded content objects (emptyCaseStudy / emptySpotlight
//             / emptyEBrochure / emptyAdaptorBrief) walked into a block outline.
//   • Event / Social → the playbook's deliverables and phase cadence.

import {
  byId,
  NARRATIVE_ARCHETYPES,
  SECTION_FRAMEWORKS,
  MODULE_VARIANTS,
  variantsForSection,
} from "./taxonomy";
import { BRAND_PROFILES, getSubCompanyProfile } from "./brand-profiles";
import {
  emptyCaseStudy,
  emptySpotlight,
  emptyEBrochure,
  emptyAdaptorBrief,
} from "./print-assets.types";
import { EVENT_PLAYBOOKS } from "./event-playbooks";
import { SOCIAL_PLAYBOOKS } from "./social-playbooks";

export type StructureBlock = {
  /** Ordinal label shown in the rail — slide number, page block, phase. */
  index: string;
  title: string;
  /** Which module / variant / format actually renders this block. */
  meta?: string;
  detail?: string;
};

export type StructurePreview = {
  id: string;
  label: string;
  /** e.g. "9 slides", "2-page PDF". */
  output: string;
  note?: string;
  blocks: StructureBlock[];
};

export type PreviewSeed = {
  prospect: string;
  industry: string;
  audience: string;
  meetingObjective: string;
  brandModeId: string;
  archetypeId: string;
  lengthTarget: number;
  brandName?: string;
};

// ---- Deck ------------------------------------------------------------------

export function previewDeck(seed: PreviewSeed): StructurePreview {
  const arch = byId(NARRATIVE_ARCHETYPES, seed.archetypeId) ?? NARRATIVE_ARCHETYPES[0];
  const recipe = (arch?.sectionRecipe ?? []).slice(0, Math.max(seed.lengthTarget, 4));
  const profile = BRAND_PROFILES[seed.brandModeId] ?? getSubCompanyProfile(seed.brandModeId, "");
  const restricted = new Set(profile?.contentScope?.restrictedFamilyIds ?? []);
  const preferred = new Set(profile?.contentScope?.preferredVariantIds ?? []);

  const blocks = recipe.map((sfId, i) => {
    const sf = byId(SECTION_FRAMEWORKS, sfId);
    const permitted = variantsForSection(sfId).filter((v) => !restricted.has(v.familyId));
    const pool = permitted.length > 0 ? permitted : variantsForSection(sfId);
    const options = [...pool].sort(
      (a, b) => (preferred.has(a.id) ? 0 : 1) - (preferred.has(b.id) ? 0 : 1),
    );
    const variant = options[0] ?? MODULE_VARIANTS[0];
    return {
      index: String(i + 1).padStart(2, "0"),
      title: sf?.name ?? sfId,
      meta: variant?.name ?? variant?.id,
      detail: sf?.purpose,
    } satisfies StructureBlock;
  });

  return {
    id: "presentation",
    label: "Presentation",
    output: `${blocks.length} slides`,
    note: `${arch?.name ?? "Deck"} archetype${seed.brandName ? ` · ${seed.brandName} styling` : ""}`,
    blocks,
  };
}

// ---- Print -----------------------------------------------------------------

type PrintKind = "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";

const PRINT_META: Record<PrintKind, { label: string; output: string }> = {
  "case-study": { label: "Case study", output: "2-page PDF" },
  spotlight: { label: "Spotlight", output: "1-page PDF" },
  ebrochure: { label: "eBrochure", output: "4–6 page PDF" },
  "adaptor-brief": { label: "Adaptor brief", output: "2-page PDF" },
};

function seededPrintContent(kind: PrintKind, seed: PreviewSeed): Record<string, unknown> {
  const title = `${seed.prospect || "New prospect"} · ${kind.replace("-", " ")}`;
  if (kind === "spotlight")
    return emptySpotlight({
      productName: seed.prospect || title,
      tagline: seed.audience,
      summary: seed.meetingObjective,
    }) as unknown as Record<string, unknown>;
  if (kind === "ebrochure")
    return emptyEBrochure({
      title,
      summary: seed.meetingObjective,
    }) as unknown as Record<string, unknown>;
  if (kind === "adaptor-brief")
    return emptyAdaptorBrief({
      title,
      summary: seed.meetingObjective,
    }) as unknown as Record<string, unknown>;
  return emptyCaseStudy({
    client: seed.prospect,
    industry: seed.industry,
    audience: seed.audience,
    summary: seed.meetingObjective,
  }) as unknown as Record<string, unknown>;
}

/** Human labels for the top-level content keys we surface as page blocks. */
const BLOCK_LABELS: Record<string, string> = {
  eyebrow: "Eyebrow",
  title: "Title lockup",
  productName: "Product lockup",
  client: "Client lockup",
  tagline: "Tagline",
  summary: "Summary / intro",
  challenge: "Challenge",
  solution: "Approach",
  result: "Outcome",
  sections: "Body sections",
  capabilities: "Capability cards",
  features: "Feature verbs",
  stats: "Stat band",
  quote: "Client quote",
  engagement: "Engagement snapshot",
  cta: "Call to action",
  modules: "Content modules",
  heroMedia: "Hero media",
  expert: "Expert lockup",
};

const SKIP_KEYS = new Set(["logoColor", "heroMedia", "expert"]);

export function previewPrint(kind: PrintKind, seed: PreviewSeed): StructurePreview {
  const content = seededPrintContent(kind, seed);
  const blocks: StructureBlock[] = [];
  let n = 0;
  for (const [key, value] of Object.entries(content)) {
    if (value == null || SKIP_KEYS.has(key)) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    n += 1;
    const label = BLOCK_LABELS[key] ?? key;
    if (Array.isArray(value)) {
      const items = value as Array<Record<string, unknown>>;
      blocks.push({
        index: String(n).padStart(2, "0"),
        title: label,
        meta: `${items.length} item${items.length === 1 ? "" : "s"}`,
        detail: items
          .map(
            (it) =>
              String(it.heading ?? it.label ?? it.verb ?? it.kind ?? it.value ?? "").trim(),
          )
          .filter(Boolean)
          .join(" · "),
      });
    } else if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      blocks.push({
        index: String(n).padStart(2, "0"),
        title: label,
        meta: String(obj.heading ?? obj.label ?? "").trim() || undefined,
        detail: String(obj.body ?? obj.text ?? "").trim(),
      });
    } else {
      blocks.push({
        index: String(n).padStart(2, "0"),
        title: label,
        detail: String(value),
      });
    }
  }
  const meta = PRINT_META[kind];
  return {
    id: `print:${kind}`,
    label: meta.label,
    output: meta.output,
    note: seed.brandName ? `${seed.brandName} styling · seeded from this brief` : undefined,
    blocks,
  };
}

// ---- Event / Social --------------------------------------------------------

export function previewEvent(playbookId: string | null): StructurePreview | null {
  const pb = EVENT_PLAYBOOKS.find((p) => p.id === playbookId) ?? EVENT_PLAYBOOKS[0];
  if (!pb) return null;
  const blocks: StructureBlock[] = pb.deliverables.map((d, i) => ({
    index: String(i + 1).padStart(2, "0"),
    title: d.label,
    meta: d.spec ?? d.category ?? d.surface,
    detail: d.detail,
  }));
  return {
    id: "event",
    label: "Event kit",
    output: `${blocks.length} deliverables`,
    note: `${pb.name} playbook · ${pb.phases.length} phases`,
    blocks,
  };
}

export function previewSocial(playbookId: string | null): StructurePreview | null {
  const pb = SOCIAL_PLAYBOOKS.find((p) => p.id === playbookId) ?? SOCIAL_PLAYBOOKS[0];
  if (!pb) return null;
  const blocks: StructureBlock[] = pb.deliverables.map((d, i) => ({
    index: String(i + 1).padStart(2, "0"),
    title: d.label,
    meta: d.spec ?? d.category ?? d.surface,
    detail: d.detail,
  }));
  return {
    id: "social",
    label: "Social kit",
    output: `${blocks.length} deliverables`,
    note: `${pb.name} playbook · ${pb.phases.length} phases`,
    blocks,
  };
}

export function buildStructurePreviews(args: {
  seed: PreviewSeed;
  presentation: boolean;
  printKinds: PrintKind[];
  event: { enabled: boolean; playbookId: string | null };
  social: { enabled: boolean; playbookId: string | null };
}): StructurePreview[] {
  const out: StructurePreview[] = [];
  if (args.presentation) out.push(previewDeck(args.seed));
  for (const k of args.printKinds) out.push(previewPrint(k, args.seed));
  if (args.event.enabled) {
    const p = previewEvent(args.event.playbookId);
    if (p) out.push(p);
  }
  if (args.social.enabled) {
    const p = previewSocial(args.social.playbookId);
    if (p) out.push(p);
  }
  return out;
}
