// Numbered Challenge → Solution → Result arc. Mirrors the case-study spine:
// large 01/02/03 markers, connective hairline, roomy body copy.
import type { PrintNarrativeSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { clampLines } from "@/components/print/print-primitives";

export function NarrativeNumberedArc({
  section,
  mode,
  accent,
}: {
  section: PrintNarrativeSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, 4);
  return (
    <section aria-label={section.title ?? "Narrative arc"} style={{ margin: `${cq(18)} 0` }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(10) }}>
          {section.eyebrow && (
            <div
              style={{
                fontSize: cq(9.5),
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: accent,
                textTransform: "uppercase",
              }}
            >
              {section.eyebrow}
            </div>
          )}
          {section.title && (
            <h3
              style={{
                margin: `${cq(4)} 0 0`,
                fontSize: cq(16),
                fontWeight: 700,
                color: ink.strong,
                letterSpacing: "-0.015em",
              }}
            >
              {section.title}
            </h3>
          )}
        </header>
      )}
      <div>
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-start"
            style={{
              gap: cq(14),
              padding: `${cq(12)} 0`,
              borderTop: i === 0 ? "none" : `1px solid ${ink.hairline}`,
            }}
          >
            <div
              style={{
                fontSize: cq(24),
                fontWeight: 800,
                lineHeight: 1,
                color: accent,
                letterSpacing: "-0.04em",
                width: cq(48),
                flexShrink: 0,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: cq(12.5), fontWeight: 700, color: ink.strong }}>
                {it.heading}
              </div>
              {it.body && (
                <div
                  style={{
                    marginTop: cq(4),
                    fontSize: cq(10),
                    lineHeight: 1.55,
                    color: ink.soft,
                    ...clampLines(4),
                  }}
                >
                  {it.body}
                </div>
              )}
              {it.bullets && it.bullets.length > 0 && (
                <div
                  className="flex flex-wrap"
                  style={{ gap: cq(6), marginTop: cq(7) }}
                >
                  {it.bullets.slice(0, 4).map((b, bi) => (
                    <span
                      key={bi}
                      style={{
                        fontSize: cq(8.8),
                        padding: `${cq(3)} ${cq(8)}`,
                        borderRadius: cq(999),
                        color: ink.strong,
                        border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
