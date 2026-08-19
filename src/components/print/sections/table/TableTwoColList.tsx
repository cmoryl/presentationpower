// Two-column list table — the MSA "Departments supported" pattern.
import type { PrintTableSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";

export function TableTwoColList({
  section,
  mode,
  accent,
}: {
  section: PrintTableSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const rows = section.rows.slice(0, 16);
  return (
    <section aria-label={section.title ?? "Table"} style={{ margin: `${cq(18)} 0` }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(9) }}>
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
            <h3
              style={{
                margin: `${cq(4)} 0 0`,
                fontSize: cq(15),
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
        style={{ gridTemplateColumns: "1fr 1fr", columnGap: cq(20), rowGap: 0 }}
      >
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between"
            style={{
              gap: cq(10),
              padding: `${cq(7)} 0`,
              borderTop: `1px solid ${ink.hairline}`,
            }}
          >
            <span style={{ fontSize: cq(10), color: ink.strong, fontWeight: 600 }}>{r.label}</span>
            {r.value && (
              <span style={{ fontSize: cq(9.4), color: ink.faint, whiteSpace: "nowrap" }}>
                {r.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
