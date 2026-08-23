// Glass checklist panel — up to 6 rows with accent check chips.
import type { PrintExpertiseSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass, MODULE } from "../shared";
import { Icon, clampLines } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

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
  const icons = usePrintIcons();
  const items = section.items.slice(0, 6);
  return (
    <section aria-label={section.title ?? "Capabilities"} style={{ margin: 0 }}>
      <div
        style={{
          ...modulePanel(mode, accent),
        }}
      >
        {(section.eyebrow || section.title) && (
          <div style={{ marginBottom: cq(MODULE.headerGap) }}>
            {section.eyebrow && (
              <div
                style={{
                  fontSize: cq(MODULE.eyebrow),
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
                style={{
                  marginTop: cq(MODULE.eyebrowGap),
                  fontSize: cq(MODULE.panelTitle),
                  fontWeight: 700,
                  letterSpacing: MODULE.titleTrack,
                  color: ink.strong,
                }}
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
            columnGap: cq(MODULE.gridGap * 1.25),
            rowGap: cq(11),
          }}
        >
          {items.map((it, i) => (
            <div key={i} className="flex items-start" style={{ gap: cq(10) }}>
              {icons ? (
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
                  <EditableIcon
                    slot={`sec.${section.id}.check`}
                    name="check"
                    size={cq(11)}
                    color={accent}
                    strokeWidth={2.25}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: cq(9),
                    height: 2,
                    background: accent,
                    flexShrink: 0,
                    marginTop: cq(7),
                  }}
                />
              )}
              <div
                style={{
                  fontSize: cq(MODULE.body),
                  lineHeight: 1.45,
                  color: ink.soft,
                  ...clampLines(2),
                }}
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
