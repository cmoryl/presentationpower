// Glass card with quote body left, author lockup right.
import type { PrintQuoteSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { clampLines } from "@/components/print/print-primitives";

export function QuoteAttributionCard({
  section,
  mode,
  accent,
}: {
  section: PrintQuoteSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const initials =
    (section.author || "")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "★";
  return (
    <section aria-label="Quote" style={{ margin: `${cq(18)} 0` }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1.6fr 1fr",
          gap: cq(16),
          borderRadius: cq(16),
          padding: cq(22),
          ...sectionGlass(mode, accent),
        }}
      >
        <div>
          {section.eyebrow && (
            <div
              style={{
                fontSize: cq(9),
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: accent,
                textTransform: "uppercase",
                marginBottom: cq(6),
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <div
            aria-hidden
            style={{
              fontFamily: "Georgia, serif",
              fontSize: cq(44),
              lineHeight: 0.6,
              color: accent,
              fontWeight: 700,
            }}
          >
            &ldquo;
          </div>
          <p
            style={{
              margin: `${cq(8)} 0 0`,
              fontSize: cq(13),
              lineHeight: 1.55,
              color: ink.strong,
              ...clampLines(5),
            }}
          >
            {section.text}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: cq(10),
          }}
        >
          <div
            style={{
              width: cq(52),
              height: cq(52),
              borderRadius: "50%",
              background: `color-mix(in srgb, ${accent} 30%, transparent)`,
              color: mode === "dark" ? "#F5F4FF" : "#03002C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: cq(18),
              letterSpacing: "0.06em",
              border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
            }}
          >
            {initials}
          </div>
          {section.author && (
            <div style={{ fontSize: cq(12), fontWeight: 700, color: ink.strong, lineHeight: 1.2 }}>
              {section.author}
            </div>
          )}
          {(section.role || section.company) && (
            <div style={{ fontSize: cq(9.5), color: ink.soft, lineHeight: 1.35 }}>
              {[section.role, section.company].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
