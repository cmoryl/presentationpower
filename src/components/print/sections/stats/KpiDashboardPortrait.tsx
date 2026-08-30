// Portrait-native port of MV-KPI-DASHBOARD. Two-column grid with divider
// hairlines, big value + label + optional delta. Sized for an 816px canvas.
import { statUnitParts, statValueFitScale, STAT_VALUE_NOWRAP } from "@/lib/print-stat-unit";
import type { PrintStatsSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, safeList} from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

export function KpiDashboardPortrait({
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
  const items = safeList(section.items).slice(0, 6);
  if (items.length === 0) return null;
  const cols = items.length <= 2 ? items.length : items.length === 3 ? 3 : 2;

  return (
    <section aria-label={section.title ?? "KPI dashboard"} style={{ margin: 0 }}>
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
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          columnGap: cq(MODULE.gridGap * 1.5),
          rowGap: cq(MODULE.gridGap * 1.25),
        }}
      >
        {items.map((it, i) => {
          const isFirstInRow = i % cols === 0;
          const trendUp = it.trend !== "down";
          return (
            <div
              key={i}
              style={{
                paddingLeft: isFirstInRow ? 0 : cq(20),
                borderLeft: isFirstInRow ? "none" : `1px solid ${ink.hairline}`,
              }}
            >
              {icons ? (
                <div style={{ marginBottom: cq(6) }}>
                  <EditableIcon
                    slot={`sec.${section.id}.item.${i}`}
                    name={trendUp ? "arrow-trending-up" : "chart-bar"}
                    size={cq(16)}
                    color={accent}
                    strokeWidth={1.75}
                    label={trendUp ? "Trending up" : "Trending down"}
                  />
                </div>
              ) : null}
              <div style={{ display: "flex", alignItems: "baseline", gap: cq(4) }}>
                <span
                  style={{
                    fontSize: cq(
                      46 * statValueFitScale(it.value, statUnitParts(it.unit).inline, 7),
                    ),
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
                  <span
                    style={{
                      fontSize: cq(16),
                      fontWeight: 600,
                      color: accent,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {statUnitParts(it.unit).inline}
                  </span>
                )}
              </div>
              <div
                style={{
                  marginTop: cq(6),
                  fontSize: cq(10.5),
                  lineHeight: 1.35,
                  color: ink.soft,
                  maxWidth: cq(220),
                }}
              >
                {statUnitParts(it.unit).word ? `${statUnitParts(it.unit).word} · ` : ""}
                {it.label}
              </div>
              {it.delta && (
                <div
                  style={{
                    marginTop: cq(4),
                    fontSize: cq(9),
                    fontWeight: 600,
                    color: accent,
                    letterSpacing: "0.02em",
                  }}
                >
                  {trendUp ? "▲" : "▼"}{" "}
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{it.delta}</span>
                  <span style={{ color: ink.faint, marginLeft: cq(4) }}>vs. baseline</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
