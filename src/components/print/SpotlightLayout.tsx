import type { CSSProperties, ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type { SpotlightContent, PrintDensity, PrintPageSize } from "@/lib/print-assets.types";
import { AuroraLayer } from "@/components/slide/flagship";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";

// PAGE ASPECT (matches print-asset-export presets — trim only, before bleed):
//   Letter → 8.5 / 11 ≈ 0.7727
//   A4     → 8.2677 / 11.6929 ≈ 0.7071
//   Square → 1 / 1
function pageAspect(size: PrintPageSize): string {
  switch (size) {
    case "A4": return "8.2677 / 11.6929";
    case "Letter": return "8.5 / 11";
    case "Square": return "1 / 1";
  }
}

// Aurora orbs are natively a 1280×720 landscape composition. Portrait pages
// re-project the anchor points via the aspect prop on AuroraLayer so orbs
// bleed in from the correct edges instead of being cropped by the slice
// preserveAspectRatio. Numbers below feed the same math used by the case
// study canvas.
function auroraAspect(size: PrintPageSize): { w: number; h: number } {
  switch (size) {
    case "A4":     return { w: Math.round((1280 * 8.2677) / 11.6929), h: 1280 };
    case "Letter": return { w: Math.round((1280 * 8.5) / 11), h: 1280 };
    case "Square": return { w: 1280, h: 1280 };
  }
}

function densityPad(d: PrintDensity): string {
  return d === "compact" ? "p-10" : d === "airy" ? "p-16" : "p-12";
}

// -----------------------------------------------------------------------
// Free-form primitives — every element sits DIRECTLY on the aurora. No
// cards, panels, tiles, or backdrops. The only structural device is a
// hairline rule (border-t) between horizontal bands.
// -----------------------------------------------------------------------

function Hairline({ mode }: { mode: "light" | "dark" }) {
  return (
    <div
      className="h-px w-full"
      style={{
        backgroundColor: mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.14)",
      }}
    />
  );
}

function EyebrowTag({ children, mode }: { children: ReactNode; mode: "light" | "dark" }) {
  return (
    <div
      className="font-mono text-[10px] uppercase tracking-[0.28em]"
      style={{ color: mode === "dark" ? "rgba(255,255,255,0.60)" : "rgba(3,0,44,0.55)" }}
    >
      {children}
    </div>
  );
}

export function SpotlightLayout({
  content,
  brand,
  mode,
  pageSize = "Letter",
  density = "standard",
  showSafeArea = false,
  seed,
  style,
}: {
  content: SpotlightContent;
  brand: BrandMode;
  mode: "light" | "dark";
  pageSize?: PrintPageSize;
  density?: PrintDensity;
  showSafeArea?: boolean;
  seed?: string;
  style?: CSSProperties;
}) {
  const ink = mode === "dark" ? "#F5F4FF" : "#03002C";
  const inkSoft = mode === "dark" ? "rgba(245,244,255,0.72)" : "rgba(3,0,44,0.68)";
  const inkFaint = mode === "dark" ? "rgba(245,244,255,0.55)" : "rgba(3,0,44,0.50)";
  const bg = mode === "dark" ? "#0B0A2A" : "#FFFFFF";
  const auroraSeed = seed ?? `spotlight-${brand.id}-${mode}`;

  const capabilities = content.capabilities.slice(0, 5);
  const capCount = capabilities.length;
  // Portrait: 3-across if 3 or 5, 2-across if 2 or 4. Wraps naturally.
  const capCols = capCount === 2 || capCount === 4 ? 2 : 3;
  const stats = content.stats.slice(0, 4);
  const statCount = stats.length;

  return (
    <SlideModeContext.Provider value={mode}>
    <SlideAccentContext.Provider value={brand.tokens.primary}>
    <div
      className="relative w-full overflow-hidden [container-type:inline-size]"
      style={{
        aspectRatio: pageAspect(pageSize),
        backgroundColor: bg,
        color: ink,
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
        ...style,
      }}
    >
      <AuroraLayer
        seed={auroraSeed}
        brand={brand}
        intensity={0.9}
        aspect={auroraAspect(pageSize)}
      />

      <div className={`relative flex h-full flex-col ${densityPad(density)}`}>
        {/* ============================================================ */}
        {/* HEADER — brand lockup + eyebrow                                */}
        {/* ============================================================ */}
        <div className="flex items-start justify-between gap-6">
          <BrandLockup brand={brand} color={ink} size="sm" orientation="horizontal" />
          <EyebrowTag mode={mode}>
            {(content.eyebrow ?? "Spotlight")} · {pageSize}
          </EyebrowTag>
        </div>

        <div className="mt-6" />
        <Hairline mode={mode} />

        {/* ============================================================ */}
        {/* HERO — product name (display) + tagline (thin, wide)           */}
        {/* ============================================================ */}
        <div className="mt-8">
          <EyebrowTag mode={mode}>{content.eyebrow ?? "Product spotlight"}</EyebrowTag>
          <h1
            className="mt-3 font-medium leading-[0.95] tracking-[-0.035em]"
            style={{
              fontSize: "clamp(40px, 6.6cqw, 92px)",
              color: ink,
            }}
          >
            {content.productName || "Untitled product"}
          </h1>
          {content.tagline && (
            <p
              className="mt-5 max-w-[28ch] font-light leading-tight tracking-[-0.01em]"
              style={{ fontSize: "clamp(16px, 2.1cqw, 28px)", color: inkSoft }}
            >
              {content.tagline}
            </p>
          )}
          {content.summary && (
            <p
              className="mt-6 max-w-[58ch] text-[15px] leading-[1.55]"
              style={{ color: inkSoft }}
            >
              {content.summary}
            </p>
          )}
        </div>

        <div className="mt-10" />
        <Hairline mode={mode} />

        {/* ============================================================ */}
        {/* CAPABILITIES — 2 or 3 across, numbered, hairline between rows */}
        {/* ============================================================ */}
        <div className="mt-8">
          <EyebrowTag mode={mode}>Capabilities</EyebrowTag>
          <div
            className="mt-5 grid gap-x-8 gap-y-6"
            style={{ gridTemplateColumns: `repeat(${capCols}, minmax(0, 1fr))` }}
          >
            {capabilities.map((c, i) => (
              <div key={i} className="flex flex-col">
                <div
                  className="font-mono text-[10px] tracking-[0.22em]"
                  style={{ color: inkFaint }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="mt-2 font-medium leading-tight tracking-[-0.01em]"
                  style={{ fontSize: "16px", color: ink }}
                >
                  {c.heading}
                </div>
                <div
                  className="mt-2 text-[13px] leading-[1.5]"
                  style={{ color: inkSoft }}
                >
                  {c.body}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* pushes footer down when copy is short */}
        <div className="flex-1 min-h-8" />

        <Hairline mode={mode} />

        {/* ============================================================ */}
        {/* STATS — big numerals as heroes, hairline dividers, no cards    */}
        {/* ============================================================ */}
        <div
          className="mt-8 grid"
          style={{
            gridTemplateColumns: `repeat(${statCount}, minmax(0, 1fr))`,
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex flex-col px-6 first:pl-0 last:pr-0"
              style={{
                borderLeft:
                  i === 0
                    ? "none"
                    : mode === "dark"
                      ? "1px solid rgba(255,255,255,0.12)"
                      : "1px solid rgba(3,0,44,0.12)",
              }}
            >
              <div
                className="font-medium leading-none tracking-[-0.045em]"
                style={{
                  fontSize: "clamp(40px, 5.6cqw, 84px)",
                  color: ink,
                }}
              >
                {s.value}
                {s.unit && (
                  <span
                    className="ml-1 align-baseline font-light tracking-[-0.02em]"
                    style={{ fontSize: "0.42em", color: inkSoft }}
                  >
                    {s.unit}
                  </span>
                )}
              </div>
              <div
                className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: inkFaint }}
              >
                {s.label}
              </div>
              {s.caption && (
                <div className="mt-1.5 text-[11px] leading-snug" style={{ color: inkSoft }}>
                  {s.caption}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ============================================================ */}
        {/* FOOTER — expert / quote / CTA                                  */}
        {/* ============================================================ */}
        {(content.quote || content.expert || content.cta) && (
          <>
            <div className="mt-8" />
            <Hairline mode={mode} />
            <div className="mt-6 grid grid-cols-12 gap-6 items-end">
              {content.quote && (
                <div className="col-span-7">
                  <div
                    className="font-light leading-snug tracking-[-0.01em]"
                    style={{ fontSize: "clamp(13px, 1.3cqw, 17px)", color: ink }}
                  >
                    &ldquo;{content.quote.text}&rdquo;
                  </div>
                  <div
                    className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em]"
                    style={{ color: inkFaint }}
                  >
                    — {content.quote.author}
                    {content.quote.role && `, ${content.quote.role}`}
                    {content.quote.company && ` · ${content.quote.company}`}
                  </div>
                </div>
              )}
              <div
                className={content.quote ? "col-span-5" : "col-span-12"}
                style={{ textAlign: content.quote ? "right" : "left" }}
              >
                {content.expert && (
                  <div>
                    <div
                      className="font-medium tracking-[-0.005em]"
                      style={{ fontSize: "14px", color: ink }}
                    >
                      {content.expert.name}
                    </div>
                    {content.expert.role && (
                      <div className="text-[11px]" style={{ color: inkSoft }}>
                        {content.expert.role}
                      </div>
                    )}
                    {content.expert.email && (
                      <div
                        className="mt-0.5 font-mono text-[10px] tracking-[0.06em]"
                        style={{ color: inkFaint }}
                      >
                        {content.expert.email}
                      </div>
                    )}
                  </div>
                )}
                {content.cta && (
                  <div
                    className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: ink }}
                  >
                    {content.cta.label}
                    <span aria-hidden style={{ color: brand.tokens.accent || ink }}>
                      →
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {showSafeArea && (
          <div
            className="pointer-events-none absolute inset-6 rounded-2xl border border-dashed"
            style={{
              borderColor: mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(3,0,44,0.22)",
            }}
          />
        )}
      </div>
    </div>
    </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}
