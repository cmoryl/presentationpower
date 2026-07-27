// Full-width pull quote — large italic body with big open glyph.
import type { PrintQuoteSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { clampLines } from "@/components/print/print-primitives";

export function PullQuoteHero({
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
    <section aria-label="Pull quote" style={{ margin: `${cq(18)} 0` }}>
      <div
        style={{
          position: "relative",
          borderRadius: cq(18),
          padding: `${cq(28)} ${cq(30)} ${cq(24)}`,
          ...sectionGlass(mode, accent),
        }}
      >
        {section.eyebrow && (
          <div
            style={{
              fontSize: cq(9.5),
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: accent,
              textTransform: "uppercase",
              marginBottom: cq(8),
            }}
          >
            {section.eyebrow}
          </div>
        )}
        <div
          aria-hidden
          style={{
            fontFamily: "Georgia, serif",
            fontSize: cq(72),
            lineHeight: 0.55,
            color: accent,
            fontWeight: 700,
          }}
        >
          &ldquo;
        </div>
        <p
          style={{
            margin: `${cq(6)} 0 0`,
            fontSize: cq(18),
            lineHeight: 1.45,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: ink.strong,
            fontStyle: "italic",
            ...clampLines(6),
          }}
        >
          {section.text}
        </p>
        {(section.author || section.role || section.company) && (
          <div
            style={{
              marginTop: cq(14),
              fontSize: cq(10.5),
              fontWeight: 700,
              color: accent,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            — {section.author}
            {section.role && (
              <span style={{ color: ink.soft, fontWeight: 500 }}>{`, ${section.role}`}</span>
            )}
            {section.company && (
              <span style={{ color: ink.faint, fontWeight: 500 }}>{` · ${section.company}`}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
