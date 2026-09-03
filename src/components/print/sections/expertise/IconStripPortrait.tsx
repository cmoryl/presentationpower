// Horizontal expertise icon strip — port of the AdaptorBrief "We Know How".
import type {
  PrintExpertiseSection,
  PrintExpertiseIconSize,
  PrintExpertiseLayout,
} from "@/lib/print-assets.types";
import { cq, sectionInk, MODULE, safeList } from "../shared";
import { Icon, ICON_PATHS, type IconName, clampLines } from "@/components/print/print-primitives";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import { usePrintIcons } from "@/components/print/print-doc-mode";

const FALLBACK: IconName[] = ["sparkles", "globe-alt", "target", "bolt", "learn", "check"];

const SIZE_TOKENS: Record<PrintExpertiseIconSize, { icon: number; circle: number; label: number }> =
  {
    sm: { icon: 13, circle: 26, label: 8.5 },
    md: { icon: 17, circle: 34, label: 9.5 },
    lg: { icon: 22, circle: 44, label: 10.5 },
    xl: { icon: 28, circle: 56, label: 11.5 },
  };

function resolveIconName(it: PrintExpertiseSection["items"][number], idx: number): IconName {
  const name = it.icon as IconName;
  return name && ICON_PATHS[name] ? name : FALLBACK[idx % FALLBACK.length]!;
}

function Header({
  section,
  mode,
  accent,
}: {
  section: PrintExpertiseSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const text = section.title || section.eyebrow || "We know how";
  return (
    <div
      className="flex items-center"
      style={{ gap: cq(MODULE.gridGap), marginBottom: cq(MODULE.headerGap) }}
    >
      <div style={{ flex: 1, height: 1, background: ink.hairline }} />
      <div
        style={{
          fontSize: cq(MODULE.eyebrow),
          fontWeight: 700,
          letterSpacing: MODULE.eyebrowTrack,
          color: accent,
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
      <div style={{ flex: 1, height: 1, background: ink.hairline }} />
    </div>
  );
}

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
  const icons = usePrintIcons();
  const items = safeList(section.items).slice(0, 8);
  const layout: PrintExpertiseLayout = section.layout ?? "horizontal";
  const sizeKey: PrintExpertiseIconSize = section.iconSize ?? "md";
  const size = SIZE_TOKENS[sizeKey];

  if (items.length === 0) return null;

  const hairline = `1px solid ${mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.12)"}`;

  const iconCircle = (name: IconName, slot: string) => (
    <div
      className="flex items-center justify-center"
      style={{
        width: cq(size.circle),
        height: cq(size.circle),
        borderRadius: "50%",
        background: `color-mix(in srgb, ${accent} 22%, ${mode === "dark" ? "rgba(6,4,32,0.5)" : "#ffffff"})`,
        border: `1px solid color-mix(in srgb, ${accent} 30%, ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"})`,
      }}
    >
      {icons ? (
        <EditableIcon
          slot={slot}
          name={name}
          size={cq(size.icon)}
          color={accent}
          strokeWidth={1.75}
        />
      ) : (
        <div style={{ width: cq(size.icon * 0.7), height: 2, background: accent }} />
      )}
    </div>
  );

  // 1. HORIZONTAL — classic row of circle icons above labels.
  if (layout === "horizontal") {
    return (
      <section aria-label={section.title ?? "We know how"} style={{ margin: 0 }}>
        <Header section={section} mode={mode} accent={accent} />
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
            gap: cq(MODULE.gridGap),
            textAlign: "center",
          }}
        >
          {items.map((it, i) => {
            const name = resolveIconName(it, i);
            return (
              <div key={i} className="flex flex-col items-center" style={{ gap: cq(8) }}>
                {iconCircle(name, `sec.${section.id}.item.${i}`)}
                <div
                  style={{
                    fontSize: cq(size.label),
                    lineHeight: 1.4,
                    color: ink.soft,
                    ...clampLines(3),
                  }}
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

  // 2. VERTICAL-LIST — icon left, label right, stacked with hairlines.
  if (layout === "vertical-list") {
    return (
      <section aria-label={section.title ?? "We know how"} style={{ margin: 0 }}>
        <Header section={section} mode={mode} accent={accent} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((it, i) => {
            const name = resolveIconName(it, i);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: cq(12),
                  padding: `${cq(10)} 0`,
                  borderTop: i === 0 ? "none" : hairline,
                }}
              >
                {iconCircle(name, `sec.${section.id}.item.${i}`)}
                <span
                  style={{
                    fontSize: cq(size.label + 1),
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: ink.strong,
                    flex: 1,
                  }}
                >
                  {it.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // 3. GRID-CARDS — each item in a rounded card with icon + label.
  if (layout === "grid-cards") {
    const cols = items.length <= 2 ? items.length : items.length <= 4 ? 2 : 3;
    return (
      <section aria-label={section.title ?? "We know how"} style={{ margin: 0 }}>
        <Header section={section} mode={mode} accent={accent} />
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: cq(MODULE.gridGap),
          }}
        >
          {items.map((it, i) => {
            const name = resolveIconName(it, i);
            return (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{
                  gap: cq(8),
                  padding: `${cq(12)} ${cq(10)}`,
                  borderRadius: cq(10),
                  background: `color-mix(in srgb, ${accent} 8%, ${mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(3,0,44,0.03)"})`,
                  border: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(3,0,44,0.08)"}`,
                }}
              >
                {iconCircle(name, `sec.${section.id}.item.${i}`)}
                <div
                  style={{
                    fontSize: cq(size.label),
                    lineHeight: 1.35,
                    color: ink.strong,
                    textAlign: "center",
                    ...clampLines(3),
                  }}
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

  // 4. MINIMAL-ROW — compact horizontal, labels directly under icons, smaller gaps.
  if (layout === "minimal-row") {
    return (
      <section aria-label={section.title ?? "We know how"} style={{ margin: 0 }}>
        <Header section={section} mode={mode} accent={accent} />
        <div
          className="flex"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: cq(8),
          }}
        >
          {items.map((it, i) => {
            const name = resolveIconName(it, i);
            return (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ flex: "1 1 0", gap: cq(5), textAlign: "center" }}
              >
                {iconCircle(name, `sec.${section.id}.item.${i}`)}
                <div
                  style={{
                    fontSize: cq(size.label - 0.5),
                    lineHeight: 1.3,
                    color: ink.soft,
                    ...clampLines(2),
                  }}
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

  // 5. SPLIT-PAIRS — 2-column layout with icon+label pairs.
  if (layout === "split-pairs") {
    return (
      <section aria-label={section.title ?? "We know how"} style={{ margin: 0 }}>
        <Header section={section} mode={mode} accent={accent} />
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: `${cq(10)} ${cq(MODULE.gridGap)}`,
          }}
        >
          {items.map((it, i) => {
            const name = resolveIconName(it, i);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: cq(10),
                }}
              >
                {iconCircle(name, `sec.${section.id}.item.${i}`)}
                <span
                  style={{
                    fontSize: cq(size.label + 0.5),
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: ink.strong,
                  }}
                >
                  {it.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // 6. LARGE-CENTER — larger centered icons with labels below, more dramatic spacing.
  return (
    <section aria-label={section.title ?? "We know how"} style={{ margin: 0 }}>
      <Header section={section} mode={mode} accent={accent} />
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`,
          gap: `${cq(MODULE.gridGap * 1.5)} ${cq(MODULE.gridGap)}`,
          textAlign: "center",
        }}
      >
        {items.map((it, i) => {
          const name = resolveIconName(it, i);
          return (
            <div key={i} className="flex flex-col items-center" style={{ gap: cq(10) }}>
              {iconCircle(name, `sec.${section.id}.item.${i}`)}
              <div
                style={{
                  fontSize: cq(size.label + 1),
                  fontWeight: 600,
                  lineHeight: 1.35,
                  color: ink.strong,
                  ...clampLines(3),
                }}
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
