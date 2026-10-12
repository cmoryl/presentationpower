// "Original layout" — a curated piece drawn page for page like the designer's
// file: the supplied page with its live text removed is the ground, and every
// text run sits back on top as real, editable text at the designer's position,
// size, weight, colour and line spacing. Text strings live in content, so the
// editor's in-place text editing (LiveEditOverlay) works on them unchanged.
import type { CSSProperties } from "react";

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
  return (
    <div data-original-layout style={{ display: "grid", gap: 24 }}>
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
  );
}
