// Tiny visual reference for a London signage panel.
//
// Renders the real panel artwork (same builder the .svg/.ai masters use) as a
// small inline image so the schedule reads visually. Generation is deferred
// until the row scrolls into view — the full kit is 105 panels and each master
// embeds the EPS lockup geometry.

import { useEffect, useMemo, useRef, useState } from "react";

import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { londonBoothArtworkUrl, type LondonPanel } from "@/lib/next-london-signage";

export interface LondonPanelThumbProps {
  panel: LondonPanel;
  /** Longest edge of the thumbnail in px. */
  size?: number;
  className?: string;
  /** When provided the tile becomes a button that opens a larger preview. */
  onOpen?: (panel: LondonPanel) => void;
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function LondonPanelThumb({ panel, size = 72, className, onOpen }: LondonPanelThumbProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const landscape = panel.bleedW >= panel.bleedH;
  const w = landscape ? size : Math.max(18, Math.round((size * panel.bleedW) / panel.bleedH));
  const h = landscape ? Math.max(18, Math.round((size * panel.bleedH) / panel.bleedW)) : size;

  // Keyed on everything that changes the artwork, so an edit repaints the tile.
  const key = `${panel.style}|${panel.trimW}|${panel.trimH}|${panel.bleedEdge}|${panel.name}|${panel.ground}`;
  // Vendor booth panels show the supplied artwork proof itself: an <img> with a
  // data-URL SVG cannot load external references, so the CDN proof is painted
  // directly rather than through the generated master.
  const boothArt = londonBoothArtworkUrl(panel.id);

  const src = useMemo(() => {
    if (!visible) return null;
    if (boothArt) return boothArt;
    try {
      return toDataUrl(buildLondonPanelSvg(panel));
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key, boothArt]);

  const art = src ? (
    <img
      src={src}
      alt={`Artwork preview for ${panel.name}`}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain"
    />
  ) : null;

  const box = `overflow-hidden rounded-md border border-black/10 bg-[#03002C] ${className ?? ""}`;

  if (onOpen) {
    return (
      <div ref={holder} style={{ width: w, height: h }}>
        <button
          type="button"
          onClick={() => onOpen(panel)}
          title={`View ${panel.name} larger`}
          aria-label={`View a larger preview of ${panel.name}`}
          className={`${box} block h-full w-full cursor-zoom-in transition hover:border-[#003FC7]/60 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]`}
        >
          {art}
        </button>
      </div>
    );
  }

  return (
    <div ref={holder} className={box} style={{ width: w, height: h }}>
      {art}
    </div>
  );
}
