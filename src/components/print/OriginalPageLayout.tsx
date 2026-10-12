// "Original layout" — a curated piece drawn page for page like the designer's
// file: the supplied page with its live text removed is the ground, and every
// text run sits back on top as real, editable text at the designer's position,
// size, weight, colour and line spacing. Text strings live in content, so the
// editor's in-place text editing (LiveEditOverlay) works on them unchanged.
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { CSS_DPI, isOriginalLayout, type OriginalLayout } from "@/lib/print-library/original-layout";

export { isOriginalLayout };

const FAMILY: Record<string, string> = {
  geist: '"Geist", "Geist Variable", ui-sans-serif, system-ui, sans-serif',
  poppins: '"Poppins", ui-sans-serif, system-ui, sans-serif',
};

export function OriginalPageLayout({ layout, pageIndex }: { layout: OriginalLayout; pageIndex?: number }) {
  const w = layout.widthIn * CSS_DPI;
  const h = layout.heightIn * CSS_DPI;
  const pages = typeof pageIndex === "number" ? layout.pages.slice(pageIndex, pageIndex + 1) : layout.pages;
  const gap = 24;
  const total = pages.length * h + (pages.length - 1) * gap;
  // Pages are laid out at true size (96 px/in) and scaled to the column, so
  // type, positions and exports keep the file's real proportions.
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => {
      const cw = el.clientWidth;
      if (cw > 0) setScale(Math.round((cw / w) * 1000) / 1000);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={outer} style={{ width: "100%", height: total * scale, overflow: "hidden" }}>
    <div data-original-layout style={{ display: "grid", gap, width: w, transform: `scale(${scale})`, transformOrigin: "top left" }}>
      {pages.map((p, pi) => (
        <div
          key={pi}
          data-print-page
          style={{ position: "relative", width: w, height: h, overflow: "hidden", background: "#FFFFFF" }}
        >
          <img
            src={p.ground}
            alt=""
            draggable={false}
            crossOrigin="anonymous"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
          />
          {p.texts.map((t) =>
            t.hidden ? null : (
              <div
                key={t.id}
                data-original-text={t.id}
                style={
                  {
                    position: "absolute",
                    left: t.x * CSS_DPI,
                    top: t.y * CSS_DPI,
                    width: t.w * CSS_DPI,
                    fontFamily: FAMILY[t.family] ?? FAMILY.geist,
                    fontSize: (t.size * CSS_DPI) / 72,
                    fontWeight: t.weight,
                    color: t.color,
                    lineHeight: t.lead,
                    textAlign: t.align,
                    whiteSpace: "pre-wrap",
                    letterSpacing: 0,
                    margin: 0,
                  } as CSSProperties
                }
              >
                {t.text}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
    </div>
  );
}
