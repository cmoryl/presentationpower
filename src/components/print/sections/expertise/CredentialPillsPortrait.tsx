// Row of credentials separated by hairlines — bigger icons, no pills.
import type { PrintExpertiseSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, safeList } from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

export function CredentialPillsPortrait({
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
  const items = safeList(section.items).slice(0, 8);
  if (items.length === 0) return null;
  const hairline = `1px solid ${
    mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.12)"
  }`;
  return (
    <section aria-label={section.title ?? "Credentials"} style={{ margin: 0 }}>
      {(section.eyebrow || section.title) && (
        <div
          style={{
            marginBottom: cq(MODULE.headerGap),
            fontSize: cq(MODULE.eyebrow),
            fontWeight: 700,
            letterSpacing: MODULE.eyebrowTrack,
            color: accent,
            textTransform: "uppercase",
          }}
        >
          {section.title || section.eyebrow}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          borderTop: hairline,
          borderBottom: hairline,
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: cq(10),
              padding: `${cq(12)} ${cq(16)}`,
              paddingLeft: i === 0 ? 0 : cq(16),
              borderLeft: i === 0 ? "none" : hairline,
              flex: "1 1 0",
              minWidth: cq(120),
            }}
          >
            {icons ? (
              <span style={{ display: "inline-flex", flexShrink: 0 }}>
                <EditableIcon
                  slot={`sec.${section.id}.pill.${i}`}
                  name="badge"
                  size={cq(20)}
                  color={accent}
                  strokeWidth={1.75}
                />
              </span>
            ) : null}
            <span
              style={{
                fontSize: cq(10),
                fontWeight: 600,
                letterSpacing: "0.02em",
                lineHeight: 1.3,
                color: ink.strong,
              }}
            >
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
