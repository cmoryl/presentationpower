// Portrait-native asymmetric bento — one hero stat on the left, small stacked
// stats on the right. Perfect for portrait where landscape KPI grids feel too
// wide.
import type { PrintStatsSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";

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
    <section aria-label={section.title ?? "Stat bento"} style={{ margin: `${cq(18)} 0` }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(12) }}>
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
      <div className="grid" style={{ gridTemplateColumns: "1.35fr 1fr", gap: cq(12) }}>
        <div
          style={{
            borderRadius: cq(16),
            padding: cq(20),
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
                  fontSize: cq(72),
                  fontWeight: 700,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: ink.strong,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {hero?.value || "—"}
              </span>
              {hero?.unit && (
                <span style={{ fontSize: cq(22), fontWeight: 600, color: accent }}>
                  {hero.unit}
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
              {hero?.label}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${Math.max(rest.length, 1)}, minmax(0, 1fr))`,
            gap: cq(12),
          }}
        >
          {rest.map((it, i) => (
            <div
              key={i}
              style={{
                borderRadius: cq(14),
                padding: `${cq(14)} ${cq(16)}`,
                ...sectionGlass(mode, accent),
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: cq(4) }}>
                <span
                  style={{
                    fontSize: cq(28),
                    fontWeight: 700,
                    lineHeight: 0.95,
                    letterSpacing: "-0.03em",
                    color: ink.strong,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {it.value || "—"}
                </span>
                {it.unit && (
                  <span style={{ fontSize: cq(12), fontWeight: 600, color: accent }}>
                    {it.unit}
                  </span>
                )}
              </div>
              <div
                style={{ marginTop: cq(4), fontSize: cq(9.5), lineHeight: 1.35, color: ink.soft }}
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
