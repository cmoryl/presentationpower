// Portrait-native "big number pill" row — three hero stats side-by-side in
// glass surfaces. Great for the tail of a case study or eBrochure.
import { statUnitParts, statValueFitScale, STAT_VALUE_NOWRAP } from "@/lib/print-stat-unit";
import type { PrintStatsSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, moduleCard, safeList } from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

export function StatCalloutRowPortrait({
  section,
  mode,
  accent,
}: {
  section: PrintStatsSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const icons = usePrintIcons();
  const items = safeList(section.items).slice(0, 4);
  if (items.length === 0) return null;
  const cols = Math.min(items.length || 1, 4);

  return (
    <section aria-label={section.title ?? "Stat row"} style={{ margin: 0 }}>
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
                fontSize: cq(18),
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
              <div style={{ marginBottom: cq(8) }}>
                <EditableIcon
                  slot={`sec.${section.id}.item.${i}`}
                  name="chart-bar"
                  size={cq(16)}
                  color={accent}
                  strokeWidth={1.75}
                />
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "baseline", gap: cq(4) }}>
              <span
                style={{
                  fontSize: cq(38 * statValueFitScale(it.value, statUnitParts(it.unit).inline, 6)),
                  fontWeight: 700,
                  lineHeight: 0.95,
                  letterSpacing: "-0.035em",
                  color: ink.strong,
                  fontVariantNumeric: "tabular-nums",
                  ...STAT_VALUE_NOWRAP,
                }}
              >
                {it.value || "—"}
              </span>
              {statUnitParts(it.unit).inline && (
                <span style={{ fontSize: cq(14), fontWeight: 600, color: accent }}>
                  {statUnitParts(it.unit).inline}
                </span>
              )}
            </div>
            <div style={{ marginTop: cq(6), fontSize: cq(10), lineHeight: 1.35, color: ink.soft }}>
              {statUnitParts(it.unit).word ? `${statUnitParts(it.unit).word} · ` : ""}
              {it.label}
            </div>
            {it.caption && (
              <div style={{ marginTop: cq(4), fontSize: cq(8.5), color: ink.faint }}>
                {it.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
