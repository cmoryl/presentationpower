// Feature verb cards — port of AdaptorBrief 6-card pattern. Supports 2- or
// 3-column layouts via the `cols` prop.
import type { PrintFeatureListSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { Icon, ICON_PATHS, type IconName, clampLines } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";

const VERB_FALLBACK: IconName[] = ["sparkles", "target", "bolt", "learn", "trending", "check"];

export function VerbCardsPortrait({
  section,
  mode,
  accent,
  cols,
}: {
  section: PrintFeatureListSection;
  mode: "light" | "dark";
  accent: string;
  cols: 2 | 3;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, cols === 3 ? 6 : 4);
  return (
    <section aria-label={section.title ?? "Features"} style={{ margin: `${cq(18)} 0` }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(12) }}>
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
      <div style={{ borderRadius: cq(16), padding: cq(16), ...sectionGlass(mode, accent) }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: cq(14) }}
        >
          {items.map((f, i) => {
            const name =
              (f.icon as IconName) && ICON_PATHS[f.icon as IconName]
                ? (f.icon as IconName)
                : VERB_FALLBACK[i % VERB_FALLBACK.length]!;
            return (
              <div key={i} style={{ padding: `${cq(10)} ${cq(4)}` }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: cq(36),
                    height: cq(36),
                    borderRadius: cq(10),
                    background: `color-mix(in srgb, ${accent} 22%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
                    border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                  }}
                >
                  <EditableIcon slot={`sec.${section.id}.item.${i}`} name={name} size={cq(17)} color={accent} strokeWidth={1.75} />
                </div>
                <div
                  style={{
                    marginTop: cq(10),
                    fontSize: cq(13),
                    fontWeight: 700,
                    color: ink.strong,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {f.verb}
                </div>
                {f.body && (
                  <div
                    style={{
                      marginTop: cq(4),
                      fontSize: cq(10),
                      lineHeight: 1.5,
                      color: ink.soft,
                      ...clampLines(4),
                    }}
                  >
                    {f.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
