// "Discover" panel — short body paragraph on the left, bullet rail on the
// right. Ported from the e-brochure / engagement-snapshot pattern.
import type { PrintNarrativeSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, modulePanel, safeList } from "../shared";
import { clampLines } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

export function NarrativeDiscoverPanel({
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
  const lead = safeList(section.items)[0];
  const bullets = (lead?.bullets ?? []).slice(0, 6);
  return (
    <section aria-label={section.title ?? "Discover"} style={{ margin: 0 }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: cq(MODULE.gridGap),
          ...modulePanel(mode, accent),
        }}
      >
        <div>
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
          <div
            style={{
              marginTop: cq(MODULE.eyebrowGap),
              fontSize: cq(MODULE.panelTitle),
              fontWeight: 700,
              color: ink.strong,
              letterSpacing: "-0.015em",
            }}
          >
            {section.title ?? lead?.heading ?? "Discover"}
          </div>
          {lead?.body && (
            <div
              style={{
                marginTop: cq(7),
                fontSize: cq(MODULE.body),
                lineHeight: MODULE.bodyLead,
                color: ink.soft,
                ...clampLines(8),
              }}
            >
              {lead.body}
            </div>
          )}
        </div>
        <div
          style={{
            borderLeft: `1px solid ${ink.hairline}`,
            paddingLeft: cq(MODULE.gridGap),
          }}
        >
          {bullets.map((b, i) => (
            <div
              key={i}
              className="flex items-start"
              style={{
                gap: cq(8),
                padding: `${cq(6)} 0`,
                borderTop: i === 0 ? "none" : `1px solid ${ink.hairline}`,
              }}
            >
              {icons ? (
                <span style={{ marginTop: cq(2), flexShrink: 0 }}>
                  <EditableIcon
                    slot={`sec.${section.id}.bullet.${i}`}
                    name="check"
                    size={cq(10)}
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
                    marginTop: cq(5),
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ fontSize: cq(9.6), lineHeight: 1.45, color: ink.soft }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
