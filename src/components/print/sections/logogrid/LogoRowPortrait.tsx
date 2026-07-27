// Single-row logo strip — 4-6 logos with dividers, no card.
import type { PrintLogoGridSection, PrintLogoItem } from "@/lib/print-assets.types";
import { cq, sectionInk } from "../shared";
import { useResolvedLogoUrl } from "@/lib/slide-media-refresh";

function Cell({ item, mode }: { item: PrintLogoItem; mode: "light" | "dark" }) {
  const url = useResolvedLogoUrl(item.path, item.url);
  const ink = sectionInk(mode);
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", height: cq(46) }}
    >
      {url ? (
        <img
          src={url}
          alt={item.name}
          style={{
            maxHeight: "70%",
            maxWidth: "88%",
            objectFit: "contain",
            filter: mode === "dark" ? "brightness(0) invert(1)" : undefined,
            opacity: 0.85,
          }}
        />
      ) : (
        <span style={{ fontSize: cq(10), color: ink.soft, fontWeight: 600 }}>{item.name}</span>
      )}
    </div>
  );
}

export function LogoRowPortrait({
  section,
  mode,
  accent,
}: {
  section: PrintLogoGridSection;
  mode: "light" | "dark";
  accent: string;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section aria-label={section.title ?? "Client logos"} style={{ margin: `${cq(16)} 0` }}>
      {(section.eyebrow || section.title) && (
        <div className="flex items-center" style={{ gap: cq(14), marginBottom: cq(10) }}>
          <div style={{ flex: 1, height: 1, background: ink.hairline }} />
          <div
            style={{
              fontSize: cq(9.5),
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: accent,
              textTransform: "uppercase",
            }}
          >
            {section.title || section.eyebrow}
          </div>
          <div style={{ flex: 1, height: 1, background: ink.hairline }} />
        </div>
      )}
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 0 }}
      >
        {items.map((it, i) => (
          <div key={i} style={{ borderLeft: i === 0 ? "none" : `1px solid ${ink.hairline}` }}>
            <Cell item={it} mode={mode} />
          </div>
        ))}
      </div>
    </section>
  );
}
