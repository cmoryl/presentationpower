// Scale rail — the MSA right-hand rail: big values over small labels, stacked
// with hairlines. Reads as "languages / linguists / cities / studies".
import type { PrintTableSection } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";

export function TableScaleRail({
  section,
  mode,
  accent,
}: {
  section: PrintTableSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const rows = section.rows.slice(0, 4);
  return (
    <section aria-label={section.title ?? "Scale"} style={{ margin: `${cq(18)} 0` }}>
      <div
        style={{
          borderRadius: cq(14),
          padding: `${cq(14)} ${cq(18)}`,
          ...sectionGlass(mode, accent),
        }}
      >
        {(section.eyebrow || section.title) && (
          <div style={{ marginBottom: cq(8) }}>
            {section.eyebrow && (
              <div
                style={{
                  fontSize: cq(9),
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: accent,
                  textTransform: "uppercase",
                }}
              >
                {section.eyebrow}
              </div>
            )}
            {section.title && (
              <div
                style={{ marginTop: cq(3), fontSize: cq(14), fontWeight: 700, color: ink.strong }}
              >
                {section.title}
              </div>
            )}
          </div>
        )}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, rows.length)}, minmax(0, 1fr))`,
            gap: cq(14),
          }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                paddingLeft: i === 0 ? 0 : cq(12),
                borderLeft: i === 0 ? "none" : `1px solid ${ink.hairline}`,
              }}
            >
              <div
                style={{
                  fontSize: cq(24),
                  fontWeight: 800,
                  lineHeight: 1,
                  color: accent,
                  letterSpacing: "-0.03em",
                }}
              >
                {r.value ?? "—"}
              </div>
              <div
                style={{
                  marginTop: cq(5),
                  fontSize: cq(9),
                  lineHeight: 1.35,
                  color: ink.soft,
                  fontWeight: 600,
                }}
              >
                {r.label}
              </div>
              {r.caption && (
                <div style={{ marginTop: cq(2), fontSize: cq(8.2), color: ink.faint }}>
                  {r.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
