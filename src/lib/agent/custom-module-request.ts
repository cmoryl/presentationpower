// Agent-side bridge to the custom-module author.
//
// The presentation agent already has the native module library (list_variants /
// list_section_variants). This closes the same gap the import path closes: when
// a user asks for a slide whose shape no native module can hold, the agent can
// author a NEW module for it — a blank base variant plus free-canvas blocks in
// the approved look — instead of forcing the content into the nearest layout and
// stranding lines in the speaker notes.
//
// Pure + deterministic: every string comes from the request. Nothing invented.

import { proposeCustomModule, type CustomModuleProposal } from "@/lib/reinterpret-custom-module";
import type { MappedSlide } from "@/lib/pptx-mapping";

export type CustomModuleRequest = {
  title: string;
  lines?: string[];
  /** Stat pairs are flattened into copy lines ("48% — faster review"). */
  stats?: { value: string; label?: string }[];
  imageUrls?: string[];
  notes?: string;
  sectionId?: string | null;
  divisionId?: string;
};

/** Flatten the agent's request into the source-slide shape the author expects. */
export function authorCustomModuleFromRequest(req: CustomModuleRequest): CustomModuleProposal {
  const lines = [
    ...(req.stats ?? []).map((s) =>
      [s.value, s.label]
        .filter((p) => (p ?? "").trim())
        .join(" — ")
        .trim(),
    ),
    ...(req.lines ?? []),
  ]
    .map((l) => (l ?? "").trim())
    .filter(Boolean);

  const synthetic = {
    index: 0,
    sectionId: req.sectionId ?? null,
    variantId: "",
    layoutId: "LF-01",
    content: {},
    source: {
      index: 0,
      title: req.title,
      bullets: lines,
      notes: req.notes ?? "",
      images: (req.imageUrls ?? []).filter(Boolean),
      charts: [],
      tables: [],
      diagrams: [],
    },
  } as unknown as MappedSlide;

  const proposal = proposeCustomModule(synthetic, {
    ...(req.divisionId ? { divisionId: req.divisionId } : {}),
  });
  return {
    ...proposal,
    description:
      `Authored for a requested slide no native module could hold. ${proposal.description.split("— ").slice(1).join("— ")}`.trim(),
    tags: proposal.tags.map((t) => (t === "import-gap" ? "agent-authored" : t)),
    rationale: proposal.rationale.replace("AI-authored custom module", "Authored a new module"),
  };
}
