// Portrait-native asymmetric bento — one hero stat on the left, small stacked
// stats on the right. Perfect for portrait where landscape KPI grids feel too
// wide.
import { statUnitParts, statValueFitScale, STAT_VALUE_NOWRAP } from "@/lib/print-stat-unit";
import type { PrintStatsSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass, MODULE } from "../shared";

export function StatBentoPortrait({
  section,
  mode,
  accent,
}: {
  section: PrintStatsSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, 4);
  if (items.length === 0) return null;
  const [hero, ...rest] = items;

  return (
    <section aria-label={section.title ?? "Stat bento"} style={{ margin: 0 }}>
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
      <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr", gap: cq(MODULE.gridGap) }}>
        <div
          style={{
            borderRadius: cq(MODULE.radius),
            padding: cq(MODULE.padX),
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: cq(160),
            ...sectionGlass(mode, accent),
          }}
        >
          <div
            style={{
              fontSize: cq(9.5),
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: accent,
              textTransform: "uppercase",
            }}
          >
            {hero?.caption || "Headline"}
          </div>
          <div style={{ marginTop: cq(20) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: cq(6) }}>
              <span
                style={{
                  fontSize: cq(
                    72 * statValueFitScale(hero?.value, statUnitParts(hero?.unit).inline, 5),
                  ),
                  fontWeight: 700,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: ink.strong,
                  fontVariantNumeric: "tabular-nums",
                  ...STAT_VALUE_NOWRAP,
                }}
              >
                {hero?.value || "—"}
              </span>
              {statUnitParts(hero?.unit).inline && (
                <span style={{ fontSize: cq(22), fontWeight: 600, color: accent }}>
                  {statUnitParts(hero?.unit).inline}
                </span>
              )}
            </div>
            <div
              style={{
                marginTop: cq(10),
                fontSize: cq(12),
                lineHeight: 1.4,
                color: ink.soft,
                maxWidth: cq(340),
              }}
            >
              {statUnitParts(hero?.unit).word ? `${statUnitParts(hero?.unit).word} · ` : ""}
              {hero?.label}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${Math.max(rest.length, 1)}, minmax(0, 1fr))`,
            gap: cq(MODULE.gridGap),
          }}
        >
          {rest.map((it, i) => (
            <div
              key={i}
              style={{
                borderRadius: cq(MODULE.radius),
                padding: cq(MODULE.cardPad),
                ...sectionGlass(mode, accent),
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: cq(4) }}>
                <span
                  style={{
                    fontSize: cq(
                      28 * statValueFitScale(it.value, statUnitParts(it.unit).inline, 5),
                    ),
                    fontWeight: 700,
                    lineHeight: 0.95,
                    letterSpacing: "-0.03em",
                    color: ink.strong,
                    fontVariantNumeric: "tabular-nums",
                    ...STAT_VALUE_NOWRAP,
                  }}
                >
                  {it.value || "—"}
                </span>
                {statUnitParts(it.unit).inline && (
                  <span style={{ fontSize: cq(12), fontWeight: 600, color: accent }}>
                    {statUnitParts(it.unit).inline}
                  </span>
                )}
              </div>
              <div
                style={{ marginTop: cq(4), fontSize: cq(9.5), lineHeight: 1.35, color: ink.soft }}
              >
                {statUnitParts(it.unit).word ? `${statUnitParts(it.unit).word} · ` : ""}
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
