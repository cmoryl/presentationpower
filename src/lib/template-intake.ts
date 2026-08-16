/**
 * ALTERNATE-LOOK INTAKE — the guided path from "here are our brand files" to a
 * published template, with an admin sign-off at every gate.
 *
 * The Template Studio's Build tab asks an author to hand-pick five palette
 * stops, a type character, a surface note. That is fine for someone fluent in
 * the system. Everyone else arrives with a folder: a logo, a palette sheet, a
 * cover photograph, maybe a reference deck. This module turns that folder into
 * a template.
 *
 * Three pure pieces, deliberately free of React, Supabase and the DOM so both
 * the wizard and the test suite drive the exact same logic:
 *
 *   1. SLOTS      — the preset list of what must be uploaded (INTAKE_SLOTS),
 *                   with the formats, size caps and the derivation each asset
 *                   feeds. The wizard renders this; it is never hand-written.
 *   2. CHECKLIST  — evaluateChecklist(): per-slot pass/fail over the uploads,
 *                   so "what's missing" is one function, not UI guesswork.
 *   3. GATES      — an explicit stage machine (assets → derive → review →
 *                   tests → published) where every hop needs a recorded admin
 *                   approval. canAdvance() lists blockers; no stage can be
 *                   skipped and no approval can be inferred.
 *
 * deriveTemplateFromIntake() is the "system creates the look" step: swatches
 * sampled from the uploads are ordered into the five-stop palette the pack
 * pipeline expects, contrast-corrected, and married to a base catalog code for
 * geometry. The result is an ordinary CustomTemplate, so every existing
 * surface — previews, decks, PPTX export — renders it with no new code path.
 */

import type { CustomTemplate } from "./custom-templates";

// -----------------------------------------------------------------------------
// Colour helpers (self-contained: this module stays dependency-light)
// -----------------------------------------------------------------------------

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const HEX6 = /^#?([0-9a-f]{6})$/i;
const HEX3 = /^#?([0-9a-f]{3})$/i;

/** Normalize any accepted hex form to `#rrggbb`, or null when unparseable. */
export function normalizeHex(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  const m6 = HEX6.exec(raw);
  if (m6) return `#${m6[1]!.toLowerCase()}`;
  const m3 = HEX3.exec(raw);
  if (m3) {
    const h = m3[1]!.toLowerCase();
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return null;
}

export function hexToRgb(hex: string): RGB | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b);
}

/** WCAG contrast ratio, 1 – 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Perceived colourfulness, 0 (grey) – 1 (fully saturated). */
export function saturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max === 0 ? 0 : (max - min) / max;
}

function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex({
    r: ra.r + (rb.r - ra.r) * k,
    g: ra.g + (rb.g - ra.g) * k,
    b: ra.b + (rb.b - ra.b) * k,
  });
}

/**
 * Push `ink` away from `field` until it clears `target` contrast, staying on
 * the brand hue as long as possible before bottoming out at black/white.
 */
export function forceContrast(ink: string, field: string, target = 4.5): string {
  if (contrast(ink, field) >= target) return ink;
  const toward = luminance(field) > 0.45 ? "#000000" : "#ffffff";
  let best = ink;
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    best = mix(ink, toward, t);
    if (contrast(best, field) >= target) return best;
  }
  return toward;
}

// -----------------------------------------------------------------------------
// 1. SLOTS — the preset upload list
// -----------------------------------------------------------------------------

export type IntakeSlotId =
  | "logo-primary"
  | "logo-reverse"
  | "palette-source"
  | "cover-image"
  | "texture-plate"
  | "type-spec"
  | "icon-set"
  | "reference-deck";

export interface IntakeSlot {
  id: IntakeSlotId;
  label: string;
  /** Required slots block the assets gate. */
  required: boolean;
  /** Lowercase extensions, without the dot. */
  formats: string[];
  maxBytes: number;
  /** One line the wizard shows: what this file is. */
  purpose: string;
  /** What the system does with it — the derivation it feeds. */
  feeds: string;
  /** Practical guidance for whoever is collecting the files. */
  hint: string;
  /** Slots the palette is sampled from. */
  sampled?: boolean;
}

const MB = 1024 * 1024;

export const INTAKE_SLOTS: IntakeSlot[] = [
  {
    id: "logo-primary",
    label: "Primary logo",
    required: true,
    formats: ["svg", "png"],
    maxBytes: 5 * MB,
    purpose: "The wordmark or lockup as it appears on a light field.",
    feeds: "Accent colour candidates, and the logo that rides every slide.",
    hint: "Vector (SVG) preferred. Transparent background, no keyline, no drop shadow.",
    sampled: true,
  },
  {
    id: "logo-reverse",
    label: "Reverse logo",
    required: false,
    formats: ["svg", "png"],
    maxBytes: 5 * MB,
    purpose: "The knockout / one-colour version for dark grounds.",
    feeds: "The dark-mode variant of the look.",
    hint: "Only needed when the primary logo is unreadable on a dark field.",
  },
  {
    id: "palette-source",
    label: "Palette sheet",
    required: true,
    formats: ["png", "jpg", "jpeg", "svg", "json", "txt"],
    maxBytes: 8 * MB,
    purpose: "Swatch sheet, brand-guide page or a list of hex values.",
    feeds: "The five palette stops: page field, ink, accent, accent alt, support.",
    hint: "A screenshot of the palette page works. JSON/TXT may be a plain list of hex codes.",
    sampled: true,
  },
  {
    id: "cover-image",
    label: "Cover imagery",
    required: true,
    formats: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 20 * MB,
    purpose: "The hero photograph or artwork that opens a deck.",
    feeds: "Imagery character, and the cover plate of every preview.",
    hint: "Landscape, at least 1920px wide. The real thing, not a placeholder.",
    sampled: true,
  },
  {
    id: "texture-plate",
    label: "Background plate",
    required: true,
    formats: ["jpg", "jpeg", "png", "webp", "svg"],
    maxBytes: 20 * MB,
    purpose: "The abstract ground, texture or material the look sits on.",
    feeds: "The section backdrop override for every scene of the template.",
    hint: "Quiet and abstract — content is read on top of this. No text in the plate.",
    sampled: true,
  },
  {
    id: "type-spec",
    label: "Typography spec",
    required: false,
    formats: ["pdf", "txt", "md", "png", "jpg", "jpeg"],
    maxBytes: 12 * MB,
    purpose: "The page of the guide that names the typefaces and weights.",
    feeds: "The type character note on the template.",
    hint: "Optional — without it the look inherits the base template's type scale.",
  },
  {
    id: "icon-set",
    label: "Icon set",
    required: false,
    formats: ["svg", "zip"],
    maxBytes: 12 * MB,
    purpose: "The brand's own icon family.",
    feeds: "Icon styling on process and stat modules.",
    hint: "Optional. Single-weight outline sets read best across the modules.",
  },
  {
    id: "reference-deck",
    label: "Reference deck",
    required: false,
    formats: ["pptx", "pdf", "key"],
    maxBytes: 60 * MB,
    purpose: "An existing deck in the look, for the reviewer to compare against.",
    feeds: "Nothing automatic — it is the visual acceptance reference.",
    hint: "Optional but strongly recommended: it is what the review gate is judged against.",
  },
];

export function slotById(id: string): IntakeSlot | null {
  return INTAKE_SLOTS.find((s) => s.id === id) ?? null;
}

export const REQUIRED_SLOT_IDS: IntakeSlotId[] = INTAKE_SLOTS.filter((s) => s.required).map(
  (s) => s.id,
);

export function extensionOf(filename: string): string {
  const base = filename.split(/[?#]/)[0] ?? "";
  const dot = base.lastIndexOf(".");
  return dot < 0 ? "" : base.slice(dot + 1).toLowerCase();
}

// -----------------------------------------------------------------------------
// The intake record
// -----------------------------------------------------------------------------

export interface IntakeAsset {
  slot: IntakeSlotId;
  filename: string;
  contentType: string;
  bytes: number;
  /** Storage path in the intake bucket. */
  path: string;
  /** Hex swatches sampled from this asset in the browser, most-used first. */
  swatches?: string[];
  width?: number | null;
  height?: number | null
  uploadedAt?: string;
  uploadedBy?: string;
}

export type IntakeStage = "assets" | "derive" | "review" | "tests" | "published";

export const STAGE_ORDER: IntakeStage[] = ["assets", "derive", "review", "tests", "published"];

export interface StageSpec {
  id: IntakeStage;
  label: string;
  /** What an approver is actually signing off on at this gate. */
  gate: string;
}

export const STAGES: StageSpec[] = [
  {
    id: "assets",
    label: "Collect assets",
    gate: "Every required file is present, in an accepted format, inside its size cap.",
  },
  {
    id: "derive",
    label: "Generate the look",
    gate: "The palette, mode and base geometry the system derived are correct.",
  },
  {
    id: "review",
    label: "Visual review",
    gate: "Rendered previews match the reference deck and the brand's intent.",
  },
  {
    id: "tests",
    label: "Readiness suite",
    gate: "Contrast, integrity and background checks pass.",
  },
  { id: "published", label: "Published", gate: "Live in the catalog for every builder." },
];

export interface IntakeApproval {
  stage: IntakeStage;
  by: string;
  byName?: string;
  at: string;
  note?: string;
}

export interface TemplateIntake {
  id: string;
  code: string;
  name: string;
  /** Free-text brief: who it's for, where it will be used. */
  brief: string;
  /** Catalog code the geometry is inherited from, e.g. "S02". */
  baseSkinCode: string;
  /** Author's mode intent; "auto" lets the palette decide. */
  modeIntent: "auto" | "light" | "dark";
  stage: IntakeStage;
  assets: IntakeAsset[];
  approvals: IntakeApproval[];
  /** Set once the intake has produced a real template row. */
  templateId: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function blankIntake(): TemplateIntake {
  return {
    id: "",
    code: "",
    name: "",
    brief: "",
    baseSkinCode: "S01",
    modeIntent: "auto",
    stage: "assets",
    assets: [],
    approvals: [],
    templateId: null,
  };
}

export function assetFor(intake: TemplateIntake, slot: IntakeSlotId): IntakeAsset | null {
  return intake.assets.find((a) => a.slot === slot) ?? null;
}

export function approvalFor(intake: TemplateIntake, stage: IntakeStage): IntakeApproval | null {
  // Latest approval wins, so a re-approval after a change is the one shown.
  const all = intake.approvals.filter((a) => a.stage === stage);
  return all.length ? all[all.length - 1]! : null;
}

// -----------------------------------------------------------------------------
// 2. CHECKLIST
// -----------------------------------------------------------------------------

export interface ChecklistRow {
  slot: IntakeSlot;
  asset: IntakeAsset | null;
  ok: boolean;
  /** Empty when ok. Human sentences, shown verbatim in the wizard. */
  problems: string[];
}

export function evaluateChecklist(intake: TemplateIntake): ChecklistRow[] {
  return INTAKE_SLOTS.map((slot) => {
    const asset = assetFor(intake, slot.id);
    const problems: string[] = [];
    if (!asset) {
      if (slot.required) problems.push("Required file has not been uploaded yet.");
      return { slot, asset: null, ok: problems.length === 0, problems };
    }
    const ext = extensionOf(asset.filename);
    if (!slot.formats.includes(ext)) {
      problems.push(
        `${ext ? `.${ext}` : "That file type"} is not accepted here — use ${slot.formats
          .map((f) => `.${f}`)
          .join(", ")}.`,
      );
    }
    if (asset.bytes <= 0) problems.push("The uploaded file is empty.");
    if (asset.bytes > slot.maxBytes) {
      problems.push(
        `${(asset.bytes / MB).toFixed(1)} MB is over the ${Math.round(
          slot.maxBytes / MB,
        )} MB cap for this slot.`,
      );
    }
    if (slot.id === "cover-image" && asset.width && asset.width < 1200) {
      problems.push(`Cover imagery is only ${asset.width}px wide — 1920px or more reads cleanly.`);
    }
    if (slot.sampled && slot.id === "palette-source" && !(asset.swatches?.length)) {
      problems.push("No colours could be read from this file — upload a swatch sheet or hex list.");
    }
    return { slot, asset, ok: problems.length === 0, problems };
  });
}

export interface ChecklistSummary {
  requiredTotal: number;
  requiredDone: number;
  optionalDone: number;
  problems: string[];
  complete: boolean;
}

export function checklistSummary(intake: TemplateIntake): ChecklistSummary {
  const rows = evaluateChecklist(intake);
  const required = rows.filter((r) => r.slot.required);
  const requiredDone = required.filter((r) => r.asset && r.ok).length;
  const problems = rows.flatMap((r) => r.problems.map((p) => `${r.slot.label}: ${p}`));
  return {
    requiredTotal: required.length,
    requiredDone,
    optionalDone: rows.filter((r) => !r.slot.required && r.asset && r.ok).length,
    problems,
    complete: requiredDone === required.length && problems.length === 0,
  };
}

// -----------------------------------------------------------------------------
// 3. THE LOOK the system derives
// -----------------------------------------------------------------------------

/** Every swatch the uploads yielded, de-duplicated, sampled slots first. */
export function collectSwatches(intake: TemplateIntake): string[] {
  const order: IntakeSlotId[] = ["palette-source", "logo-primary", "cover-image", "texture-plate"];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slot of order) {
    for (const raw of assetFor(intake, slot)?.swatches ?? []) {
      const hex = normalizeHex(raw);
      if (!hex || seen.has(hex)) continue;
      seen.add(hex);
      out.push(hex);
    }
  }
  return out;
}

export interface DerivedPalette {
  /** field, ink, accent, accent alt, support — the five stops packs expect. */
  palette: string[];
  mode: "light" | "dark";
  /** Human explanation per stop, shown at the derive gate for approval. */
  rationale: string[];
  /** True when a stop had to be manufactured because sampling came up short. */
  filled: boolean;
}

const LIGHT_FALLBACK = ["#f7f7f5", "#111214", "#003fc7", "#a1fbf9", "#e0e8f5"];
const DARK_FALLBACK = ["#0b1020", "#f4f6fb", "#a1fbf9", "#c2a3ff", "#1b2440"];

/**
 * Order the sampled colours into the five-stop palette.
 *
 * The rules are deliberately boring and explainable, because an approver has to
 * agree with them at the derive gate: the page field is the least colourful
 * extreme, ink is the opposite extreme, and the accents are the two most
 * colourful swatches that survive a contrast check against the field.
 */
export function derivePalette(
  intake: TemplateIntake,
  swatchesIn?: string[],
): DerivedPalette {
  const swatches = (swatchesIn ?? collectSwatches(intake))
    .map((s) => normalizeHex(s))
    .filter((s): s is string => Boolean(s));

  const wantDark =
    intake.modeIntent === "dark" ||
    (intake.modeIntent === "auto" &&
      swatches.length > 0 &&
      swatches.filter((s) => luminance(s) < 0.18).length >
        swatches.filter((s) => luminance(s) > 0.7).length);

  const fallback = wantDark ? DARK_FALLBACK : LIGHT_FALLBACK;
  if (swatches.length < 2) {
    return {
      palette: [...fallback],
      mode: wantDark ? "dark" : "light",
      rationale: [
        "Not enough colour could be read from the uploads, so the house palette stands in. Re-upload a palette sheet to derive a real one.",
      ],
      filled: true,
    };
  }

  const neutrals = [...swatches].sort((a, b) => saturation(a) - saturation(b));
  const byLum = [...swatches].sort((a, b) => luminance(a) - luminance(b));

  // Field: the neutral extreme on the correct side of the light/dark split.
  const fieldPool = neutrals.filter((s) =>
    wantDark ? luminance(s) < 0.3 : luminance(s) > 0.6,
  );
  const field = fieldPool[0] ?? (wantDark ? byLum[0]! : byLum[byLum.length - 1]!);

  // Ink: the far luminance extreme, contrast-forced to stay legible.
  const inkRaw = wantDark ? byLum[byLum.length - 1]! : byLum[0]!;
  const ink = forceContrast(inkRaw, field, 7);

  // Accents: most colourful first, each legible against the field.
  const chroma = [...swatches]
    .filter((s) => s !== field && s !== inkRaw)
    .sort((a, b) => saturation(b) - saturation(a));
  const accent = forceContrast(chroma[0] ?? fallback[2]!, field, 3);
  const accentAlt = forceContrast(
    chroma.find((s) => s !== chroma[0]) ?? fallback[3]!,
    field,
    2.2,
  );

  // Support: a quiet plane between field and ink for cards and rules.
  const support = mix(field, ink, wantDark ? 0.18 : 0.1);

  const filled = chroma.length < 2;
  return {
    palette: [field, ink, accent, accentAlt, support],
    mode: wantDark ? "dark" : "light",
    rationale: [
      `Page field ${field} — least colourful ${wantDark ? "dark" : "light"} swatch in the uploads.`,
      `Ink ${ink} — opposite luminance extreme, raised to ${contrast(ink, field).toFixed(1)}:1 against the field.`,
      `Accent ${accent} — most colourful swatch, held at ${contrast(accent, field).toFixed(1)}:1.`,
      `Accent alt ${accentAlt} — next most colourful swatch, for 10% moments.`,
      `Support ${support} — field mixed toward ink for cards, rules and plates.`,
    ],
    filled,
  };
}

/** Density follows how busy the sampled palette is. */
function deriveDensity(swatchCount: number): string {
  if (swatchCount >= 7) return "High";
  if (swatchCount <= 3) return "Low";
  return "Medium";
}

export interface DerivedLook {
  template: CustomTemplate;
  palette: DerivedPalette;
  /** Plain-language account of what was derived from what, for the gate. */
  notes: string[];
  /** The background override the plate upload implies, "*" = every scene. */
  backgroundImageUrl: string | null;
}

/**
 * Turn an intake into a draft CustomTemplate. Pure: the caller supplies any
 * resolved asset URL, so this runs identically in tests and in the browser.
 */
export function deriveTemplateFromIntake(
  intake: TemplateIntake,
  opts: { plateUrl?: string | null; swatches?: string[] } = {},
): DerivedLook {
  const swatches = opts.swatches ?? collectSwatches(intake);
  const palette = derivePalette(intake, swatches);
  const cover = assetFor(intake, "cover-image");
  const plate = assetFor(intake, "texture-plate");
  const typeSpec = assetFor(intake, "type-spec");
  const icons = assetFor(intake, "icon-set");

  const notes: string[] = [...palette.rationale];
  notes.push(
    `Geometry, motif family and layout traits inherited from base template ${intake.baseSkinCode.toUpperCase()}.`,
  );
  if (cover) notes.push(`Imagery character read from ${cover.filename}.`);
  if (plate) notes.push(`Section backdrop overridden with ${plate.filename} for every scene.`);
  if (typeSpec) notes.push(`Typography spec on file: ${typeSpec.filename}.`);
  if (icons) notes.push(`Brand icon set on file: ${icons.filename}.`);

  const template: CustomTemplate = {
    id: intake.templateId ?? "",
    code: intake.code.toUpperCase(),
    name: intake.name || `Alternate look ${intake.code.toUpperCase()}`,
    reference: "Derived from brand intake",
    description: intake.brief.slice(0, 400),
    bestFit: intake.brief.slice(0, 200),
    mode: palette.mode,
    palette: palette.palette,
    typography: typeSpec
      ? "Brand typography per supplied spec"
      : "Large scale · restrained weight",
    surfaceNote: plate
      ? "Supplied plate ground · one lifted plane"
      : "Flat canvas · one lifted plane",
    imagery: cover ? "Supplied brand imagery · natural crop" : "Monumental crop · natural shadow",
    density: deriveDensity(swatches.length),
    baseSkinCode: intake.baseSkinCode.toUpperCase(),
    spec: `Intake ${intake.code.toUpperCase()} · ${intake.assets.length} assets on file`,
    status: "draft",
    notes: notes.join("\n"),
  };

  return { template, palette, notes, backgroundImageUrl: opts.plateUrl ?? null };
}

// -----------------------------------------------------------------------------
// 4. GATES — nothing advances without a recorded approval
// -----------------------------------------------------------------------------

export interface AdvanceCheck {
  ok: boolean;
  next: IntakeStage | null;
  blockers: string[];
}

export function stageIndex(stage: IntakeStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Can this intake leave its current stage?
 *
 * `testsPassing` comes from the readiness suite the studio already runs; it is
 * passed in rather than imported so this stays pure.
 */
export function canAdvance(
  intake: TemplateIntake,
  opts: { testsPassing?: boolean } = {},
): AdvanceCheck {
  const idx = stageIndex(intake.stage);
  const next = STAGE_ORDER[idx + 1] ?? null;
  const blockers: string[] = [];

  if (!next) return { ok: false, next: null, blockers: ["Already published."] };

  // Identity is required before anything can be generated or published.
  if (!/^[A-Za-z0-9-]{2,12}$/.test(intake.code)) {
    blockers.push("Give the look a code of 2–12 letters, numbers or dashes.");
  }
  if (intake.name.trim().length < 2) blockers.push("Give the look a name.");

  if (intake.stage === "assets") {
    const sum = checklistSummary(intake);
    if (!sum.complete) {
      blockers.push(
        `${sum.requiredDone} of ${sum.requiredTotal} required files are ready.`,
        ...sum.problems,
      );
    }
  }

  if (intake.stage === "derive") {
    const derived = deriveTemplateFromIntake(intake);
    if (derived.palette.filled) {
      blockers.push(
        "The palette fell back to house colours — the uploads did not yield enough distinct brand colour.",
      );
    }
    const [field, ink] = derived.palette.palette;
    if (contrast(ink!, field!) < 4.5) {
      blockers.push("Derived ink does not reach 4.5:1 on the page field.");
    }
  }

  if (intake.stage === "review" && !approvalFor(intake, "review")) {
    // Review is a human judgement: its own approval IS the gate.
    blockers.push("A reviewer must sign off on the rendered previews.");
  }

  if (intake.stage === "tests" && opts.testsPassing === false) {
    blockers.push("The readiness suite is still failing.");
  }

  // Every earlier gate must carry its approval — no stage can be skipped.
  for (const stage of STAGE_ORDER.slice(0, idx)) {
    if (!approvalFor(intake, stage)) {
      blockers.push(`Stage "${STAGES.find((s) => s.id === stage)!.label}" was never approved.`);
    }
  }

  return { ok: blockers.length === 0, next, blockers };
}

/**
 * Record an approval and move to the next stage. Returns the updated intake;
 * throws when the gate is not clear, so the UI and the server share one rule.
 */
export function approveStage(
  intake: TemplateIntake,
  approval: { by: string; byName?: string; note?: string; at?: string },
  opts: { testsPassing?: boolean } = {},
): TemplateIntake {
  const check = canAdvance(intake, opts);
  if (!check.next) throw new Error("This look is already published.");

  // The review gate is cleared by its own approval, so stamp it first and
  // re-check; every other gate must already be clear before we sign.
  const stamped: IntakeApproval = {
    stage: intake.stage,
    by: approval.by,
    byName: approval.byName,
    at: approval.at ?? new Date().toISOString(),
    note: approval.note,
  };
  const withApproval: TemplateIntake = {
    ...intake,
    approvals: [...intake.approvals, stamped],
  };
  const recheck = intake.stage === "review" ? canAdvance(withApproval, opts) : check;
  if (!recheck.ok) throw new Error(recheck.blockers[0] ?? "This stage is not ready yet.");

  return { ...withApproval, stage: recheck.next ?? intake.stage };
}

/** Send an intake back a stage, e.g. a reviewer rejects the generated look. */
export function requestChanges(
  intake: TemplateIntake,
  reason: string,
): TemplateIntake {
  const idx = stageIndex(intake.stage);
  const back = STAGE_ORDER[Math.max(0, idx - 1)]!;
  return {
    ...intake,
    stage: back,
    // Drop the approval for the stage we're reopening so it must be re-signed.
    approvals: intake.approvals.filter((a) => a.stage !== back),
    brief: reason.trim()
      ? `${intake.brief}\n\nChanges requested at ${STAGES.find((s) => s.id === STAGE_ORDER[idx]!)!.label}: ${reason.trim()}`
      : intake.brief,
  };
}

export function progressPercent(intake: TemplateIntake): number {
  return Math.round((stageIndex(intake.stage) / (STAGE_ORDER.length - 1)) * 100);
}
