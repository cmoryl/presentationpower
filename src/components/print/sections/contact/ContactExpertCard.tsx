// Subject-expert card — the "Speak to our expert" lockup used at the foot of
// case studies and spotlights.
import type { PrintContactSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";

export function ContactExpertCard({
  section,
  mode,
  accent,
}: {
  section: PrintContactSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const initials = (section.name ?? "TP")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <section aria-label={section.title ?? "Contact"} style={{ margin: `${cq(18)} 0` }}>
      <div
        className="flex items-center"
        style={{
          gap: cq(14),
          borderRadius: cq(14),
          padding: `${cq(14)} ${cq(16)}`,
          ...sectionGlass(mode, accent),
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: cq(44),
            height: cq(44),
            borderRadius: "50%",
            flexShrink: 0,
            background: `color-mix(in srgb, ${accent} 26%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
            border: `1px solid color-mix(in srgb, ${accent} 34%, transparent)`,
            fontSize: cq(15),
            fontWeight: 700,
            color: ink.strong,
            letterSpacing: "-0.01em",
          }}
        >
          {initials || "TP"}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {section.eyebrow && (
            <div
              style={{
                fontSize: cq(8.6),
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <div
            style={{ marginTop: cq(3), fontSize: cq(13), fontWeight: 700, color: ink.strong }}
          >
            {section.name ?? "Your program lead"}
          </div>
          {section.role && (
            <div style={{ marginTop: cq(2), fontSize: cq(9.6), color: ink.soft }}>
              {section.role}
            </div>
          )}
          <div
            className="flex flex-wrap items-center"
            style={{ gap: cq(12), marginTop: cq(6) }}
          >
            {section.email && (
              <span className="flex items-center" style={{ gap: cq(5) }}>
                <EditableIcon
                  slot={`sec.${section.id}.mail`}
                  name="check"
                  size={cq(10)}
                  color={accent}
                  strokeWidth={2}
                />
                <span style={{ fontSize: cq(9.2), color: ink.faint }}>{section.email}</span>
              </span>
            )}
            {section.phone && (
              <span style={{ fontSize: cq(9.2), color: ink.faint }}>{section.phone}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
