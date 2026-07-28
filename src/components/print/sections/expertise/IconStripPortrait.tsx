// Horizontal expertise icon strip — port of the AdaptorBrief "We Know How".
import type { PrintExpertiseSection } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { Icon, ICON_PATHS, type IconName, clampLines } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";

const FALLBACK: IconName[] = ["sparkles", "globe-alt", "target", "bolt", "learn", "check"];

export function IconStripPortrait({
  section,
  mode,
  accent,
}: {
  section: PrintExpertiseSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section aria-label={section.title ?? "We know how"} style={{ margin: `${cq(20)} 0` }}>
      <div className="flex items-center" style={{ gap: cq(14), marginBottom: cq(18) }}>
        <div style={{ flex: 1, height: 1, background: ink.hairline }} />
        <div
          style={{
            fontSize: cq(10),
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: accent,
            textTransform: "uppercase",
          }}
        >
          {section.title || section.eyebrow || "We know how"}
        </div>
        <div style={{ flex: 1, height: 1, background: ink.hairline }} />
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          gap: cq(12),
          textAlign: "center",
        }}
      >
        {items.map((it, i) => {
          const name =
            (it.icon as IconName) && ICON_PATHS[it.icon as IconName]
              ? (it.icon as IconName)
              : FALLBACK[i % FALLBACK.length]!;
          return (
            <div key={i} className="flex flex-col items-center" style={{ gap: cq(8) }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: cq(34),
                  height: cq(34),
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${accent} 22%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
                  border: `1px solid color-mix(in srgb, ${accent} 30%, ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"})`,
                }}
              >
                <EditableIcon slot={`sec.${section.id}.item.${i}`} name={name} size={cq(17)} color={accent} strokeWidth={1.75} />
              </div>
              <div
                style={{ fontSize: cq(9.5), lineHeight: 1.4, color: ink.soft, ...clampLines(3) }}
              >
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
