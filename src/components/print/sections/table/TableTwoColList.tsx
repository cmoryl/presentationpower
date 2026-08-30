// Two-column list table — the MSA "Departments supported" pattern.
import type { PrintTableSection } from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, safeList} from "../shared";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

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
  const icons = usePrintIcons();
  const rows = safeList(section.rows).slice(0, 16);
  return (
    <section aria-label={section.title ?? "Table"} style={{ margin: 0 }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(MODULE.headerGap) }}>
          {section.eyebrow && (
            <div
              style={{
                fontSize: cq(MODULE.eyebrow),
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
              gap: cq(12),
              padding: `${cq(MODULE.rowPadY)} 0`,
              borderTop: `1px solid ${ink.hairline}`,
            }}
          >
            <span
              className="flex items-center"
              style={{ gap: cq(7), fontSize: cq(MODULE.body), color: ink.strong, fontWeight: 600 }}
            >
              {icons ? (
                <EditableIcon
                  slot={`sec.${section.id}.row.${i}`}
                  name="check"
                  size={cq(10)}
                  color={accent}
                  strokeWidth={2.25}
                />
              ) : null}
              {r.label}
            </span>
            {r.value && (
              <span style={{ fontSize: cq(MODULE.meta), color: ink.faint, whiteSpace: "nowrap" }}>
                {r.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
