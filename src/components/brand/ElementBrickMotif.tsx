/**
 * ELEMENT brick motif — the system's signature graphic device.
 *
 * The five bricks of the ELEMENT "E" (cap, mid-short, mid-long, base-long,
 * base-short) are reused as a *modular measure*: a horizontal tick row above a
 * masthead, or a vertical rail down the leading edge of a hero. Proportions are
 * fixed (they are the logo's own module widths) — only length, weight and tone
 * are authorable, so the motif always reads as the same system.
 *
 * Rendered with plain divs and literal colours (no CSS vars, no gradients) so it
 * survives print rasterisation, PDF export and PPTX DOM decomposition 1:1.
 */

/** Fixed module widths, in brick units — the logo's own rhythm. */
export const ELEMENT_BRICK_UNITS = [5, 1.3, 3.4, 3.4, 1.3] as const;

/** Brand spectrum, in brick order. Never re-map. */
export const ELEMENT_BRICK_COLORS = [
  "#2563EB",
  "#14B8A6",
  "#0D2A6B",
  "#FF6B57",
  "#8B5CF6",
] as const;

export type ElementBrickTone = "spectrum" | "accent" | "ink" | "reversed";

function fills(tone: ElementBrickTone, accent: string): string[] {
  if (tone === "spectrum") return [...ELEMENT_BRICK_COLORS];
  if (tone === "reversed")
    return ["#FFFFFF", "rgba(255,255,255,0.78)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.78)", "#FFFFFF"];
  if (tone === "ink")
    return ["#03002C", "rgba(3,0,44,0.7)", "rgba(3,0,44,0.45)", "rgba(3,0,44,0.7)", "#03002C"];
  return [
    accent,
    `color-mix(in srgb, ${accent} 70%, #FFFFFF)`,
    `color-mix(in srgb, ${accent} 45%, #FFFFFF)`,
    `color-mix(in srgb, ${accent} 70%, #FFFFFF)`,
    accent,
  ];
}

type RowProps = {
  /** Brick thickness (row height) — any CSS length. */
  thickness: string;
  /** Length of one brick unit — any CSS length. */
  unit: string;
  /** Gap between bricks. */
  gap: string;
  tone?: ElementBrickTone;
  accent?: string;
  style?: React.CSSProperties;
  /** Render only the first n bricks (2–5). */
  count?: number;
};

/** Horizontal tick row — sits above a masthead rule or under an eyebrow. */
export function ElementBrickRow({
  thickness,
  unit,
  gap,
  tone = "spectrum",
  accent = "#003FC7",
  style,
  count = 5,
}: RowProps) {
  const colors = fills(tone, accent);
  return (
    <div aria-hidden style={{ display: "flex", alignItems: "flex-end", gap, ...style }}>
      {ELEMENT_BRICK_UNITS.slice(0, Math.max(2, Math.min(5, count))).map((u, i) => (
        <span
          key={i}
          style={{
            display: "block",
            height: thickness,
            width: `calc(${unit} * ${u})`,
            background: colors[i],
          }}
        />
      ))}
    </div>
  );
}

/** Vertical rail — hugs the leading edge of a hero band or page opener. */
export function ElementBrickRail({
  thickness,
  unit,
  gap,
  tone = "spectrum",
  accent = "#003FC7",
  style,
  count = 5,
}: RowProps) {
  const colors = fills(tone, accent);
  return (
    <div
      aria-hidden
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap, ...style }}
    >
      {ELEMENT_BRICK_UNITS.slice(0, Math.max(2, Math.min(5, count))).map((u, i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: thickness,
            height: `calc(${unit} * ${u})`,
            background: colors[i],
          }}
        />
      ))}
    </div>
  );
}
