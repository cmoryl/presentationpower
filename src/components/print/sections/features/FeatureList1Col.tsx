// Single-column feature list — verb + body rows with hairline dividers.
import type { PrintFeatureListSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { Icon, ICON_PATHS, type IconName, clampLines } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

const VERB_FALLBACK: IconName[] = ["sparkles", "target", "bolt", "learn", "trending", "check"];

export function FeatureList1Col({
  section,
  mode,
  accent,
}: {
  section: PrintFeatureListSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const icons = usePrintIcons();
  const items = section.items.slice(0, 5);
  return (
    <section aria-label={section.title ?? "Features"} style={{ margin: `${cq(16)} 0` }}>
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
        {items.map((f, i) => {
          const name =
            (f.icon as IconName) && ICON_PATHS[f.icon as IconName]
              ? (f.icon as IconName)
              : VERB_FALLBACK[i % VERB_FALLBACK.length]!;
          return (
            <div
              key={i}
              className="flex items-start"
              style={{
                gap: cq(14),
                padding: `${cq(12)} 0`,
                borderTop: i === 0 ? "none" : `1px solid ${ink.hairline}`,
              }}
            >
              {icons ? (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: cq(32),
                    height: cq(32),
                    borderRadius: cq(8),
                    background: `color-mix(in srgb, ${accent} 22%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
                    border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                    flexShrink: 0,
                  }}
                >
                  <EditableIcon
                    slot={`sec.${section.id}.item.${i}`}
                    name={name}
                    size={cq(16)}
                    color={accent}
                    strokeWidth={1.75}
                  />
                </div>
              ) : (
                <div
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: cq(24),
                    fontSize: cq(11),
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: accent,
                    paddingTop: cq(1),
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: cq(12), fontWeight: 700, color: ink.strong }}>{f.verb}</div>
                {f.body && (
                  <div
                    style={{
                      marginTop: cq(3),
                      fontSize: cq(10),
                      lineHeight: 1.5,
                      color: ink.soft,
                      ...clampLines(3),
                    }}
                  >
                    {f.body}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
