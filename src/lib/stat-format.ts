// Number formatting for the orbit figures on the growth-proof split module.
// Each figure carries its own prefix, suffix and decimal count so one ring can
// read "+38%" while another reads "$1.4B" — the authored value stays raw and
// the formatting is applied at render and export time.

export type StatFormat = {
  prefix: string;
  suffix: string;
  /** null = leave the authored digits exactly as typed. */
  decimals: number | null;
};

export const MAX_STAT_DECIMALS = 3;
export const MAX_STAT_AFFIX_CHARS = 4;

export const DEFAULT_STAT_FORMAT: StatFormat = { prefix: "", suffix: "", decimals: null };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function affix(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX_STAT_AFFIX_CHARS) : "";
}

/** Read the format authored on one figure, clamped and defaulted. */
export function resolveStatFormat(raw: unknown): StatFormat {
  const o = (raw ?? {}) as Record<string, unknown>;
  const d = o.decimals;
  return {
    prefix: affix(o.prefix),
    suffix: affix(o.suffix),
    decimals:
      typeof d === "number" && Number.isFinite(d)
        ? Math.round(clamp(d, 0, MAX_STAT_DECIMALS))
        : null,
  };
}

/** Patch the format fields on one figure, leaving its copy untouched. */
export function patchStatFormat(raw: unknown, patch: Partial<StatFormat>): StatFormat {
  return resolveStatFormat({ ...resolveStatFormat(raw), ...patch });
}

export function isDefaultStatFormat(fmt: StatFormat): boolean {
  return fmt.prefix === "" && fmt.suffix === "" && fmt.decimals === null;
}

/**
 * Split an authored value such as "+38.5%" into the numeric core and whatever
 * decoration the author typed around it.
 */
export function splitStatValue(value: unknown): { lead: string; digits: string; trail: string } {
  const raw = typeof value === "string" ? value.trim() : typeof value === "number" ? `${value}` : "";
  const m = raw.match(/^([^0-9-]*-?)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
  if (!m) return { lead: "", digits: "", trail: raw };
  return { lead: (m[1] ?? "").trim(), digits: m[2] ?? "", trail: (m[3] ?? "").trim() };
}

/**
 * Render one figure. When the author has set a prefix, suffix or decimal count
 * those win; anything left unset keeps what they typed in the value itself.
 */
export function formatStatValue(value: unknown, raw?: unknown): string {
  const fmt = resolveStatFormat(raw);
  const { lead, digits, trail } = splitStatValue(value);
  if (!digits) return typeof value === "string" ? value : "";

  let core = digits;
  if (fmt.decimals !== null) {
    const n = Number(digits.replace(/,/g, ""));
    if (Number.isFinite(n)) {
      core = n.toFixed(fmt.decimals);
      if (digits.includes(",")) core = Number(core).toLocaleString("en-US", {
        minimumFractionDigits: fmt.decimals,
        maximumFractionDigits: fmt.decimals,
      });
    }
  }

  const prefix = fmt.prefix || lead;
  const suffix = fmt.suffix || trail;
  return `${prefix}${core}${suffix}`;
}
