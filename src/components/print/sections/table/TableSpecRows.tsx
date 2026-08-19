// Spec rows — label → value table with a shaded header strip. Used for scope,
// SLA, language coverage and deliverable specs across curated collateral.
import type { PrintTableSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

export function TableSpecRows({
  section,
  mode,
  accent,
}: {
  section: PrintTableSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const icons = usePrintIcons();
  const rows = section.rows.slice(0, 10);
  return (
    <section aria-label={section.title ?? "Specification"} style={{ margin: `${cq(18)} 0` }}>
      <div
        style={{
          borderRadius: cq(12),
          overflow: "hidden",
          border: `1px solid ${ink.hairline}`,
        }}
      >
        <div
          className="flex items-baseline justify-between"
          style={{
            gap: cq(10),
            padding: `${cq(9)} ${cq(14)}`,
            background: `color-mix(in srgb, ${accent} ${mode === "dark" ? 22 : 12}%, transparent)`,
          }}
        >
          <span className="flex items-center" style={{ gap: cq(7) }}>
            {icons ? (
              <EditableIcon
                slot={`sec.${section.id}.head`}
                name="document"
                size={cq(13)}
                color={accent}
                strokeWidth={1.75}
              />
            ) : null}
          </span>
          <span
            style={{
              fontSize: cq(11.5),
              fontWeight: 700,
              color: ink.strong,
              letterSpacing: "-0.01em",
            }}
          >
            {section.title ?? "At a glance"}
          </span>
          {section.eyebrow && (
            <span
              style={{
                fontSize: cq(8.6),
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {section.eyebrow}
            </span>
          )}
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between"
            style={{
              gap: cq(14),
              padding: `${cq(8)} ${cq(14)}`,
              borderTop: `1px solid ${ink.hairline}`,
            }}
          >
            <span style={{ fontSize: cq(9.8), color: ink.soft }}>{r.label}</span>
            <span
              style={{
                fontSize: cq(10),
                fontWeight: 700,
                color: ink.strong,
                whiteSpace: "nowrap",
              }}
            >
              {r.value ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
