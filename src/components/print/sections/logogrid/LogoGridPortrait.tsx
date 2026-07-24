// Client logo grid — 3-col portrait grid with glass tiles.
import type { PrintLogoGridSection, PrintLogoItem } from "@/lib/print-assets.types";
import { cq, sectionInk, sectionGlass } from "../shared";
import { useResolvedLogoUrl } from "@/lib/slide-media-refresh";

function LogoTile({ item, mode, accent }: { item: PrintLogoItem; mode: "light" | "dark"; accent: string }) {
  const url = useResolvedLogoUrl(item.path, item.url);
  const ink = sectionInk(mode);
  return (
    <div
      style={{
        aspectRatio: "3 / 2",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: cq(10),
        padding: cq(10),
        ...sectionGlass(mode, accent),
      }}
    >
      {url ? (
        <img src={url} alt={item.name} style={{ maxWidth: "80%", maxHeight: "70%", objectFit: "contain", filter: mode === "dark" ? "brightness(0) invert(1)" : undefined, opacity: 0.9 }} />
      ) : (
        <span style={{ fontSize: cq(10), color: ink.soft, fontWeight: 600 }}>{item.name}</span>
      )}
    </div>
  );
}

export function LogoGridPortrait({
  section, mode, accent, cols = 3,
}: {
  section: PrintLogoGridSection;
  mode: "light" | "dark";
  accent: string;
  cols?: number;
}) {
  const ink = sectionInk(mode);
  const items = section.items.slice(0, cols * 3);
  return (
    <section aria-label={section.title ?? "Client logos"} style={{ margin: `${cq(18)} 0` }}>
      {(section.eyebrow || section.title) && (
        <header style={{ marginBottom: cq(12) }}>
          {section.eyebrow && <div style={{ fontSize: cq(9.5), fontWeight: 600, letterSpacing: "0.18em", color: accent, textTransform: "uppercase" }}>{section.eyebrow}</div>}
          {section.title && <h3 style={{ margin: `${cq(4)} 0 0`, fontSize: cq(16), fontWeight: 700, color: ink.strong, letterSpacing: "-0.015em" }}>{section.title}</h3>}
        </header>
      )}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: cq(10) }}>
        {items.map((it, i) => <LogoTile key={i} item={it} mode={mode} accent={accent} />)}
      </div>
    </section>
  );
}
