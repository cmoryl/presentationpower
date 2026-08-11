// ─── Bento preview presets ──────────────────────────────────────────────────
// MV-BENTO-6/7/8 accept any mix of cell kinds, so the same module can read as
// a metrics wall, a capability sweep, or an image-led story. These presets are
// PREVIEW-ONLY arrangements: they seed the library card / public wall with a
// concrete, common content mix so a reviewer can judge each arrangement before
// exporting, without editing a deck first.

export type BentoCellKind = "feature" | "stat" | "body" | "media";

export type BentoCell = {
  kind: BentoCellKind;
  icon?: string;
  title?: string;
  body?: string;
  value?: string;
  unit?: string;
  label?: string;
  mediaSeed?: string;
};

export type BentoPreset = {
  /** Stable key — used for card keys, search and deep links. */
  key: string;
  variantId: "MV-BENTO-6" | "MV-BENTO-7" | "MV-BENTO-8";
  label: string;
  description: string;
  /** Cell count must equal the variant's fixed capacity. */
  build: (clientName: string) => { title: string; items: BentoCell[] };
};

const feature = (title: string, body: string, icon = "Layers3"): BentoCell => ({
  kind: "feature",
  icon,
  title,
  body,
});
const stat = (value: string, unit: string, label: string, icon: string): BentoCell => ({
  kind: "stat",
  icon,
  value,
  unit,
  label,
});
const body = (title: string, text: string, icon: string): BentoCell => ({
  kind: "body",
  icon,
  title,
  body: text,
});
const media = (title: string, seed: string): BentoCell => ({
  kind: "media",
  title,
  mediaSeed: seed,
});

export const BENTO_PRESETS: BentoPreset[] = [
  // ── 6 cell ───────────────────────────────────────────────────────────────
  {
    key: "bento6-balanced",
    variantId: "MV-BENTO-6",
    label: "Balanced story",
    description: "Anchor feature, two proof stats, two capability cells and one image",
    build: (c) => ({
      title: `Why ${c} chooses TransPerfect`,
      items: [
        feature(
          "One operating model",
          `A single global program spanning every ${c} market, content type, and channel — with local precision built in.`,
        ),
        stat("62", "%", "Faster launch cycles", "Timer"),
        body("Human + AI", "Reviewer network paired with adaptive MT — quality that survives audit.", "Cpu"),
        media("In-market presence", `${c}-bento-balanced`),
        body("Governance-ready", "Terminology, brand voice and regulatory guardrails codified per market.", "ShieldCheck"),
        stat("170", "+", "Languages in scope", "Globe2"),
      ],
    }),
  },
  {
    key: "bento6-metrics",
    variantId: "MV-BENTO-6",
    label: "Metrics wall",
    description: "Numbers-forward: anchor claim plus four hard stats and one supporting note",
    build: (c) => ({
      title: `${c} — the program in numbers`,
      items: [
        feature("Measured every week", `Every ${c} workstream reports against the same scorecard — no vanity metrics.`, "Gauge"),
        stat("62", "%", "Faster launch cycles", "Timer"),
        stat("99.5", "%", "On-time delivery", "BadgeCheck"),
        stat("38", "%", "Lower cost per word", "PiggyBank"),
        stat("170", "+", "Languages in scope", "Globe2"),
        body("How we hold the line", "Quality gates at translation, review and publish — audited quarterly.", "ClipboardCheck"),
      ],
    }),
  },
  {
    key: "bento6-media",
    variantId: "MV-BENTO-6",
    label: "Image-led",
    description: "Two image cells carry the page, with one anchor claim and three short proofs",
    build: (c) => ({
      title: `${c} in market`,
      items: [
        feature("Local presence, global system", `Regional teams execute in-country while ${c} keeps one source of truth.`, "MapPin"),
        media("Retail activation", `${c}-bento-media-a`),
        stat("24", "h", "Turnaround on priority markets", "Timer"),
        media("Campaign localization", `${c}-bento-media-b`),
        body("Brand-safe by default", "Voice, terminology and legal review baked into every route.", "ShieldCheck"),
        stat("18", "", "Markets live", "Globe2"),
      ],
    }),
  },

  // ── 7 cell ───────────────────────────────────────────────────────────────
  {
    key: "bento7-capability",
    variantId: "MV-BENTO-7",
    label: "Capability sweep",
    description: "Anchor feature plus five capability cells and one image for texture",
    build: (c) => ({
      title: `The capability stack behind ${c}`,
      items: [
        feature("One connected platform", `GlobalLink orchestrates every ${c} request from intake to publish.`, "Layers3"),
        body("Connected workflow", `Plugged straight into the ${c} stack — no copy-paste hand-offs.`, "Workflow"),
        body("Human + AI", "Adaptive MT with reviewer-in-the-loop for regulated content.", "Cpu"),
        body("Governance-ready", "Terminology, brand voice and audit trails per market.", "ShieldCheck"),
        media("Delivery centres", `${c}-bento-capability`),
        body("Always-on analytics", "Live dashboards on cost, throughput and quality by market.", "BarChart3"),
        stat("99.5", "%", "On-time delivery", "BadgeCheck"),
      ],
    }),
  },
  {
    key: "bento7-proof",
    variantId: "MV-BENTO-7",
    label: "Proof grid",
    description: "Stat-dense arrangement: anchor claim, four stats, two short narrative cells",
    build: (c) => ({
      title: `Proof from the ${c} program`,
      items: [
        feature("Outcomes, not activity", `Each number below is drawn from live ${c}-comparable programs.`, "Target"),
        stat("62", "%", "Faster launch cycles", "Timer"),
        stat("170", "+", "Languages in scope", "Globe2"),
        stat("38", "%", "Lower cost per word", "PiggyBank"),
        stat("99.5", "%", "On-time delivery", "BadgeCheck"),
        body("Where the gains come from", "Reuse, automation and a single reviewer network across markets.", "Recycle"),
        body("What we watch", "Quality escapes, cycle time and cost per market — reviewed monthly.", "ClipboardCheck"),
      ],
    }),
  },

  // ── 8 cell ───────────────────────────────────────────────────────────────
  {
    key: "bento8-overview",
    variantId: "MV-BENTO-8",
    label: "Full overview",
    description: "Widest sweep: anchor feature, three stats, three capability cells and one image",
    build: (c) => ({
      title: `The ${c} program at a glance`,
      items: [
        feature("One operating model", `A single global program across every ${c} market, content type and channel.`, "Layers3"),
        stat("62", "%", "Faster launch cycles", "Timer"),
        body("Human + AI", "Reviewer network paired with adaptive MT.", "Cpu"),
        media("In-market presence", `${c}-bento-overview`),
        body("Governance-ready", "Terminology and regulatory guardrails per market.", "ShieldCheck"),
        stat("170", "+", "Languages in scope", "Globe2"),
        body("Connected workflow", `Plugged into the ${c} stack — no hand-offs.`, "Workflow"),
        stat("99.5", "%", "On-time delivery", "BadgeCheck"),
      ],
    }),
  },
  {
    key: "bento8-metrics",
    variantId: "MV-BENTO-8",
    label: "Metrics wall",
    description: "Six stats around an anchor claim, closed by one summary note",
    build: (c) => ({
      title: `${c} — measured performance`,
      items: [
        feature("One scorecard, every market", `Reported to ${c} monthly, with the same definitions worldwide.`, "Gauge"),
        stat("62", "%", "Faster launch cycles", "Timer"),
        stat("170", "+", "Languages in scope", "Globe2"),
        stat("99.5", "%", "On-time delivery", "BadgeCheck"),
        stat("38", "%", "Lower cost per word", "PiggyBank"),
        stat("24", "h", "Priority turnaround", "Clock"),
        stat("4.8", "/5", "Reviewer satisfaction", "Star"),
        body("How we hold the line", "Quality gates at translation, review and publish — audited quarterly.", "ClipboardCheck"),
      ],
    }),
  },
  {
    key: "bento8-editorial",
    variantId: "MV-BENTO-8",
    label: "Editorial mix",
    description: "Narrative-heavy: anchor feature, two images and four short story cells",
    build: (c) => ({
      title: `How the ${c} program runs`,
      items: [
        feature("From intake to publish", `Every ${c} request follows one route, with owners named at each step.`, "Route"),
        media("Intake and briefing", `${c}-bento-editorial-a`),
        body("Translate", "Adaptive MT with market-specific glossaries.", "Languages"),
        body("Review", "In-country reviewers with SLA-backed turnaround.", "UserCheck"),
        media("Publish and measure", `${c}-bento-editorial-b`),
        body("Publish", "Straight into your CMS, commerce and support stacks.", "Send"),
        body("Measure", "Live cost, quality and cycle-time reporting by market.", "BarChart3"),
        stat("99.5", "%", "On-time delivery", "BadgeCheck"),
      ],
    }),
  },
];

export function bentoPresetsFor(variantId: string): BentoPreset[] {
  return BENTO_PRESETS.filter((p) => p.variantId === variantId);
}

export function bentoPresetByKey(key: string): BentoPreset | undefined {
  return BENTO_PRESETS.find((p) => p.key === key);
}

/** Preview content for a preset, merged over the module's seeded content so
 *  locked fields (footer, logo) survive. */
export function applyBentoPreset(
  preset: BentoPreset,
  seeded: Record<string, unknown>,
  clientName: string,
): Record<string, unknown> {
  const built = preset.build(clientName);
  return { ...seeded, title: built.title, items: built.items };
}
