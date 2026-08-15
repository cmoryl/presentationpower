/**
 * IMPORTED VISUAL KNOWLEDGE MAP ("design DNA").
 *
 * Users can upload or paste their own design DNA — a JSON knowledge map exported
 * from another deck/brand system, or plain notes — and the agent then designs
 * against it instead of only the built-in skin catalog.
 *
 * Pure parsing + prompt shaping. Browser storage helpers are window-guarded so
 * this module is safe to import from the server route too.
 */

import { z } from "zod";

export interface DesignDnaSwatch {
  name: string;
  value: string;
}

export interface DesignDna {
  name: string;
  summary?: string;
  mode?: "light" | "dark";
  palette: DesignDnaSwatch[];
  fonts: { heading?: string; body?: string; notes?: string };
  geometry?: { card_shape?: string; corner_radius?: string; notes?: string };
  scenes: { scene: string; note: string }[];
  rules: string[];
  /** Verbatim source, capped, so the model can read anything we didn't map. */
  raw: string;
  source: "json" | "text";
  fileName?: string;
}

const MAX_RAW = 8000;
const HEX = /#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const hit = Object.keys(obj).find((o) => o.toLowerCase().replace(/[\s_-]/g, "") === k);
    if (hit !== undefined && obj[hit] !== undefined && obj[hit] !== null) return obj[hit];
  }
  return undefined;
}

function toSwatches(value: unknown): DesignDnaSwatch[] {
  const out: DesignDnaSwatch[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, i) => {
      if (typeof entry === "string") out.push({ name: `color ${i + 1}`, value: entry.trim() });
      else if (entry && typeof entry === "object") {
        const o = entry as Record<string, unknown>;
        const v = str(pick(o, "value", "hex", "color"));
        if (v) out.push({ name: str(pick(o, "name", "role", "label")) ?? `color ${i + 1}`, value: v });
      }
    });
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const hex = str(v);
      if (hex) out.push({ name: k, value: hex });
    }
  }
  return out.slice(0, 24);
}

function toRules(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => str(v) ?? "").filter(Boolean).slice(0, 40);
  const s = str(value);
  if (!s) return [];
  return s
    .split(/\n|(?:^|\s)[-•*]\s+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2)
    .slice(0, 40);
}

function toScenes(value: unknown): { scene: string; note: string }[] {
  const out: { scene: string; note: string }[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const o = entry as Record<string, unknown>;
      const scene = str(pick(o, "scene", "section", "slide", "name"));
      if (scene) out.push({ scene, note: str(pick(o, "note", "description", "layout", "backdrop")) ?? "" });
    }
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out.push({ scene: k, note: str(v) ?? "" });
    }
  }
  return out.slice(0, 24);
}

/** Parse a JSON knowledge map with flexible key names. */
function fromJson(json: unknown, fileName?: string): DesignDna | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const typography = (pick(o, "typography", "fonts", "type") ?? {}) as Record<string, unknown>;
  const geometry = (pick(o, "geometry", "shapes", "boxes") ?? {}) as Record<string, unknown>;
  const dna: DesignDna = {
    name:
      str(pick(o, "name", "title", "stylename", "brand", "deckname")) ??
      (fileName ? fileName.replace(/\.[a-z0-9]+$/i, "") : "Imported design DNA"),
    summary: str(pick(o, "summary", "description", "rationale", "intent")),
    palette: toSwatches(pick(o, "palette", "colors", "colours", "paletteroles", "swatches")),
    fonts: {
      heading: str(pick(typography, "heading", "headings", "display", "title")),
      body: str(pick(typography, "body", "text", "paragraph")),
      notes: str(pick(typography, "notes", "note", "character", "scale")) ?? str(pick(o, "typographynote")),
    },
    geometry: {
      card_shape: str(pick(geometry, "cardshape", "shape", "cards")),
      corner_radius: str(pick(geometry, "cornerradius", "radius", "corners")),
      notes: str(pick(geometry, "notes", "note")),
    },
    scenes: toScenes(pick(o, "scenes", "sections", "sectionscenes", "slides", "layouts")),
    rules: toRules(pick(o, "rules", "guidelines", "principles", "do", "dos", "constraints")),
    raw: JSON.stringify(json, null, 2).slice(0, MAX_RAW),
    source: "json",
  };
  const mode = str(pick(o, "mode", "theme"));
  if (mode === "light" || mode === "dark") dna.mode = mode;
  if (fileName) dna.fileName = fileName;
  return dna;
}

/** Fall back to notes/markdown: pull hexes, font mentions and bullet rules. */
function fromText(text: string, fileName?: string): DesignDna {
  const hexes = Array.from(new Set((text.match(HEX) ?? []).map((h) => h.toLowerCase()))).slice(0, 18);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const fontLine = lines.find((l) => /font|typeface|typography/i.test(l));
  const headingFont = fontLine?.match(/heading[s]?\s*[:\-]?\s*([^,;|]+)/i)?.[1]?.trim();
  const bodyFont = fontLine?.match(/body\s*[:\-]?\s*([^,;|]+)/i)?.[1]?.trim();
  const first = lines[0] ?? "";
  return {
    name:
      (first.length <= 80 && !HEX.test(first) ? first.replace(/^#+\s*/, "") : "") ||
      (fileName ? fileName.replace(/\.[a-z0-9]+$/i, "") : "Imported design DNA"),
    summary: lines.slice(1, 3).join(" ").slice(0, 280) || undefined,
    mode: /\bdark\b/i.test(text) && !/\blight\b/i.test(text) ? "dark" : undefined,
    palette: hexes.map((h, i) => ({ name: `color ${i + 1}`, value: h })),
    fonts: {
      ...(headingFont ? { heading: headingFont } : {}),
      ...(bodyFont ? { body: bodyFont } : {}),
      ...(fontLine && !headingFont && !bodyFont ? { notes: fontLine } : {}),
    },
    scenes: [],
    rules: lines.filter((l) => /^[-•*]/.test(l)).map((l) => l.replace(/^[-•*]\s*/, "")).slice(0, 40),
    raw: text.slice(0, MAX_RAW),
    source: "text",
    ...(fileName ? { fileName } : {}),
  };
}

/** Parse pasted/uploaded content of unknown shape into a design DNA record. */
export function parseDesignDna(input: string, fileName?: string): DesignDna | { error: string } {
  const text = (input ?? "").trim();
  if (text.length < 8) return { error: "That file or text looks empty — paste a knowledge map or upload a JSON/markdown file." };
  try {
    const parsed = JSON.parse(text);
    const dna = fromJson(parsed, fileName);
    if (dna) return dna;
  } catch {
    /* not JSON — treat as notes */
  }
  return fromText(text, fileName);
}

/** Loose runtime guard for the DNA arriving in a chat request body. */
export const DesignDnaSchema = z
  .object({
    name: z.string().optional(),
    summary: z.string().optional(),
    mode: z.enum(["light", "dark"]).optional(),
    palette: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    fonts: z.object({ heading: z.string().optional(), body: z.string().optional(), notes: z.string().optional() }).optional(),
    geometry: z
      .object({ card_shape: z.string().optional(), corner_radius: z.string().optional(), notes: z.string().optional() })
      .optional(),
    scenes: z.array(z.object({ scene: z.string(), note: z.string().optional() })).optional(),
    rules: z.array(z.string()).optional(),
    raw: z.string().optional(),
    source: z.enum(["json", "text"]).optional(),
    fileName: z.string().optional(),
  })
  .passthrough();

export function coerceDesignDna(value: unknown): DesignDna | null {
  const parsed = DesignDnaSchema.safeParse(value);
  if (!parsed.success) return null;
  const v = parsed.data;
  return {
    name: v.name?.trim() || "Imported design DNA",
    ...(v.summary ? { summary: v.summary } : {}),
    ...(v.mode ? { mode: v.mode } : {}),
    palette: (v.palette ?? []).slice(0, 24),
    fonts: v.fonts ?? {},
    ...(v.geometry ? { geometry: v.geometry } : {}),
    scenes: (v.scenes ?? []).map((s) => ({ scene: s.scene, note: s.note ?? "" })).slice(0, 24),
    rules: (v.rules ?? []).slice(0, 40),
    raw: (v.raw ?? "").slice(0, MAX_RAW),
    source: v.source ?? "json",
    ...(v.fileName ? { fileName: v.fileName } : {}),
  };
}

/** Short human summary for chips and headers. */
export function designDnaSummary(dna: DesignDna): string {
  const bits = [dna.name];
  if (dna.palette.length) bits.push(`${dna.palette.length} colors`);
  if (dna.fonts.heading || dna.fonts.body) bits.push([dna.fonts.heading, dna.fonts.body].filter(Boolean).join(" / "));
  if (dna.rules.length) bits.push(`${dna.rules.length} rules`);
  return bits.join(" · ");
}

/** System-prompt block: the imported map becomes the design authority. */
export function designDnaPromptBlock(dna: DesignDna): string {
  const lines = [
    "",
    "IMPORTED VISUAL KNOWLEDGE MAP (the user's own design DNA — treat it as the authority for this deck):",
    `Name: ${dna.name}${dna.mode ? ` (${dna.mode} mode)` : ""}`,
  ];
  if (dna.summary) lines.push(`Summary: ${dna.summary}`);
  if (dna.palette.length)
    lines.push(`Palette: ${dna.palette.map((p) => `${p.name} ${p.value}`).join(", ")}`);
  const fonts = [dna.fonts.heading && `headings ${dna.fonts.heading}`, dna.fonts.body && `body ${dna.fonts.body}`, dna.fonts.notes]
    .filter(Boolean)
    .join("; ");
  if (fonts) lines.push(`Typography: ${fonts}`);
  const geo = [dna.geometry?.card_shape, dna.geometry?.corner_radius, dna.geometry?.notes].filter(Boolean).join("; ");
  if (geo) lines.push(`Geometry: ${geo}`);
  if (dna.scenes.length)
    lines.push(`Section intent: ${dna.scenes.map((s) => `${s.scene}${s.note ? ` — ${s.note}` : ""}`).join(" | ")}`);
  if (dna.rules.length) lines.push("Rules:", ...dna.rules.map((r) => `- ${r}`));
  lines.push(
    "Use this map when you call plan_visual_design: choose the built-in design language that sits closest to it, and say in the rationale how you matched palette, typography, geometry and section intent. Never contradict an explicit rule above. Call read_design_dna if you need the full source.",
  );
  return lines.join("\n");
}

/* ------------------------------------------------- browser storage (per thread) */

const key = (threadId: string) => `agent-design-dna:${threadId}`;

export function readStoredDesignDna(threadId: string | undefined): DesignDna | null {
  if (!threadId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(threadId));
    return raw ? coerceDesignDna(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeStoredDesignDna(threadId: string | undefined, dna: DesignDna | null) {
  if (!threadId || typeof window === "undefined") return;
  try {
    if (dna) window.localStorage.setItem(key(threadId), JSON.stringify(dna));
    else window.localStorage.removeItem(key(threadId));
  } catch {
    /* storage disabled — import just won't persist */
  }
}
