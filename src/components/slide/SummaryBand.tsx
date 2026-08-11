import type { CSSProperties, ReactNode } from "react";
import {
  SUMMARY_BAND,
  seamTickStyle,
  summaryBandStyle,
  summaryClauseStyle,
} from "@/lib/surface-tokens";

/**
 * The house bottom summary band.
 *
 * Single source of truth for the takeaway strip that sits under a module's
 * body: open-bottom frame, top-lit accent wash, short accent seam across the
 * top edge, and two baseline-aligned clauses (neutral lead + accent emphasis).
 *
 * Every module renders its bottom section through this component so frame
 * height, seam, padding and copy size can never drift between slides. Use
 * `scale` (e.g. 0.8) for vertically tight layouts and `fontSize` only when a
 * module needs fluid/container-driven type; both keep the same proportions.
 */
export function SummaryBand({
  lead,
  emphasis,
  accent,
  leadTone,
  scale = 1,
  fontSize,
  className,
  style,
  children,
  ...rest
}: {
  lead?: string;
  emphasis?: string;
  /** Accent tone driving the frame, wash, seam and emphasis clause. */
  accent: string;
  /** Ink colour for the lead clause. */
  leadTone: string;
  scale?: number;
  fontSize?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "className" | "children">) {
  if (!lead && !emphasis && !children) return null;
  const size = fontSize ?? Math.round(SUMMARY_BAND.fontSize * (scale === 1 ? 1 : 0.92));
  return (
    <div
      className={`relative flex flex-wrap items-baseline justify-center text-center${className ? ` ${className}` : ""}`}
      style={{ ...summaryBandStyle(accent, scale), ...style }}
      {...rest}
    >
      <div aria-hidden data-decorative className="absolute" style={seamTickStyle(accent)} />
      {lead && <span style={summaryClauseStyle(leadTone, size)}>{lead}</span>}
      {emphasis && <span style={summaryClauseStyle(accent, size)}>{emphasis}</span>}
      {children}
    </div>
  );
}

/** Normalises authored summary content: plain string or `{ lead, emphasis }`. */
export function readSummary(value: unknown): { lead: string; emphasis: string } {
  if (typeof value === "string") return { lead: value.trim(), emphasis: "" };
  const o = (value ?? {}) as Record<string, unknown>;
  return {
    lead: typeof o.lead === "string" ? o.lead.trim() : "",
    emphasis: typeof o.emphasis === "string" ? o.emphasis.trim() : "",
  };
}
