// Challenge / Approach / Impact triptych — the spine of every curated
// e-brochure in the print library. Three glass cards, optional bullet rails.
import type { PrintNarrativeSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, moduleCard, safeList} from "../shared";
import { clampLines, type IconName } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

const TRI_ICONS: IconName[] = ["target", "bolt", "trending"];

export function NarrativeTriCard({
  section,
  mode,
  accent,
}: {
  section: PrintNarrativeSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const icons = usePrintIcons();
  const items = safeList(section.items).slice(0, 3);
  if (items.length === 0) return null;
  const cols = Math.max(1, items.length);
  return (
    <section aria-label={section.title ?? "Narrative"} style={{ margin: 0 }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(MODULE.headerGap) }}>
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
                fontSize: cq(MODULE.title),
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
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: cq(MODULE.gridGap) }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              ...moduleCard(mode, accent),
            }}
          >
            {icons ? (
              <div
                className="flex items-center justify-center"
                style={{
                  width: cq(32),
                  height: cq(32),
                  borderRadius: cq(9),
                  marginBottom: cq(10),
                  background: `color-mix(in srgb, ${accent} 22%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
                  border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                }}
              >
                <EditableIcon
                  slot={`sec.${section.id}.item.${i}`}
                  name={TRI_ICONS[i % TRI_ICONS.length]!}
                  size={cq(16)}
                  color={accent}
                  strokeWidth={1.75}
                />
              </div>
            ) : (
              <div
                style={{
                  width: cq(28),
                  height: cq(3),
                  borderRadius: cq(3),
                  background: accent,
                  marginBottom: cq(10),
                }}
              />
            )}
            <div
              style={{
                fontSize: cq(MODULE.cardTitle),
                fontWeight: 700,
                color: ink.strong,
                letterSpacing: "-0.01em",
              }}
            >
              {it.heading}
            </div>
            {it.body && (
              <div
                style={{
                  marginTop: cq(6),
                  fontSize: cq(MODULE.body),
                  lineHeight: MODULE.bodyLead,
                  color: ink.soft,
                  ...clampLines(6),
                }}
              >
                {it.body}
              </div>
            )}
            {safeList(it.bullets).length > 0 && (
              <ul style={{ margin: `${cq(8)} 0 0`, padding: 0, listStyle: "none" }}>
                {safeList(it.bullets).slice(0, 4).map((b, bi) => (
                  <li
                    key={bi}
                    className="flex items-start"
                    style={{ gap: cq(6), marginTop: cq(5) }}
                  >
                    {icons ? (
                      <span style={{ marginTop: cq(2), flexShrink: 0 }}>
                        <EditableIcon
                          slot={`sec.${section.id}.bullet`}
                          name="check"
                          size={cq(9)}
                          color={accent}
                          strokeWidth={2.25}
                        />
                      </span>
                    ) : (
                      <span
                        style={{
                          width: cq(5),
                          height: cq(5),
                          borderRadius: "50%",
                          background: accent,
                          marginTop: cq(4),
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ fontSize: cq(9.2), lineHeight: 1.45, color: ink.faint }}>
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
