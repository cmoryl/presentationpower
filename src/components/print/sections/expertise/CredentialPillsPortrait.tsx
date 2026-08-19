// Row of short credential pills. Great for accreditations / ISOs.
import type { PrintExpertiseSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
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
  const items = section.items.slice(0, 8);
  return (
    <section aria-label={section.title ?? "Credentials"} style={{ margin: `${cq(14)} 0` }}>
      {(section.eyebrow || section.title) && (
        <div
          style={{
            marginBottom: cq(8),
            fontSize: cq(9.5),
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: accent,
            textTransform: "uppercase",
          }}
        >
          {section.title || section.eyebrow}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: cq(8) }}>
        {items.map((it, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: `${cq(6)} ${cq(12)}`,
              borderRadius: 999,
              fontSize: cq(9.5),
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: ink.strong,
              background:
                mode === "dark"
                  ? `color-mix(in srgb, ${accent} 14%, rgba(10,8,36,0.55))`
                  : `color-mix(in srgb, ${accent} 10%, #ffffff)`,
              border: `1px solid color-mix(in srgb, ${accent} 28%, ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)"})`,
            }}
          >
            {icons ? (
              <span style={{ display: "inline-flex", marginRight: cq(6) }}>
                <EditableIcon
                  slot={`sec.${section.id}.pill.${i}`}
                  name="badge"
                  size={cq(11)}
                  color={accent}
                  strokeWidth={1.75}
                />
              </span>
            ) : null}
            {it.label}
          </span>
        ))}
      </div>
    </section>
  );
}
