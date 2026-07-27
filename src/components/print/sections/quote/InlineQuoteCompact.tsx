// Compact inline quote — short body, attribution on same row, no card.
import type { PrintQuoteSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { clampLines } from "@/components/print/print-primitives";

export function InlineQuoteCompact({
  section,
  mode,
  accent,
}: {
  section: PrintQuoteSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  return (
    <section
      aria-label="Inline quote"
      style={{ margin: `${cq(14)} 0`, display: "flex", gap: cq(14), alignItems: "flex-start" }}
    >
      <div
        aria-hidden
        style={{
          fontFamily: "Georgia, serif",
          fontSize: cq(38),
          lineHeight: 0.6,
          color: accent,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        &ldquo;
      </div>
      <div style={{ flex: 1, borderLeft: `2px solid ${accent}`, paddingLeft: cq(14) }}>
        <p
          style={{
            margin: 0,
            fontSize: cq(12),
            lineHeight: 1.55,
            fontStyle: "italic",
            color: ink.strong,
            ...clampLines(3),
          }}
        >
          {section.text}
        </p>
        {(section.author || section.company) && (
          <div
            style={{
              marginTop: cq(6),
              fontSize: cq(9.5),
              fontWeight: 700,
              color: accent,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {section.author}
            {section.company && (
              <span style={{ color: ink.faint, fontWeight: 500 }}>{` · ${section.company}`}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
