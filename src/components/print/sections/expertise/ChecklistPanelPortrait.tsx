// Glass checklist panel — up to 6 rows with accent check chips.
import type { PrintExpertiseSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { Icon, clampLines } from "@/components/print/print-primitives";

export function ChecklistPanelPortrait({
  section,
  mode,
  accent,
}: {
  section: PrintExpertiseSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, 6);
  return (
    <section aria-label={section.title ?? "Capabilities"} style={{ margin: `${cq(18)} 0` }}>
      <div
        style={{
          borderRadius: cq(14),
          padding: `${cq(18)} ${cq(20)}`,
          ...sectionGlass(mode, accent),
        }}
      >
        {(section.eyebrow || section.title) && (
          <div style={{ marginBottom: cq(10) }}>
            {section.eyebrow && (
              <div
                style={{
                  fontSize: cq(9),
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: accent,
                  textTransform: "uppercase",
                }}
              >
                {section.eyebrow}
              </div>
            )}
            {section.title && (
              <div
                style={{ marginTop: cq(3), fontSize: cq(14), fontWeight: 700, color: ink.strong }}
              >
                {section.title}
              </div>
            )}
          </div>
        )}
        <div
          className="grid"
          style={{
            gridTemplateColumns: items.length > 3 ? "1fr 1fr" : "1fr",
            columnGap: cq(18),
            rowGap: cq(10),
          }}
        >
          {items.map((it, i) => (
            <div key={i} className="flex items-start" style={{ gap: cq(10) }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: cq(20),
                  height: cq(20),
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${accent} 28%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
                  border: `1px solid color-mix(in srgb, ${accent} 34%, transparent)`,
                  flexShrink: 0,
                  marginTop: cq(1),
                }}
              >
                <Icon name="check" size={cq(11)} color={accent} strokeWidth={2.25} />
              </div>
              <div
                style={{ fontSize: cq(10.5), lineHeight: 1.45, color: ink.soft, ...clampLines(2) }}
              >
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
