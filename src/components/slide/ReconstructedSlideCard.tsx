// Reconstructed (NOT pixel-perfect) preview of an imported PPTX slide.
// Renders a 16:9 card using the deck's real theme colors + fonts, and lays
// out the extracted title, bullets, and embedded images as an honest visual
// approximation of the original slide.

import type { CSSProperties } from "react";

export type ReconstructedSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  images: string[]; // base64 data URLs
};

export type ReconstructedTheme = {
  accent1?: string;
  accent2?: string;
  dark1?: string;
  headingFont?: string;
  bodyFont?: string;
};

function contrastOn(hex?: string): string {
  if (!hex) return "#0B1220";
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#0B1220";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.55 ? "#0B1220" : "#FFFFFF";
}

export function ReconstructedSlideCard({
  slide,
  theme,
  className = "",
}: {
  slide: ReconstructedSlide;
  theme: ReconstructedTheme;
  className?: string;
}) {
  const bg = theme.dark1 ?? "#FFFFFF";
  const accent = theme.accent1 ?? "#003FC7";
  const accent2 = theme.accent2 ?? "#A1FBF9";
  const fg = contrastOn(bg);
  const muted = fg === "#FFFFFF" ? "rgba(255,255,255,0.75)" : "rgba(11,18,32,0.7)";
  const rule = fg === "#FFFFFF" ? "rgba(255,255,255,0.15)" : "rgba(11,18,32,0.1)";

  const heading: CSSProperties = {
    fontFamily: theme.headingFont ? `${theme.headingFont}, ui-sans-serif, system-ui` : undefined,
    color: fg,
  };
  const body: CSSProperties = {
    fontFamily: theme.bodyFont ? `${theme.bodyFont}, ui-sans-serif, system-ui` : undefined,
    color: muted,
  };

  const imgs = slide.images.slice(0, 4);
  const hasHero = imgs.length > 0;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg ring-1 ring-black/10 ${className}`}
      style={{ aspectRatio: "16 / 9", background: bg }}
    >
      {/* accent bar */}
      <div className="absolute left-0 top-0 h-full w-[6px]" style={{ background: accent }} />

      {/* index chip */}
      <div
        className="absolute right-3 top-3 rounded-full px-2 py-0.5 font-mono text-[10px]"
        style={{ background: accent2, color: contrastOn(accent2) }}
      >
        #{slide.index + 1}
      </div>

      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: hasHero ? "1.15fr 1fr" : "1fr" }}>
        {/* text column */}
        <div className="flex min-w-0 flex-col justify-center gap-3 px-6 py-5">
          <h3
            className="line-clamp-3 text-[18px] font-semibold leading-tight tracking-tight"
            style={heading}
          >
            {slide.title}
          </h3>
          {slide.bullets.length > 0 && (
            <ul className="space-y-1" style={body}>
              {slide.bullets.slice(0, 5).map((b, i) => (
                <li key={i} className="flex gap-2 text-[11px] leading-snug">
                  <span
                    className="mt-[6px] inline-block h-1 w-1 shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  <span className="line-clamp-2">{b}</span>
                </li>
              ))}
              {slide.bullets.length > 5 && (
                <li className="text-[10px] italic" style={{ color: muted }}>
                  + {slide.bullets.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>

        {/* image column */}
        {hasHero && (
          <div
            className="grid gap-1 border-l p-2"
            style={{
              borderColor: rule,
              gridTemplateColumns: imgs.length === 1 ? "1fr" : "1fr 1fr",
              gridTemplateRows: imgs.length <= 2 ? "1fr" : "1fr 1fr",
            }}
          >
            {imgs.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full rounded object-cover"
                style={{ background: rule }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
