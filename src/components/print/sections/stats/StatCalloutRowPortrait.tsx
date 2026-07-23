// Portrait-native "big number pill" row — three hero stats side-by-side in
// glass surfaces. Great for the tail of a case study or eBrochure.
import type { PrintStatsSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";

export function StatCalloutRowPortrait({
  section, mode, accent,
}: {
  section: PrintStatsSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, 4);
  const cols = Math.min(items.length || 1, 4);

  return (
    <section aria-label={section.title ?? "Stat row"} style={{ margin: `${cq(18)} 0` }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(12) }}>
          {section.eyebrow && (
            <div style={{ fontSize: cq(9.5), fontWeight: 600, letterSpacing: "0.18em", color: accent, textTransform: "uppercase" }}>
              {section.eyebrow}
            </div>
          )}
          {section.title && (
            <h3 style={{ margin: `${cq(4)} 0 0`, fontSize: cq(18), fontWeight: 700, color: ink.strong, letterSpacing: "-0.015em" }}>
              {section.title}
            </h3>
          )}
        </header>
      )}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: cq(12) }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              borderRadius: cq(14),
              padding: `${cq(16)} ${cq(16)}`,
              ...sectionGlass(mode, accent),
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: cq(4) }}>
              <span style={{ fontSize: cq(38), fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.035em", color: ink.strong, fontVariantNumeric: "tabular-nums" }}>
                {it.value || "—"}
              </span>
              {it.unit && (
                <span style={{ fontSize: cq(14), fontWeight: 600, color: accent }}>{it.unit}</span>
              )}
            </div>
            <div style={{ marginTop: cq(6), fontSize: cq(10), lineHeight: 1.35, color: ink.soft }}>
              {it.label}
            </div>
            {it.caption && (
              <div style={{ marginTop: cq(4), fontSize: cq(8.5), color: ink.faint }}>{it.caption}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
