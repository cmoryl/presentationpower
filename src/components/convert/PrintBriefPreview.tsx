// -----------------------------------------------------------------------------
// PrintBriefPreview — the print side of the cross-format adapter.
//
// Renders an adapted payload as a 1-page A4 layout in two structures:
//  · print-brief  — eyebrow / headline / standfirst / body / points / figure
//  · case-study   — eyebrow / headline / photo / narrative / figure
//
// Backgrounds stay on approved photography, solid brand tokens and curated
// image assets: the page ground is a brand token, and photography only appears
// where the payload actually carries a photograph.
// -----------------------------------------------------------------------------

import { forwardRef } from "react";
import type { AdaptResult } from "@/lib/cross-format-adapt";
import { CSS_DPI } from "@/lib/print-proof-export";
import { BRAND_MODES } from "@/lib/taxonomy";

export type PrintBriefPreviewProps = {
  result: AdaptResult;
  brandId: string;
  /** Display width in CSS px — the page renders at true trim and scales down. */
  displayWidth?: number;
};

export const PrintBriefPreview = forwardRef<HTMLDivElement, PrintBriefPreviewProps>(
  function PrintBriefPreview({ result, brandId, displayWidth = 420 }, ref) {
    const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
    const accent = brand.tokens.accent;
    const ink = "#03002C";
    const trim = result.target.trimIn ?? { width: 8.268, height: 11.693 };
    const pageW = Math.round(trim.width * CSS_DPI);
    const pageH = Math.round(trim.height * CSS_DPI);
    const scale = displayWidth / pageW;
    const t = result.type;
    const { content } = result;
    const caseStudy = result.target.id === "case-study";
    const layout = result.target.layout ?? "sheet";
    const k = Math.min(trim.width, trim.height) / 8.268;
    const u = (n: number) => Math.max(1, Math.round(n * k));
    const banner = layout === "banner";
    const big = layout === "poster" || banner;
    // Tall banners read from 2-3 m away: body/points/stat scale up and the
    // middle zone stretches so copy fills the full drop, not just the top.
    const bb = banner ? 2.3 : 1;
    const land = layout === "landscape";
    const pad = Math.round(Math.max(0.25, 0.6 * k) * CSS_DPI);
    const L = land ? { gridColumn: 1 } : {};
    const photo = content.media?.kind === "photo" ? content.media.url : null;
    const groundToken = content.media?.kind === "token" ? content.media.token : "#FFFFFF";

    return (
      <div
        style={{ width: displayWidth, height: Math.round(pageH * scale) }}
        className="relative overflow-hidden"
      >
        <div
          ref={ref}
          data-print-brief-page="true"
          style={{
            width: pageW,
            height: pageH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: groundToken,
            color: ink,
            fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif",
            padding: pad,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: u(18),
            ...(layout === "landscape"
              ? { display: "grid", gridTemplateColumns: "1.15fr 1fr", gridAutoRows: "min-content", gridAutoFlow: "row dense", columnGap: u(28), alignContent: "start" }
              : {}),
            ...(layout === "poster" ? { justifyContent: "center" } : {}),
            ...(banner ? { gap: u(34) } : {}),
          }}
        >
          <div style={{ height: u(6), width: u(96), background: accent, gridColumn: layout === "landscape" ? "1 / -1" : undefined }} />

          {content.eyebrow ? (
            <p
              style={{
                fontSize: t.eyebrowPx,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "#666666",
                margin: 0,
                ...L,
              }}
            >
              {content.eyebrow}
            </p>
          ) : null}

          <h1
            style={{
              fontSize: t.headlinePx,
              lineHeight: t.headlineLeading,
              letterSpacing: "-0.02em",
              fontWeight: 700,
              margin: 0,
              ...L,
              maxWidth: big ? "14ch" : "20ch",
            }}
          >
            {content.headline}
          </h1>

          {photo ? (
            <img
              src={photo}
              alt={content.media?.kind === "photo" ? (content.media.alt ?? "") : ""}
              style={{
                width: "100%",
                height: caseStudy ? 250 : 190,
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : null}

          {content.body ? (
            <p
              style={{
                fontSize: caseStudy ? t.bodyPx * 1.35 : t.bodyPx * 1.55 * bb,
                lineHeight: t.bodyLeading,
                margin: 0,
                maxWidth: "62ch",
                fontWeight: 500,
                ...L,
              }}
            >
              {content.body}
            </p>
          ) : null}

          {content.points?.length ? (
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: caseStudy || layout !== "sheet" || k < 0.8 ? "1fr" : "1fr 1fr",
                gap: u(banner ? 28 : 12),
                margin: 0,
                ...(banner ? { flex: 1, alignContent: "space-evenly" } : {}),
                padding: 0,
                listStyle: "none",
                ...(land ? { gridColumn: 2, gridRow: "2 / span 3", alignContent: "start" } : {}),
              }}
            >
              {content.points.map((p, i) => (
                <li
                  key={`${i}-${p.slice(0, 12)}`}
                  style={{
                    fontSize: t.pointPx * bb,
                    lineHeight: t.bodyLeading,
                    paddingLeft: u(banner ? 20 : 12),
                    borderLeft: `${u(banner ? 6 : 3)}px solid ${accent}`,
                    fontWeight: banner ? 500 : undefined,
                  }}
                >
                  {p}
                </li>
              ))}
            </ul>
          ) : null}

          {content.stat ? (
            <div style={{ marginTop: banner ? 0 : big ? u(24) : "auto", ...(banner ? { flexDirection: "column" as const, alignItems: "flex-start" as const, borderTop: `${u(3)}px solid ${accent}`, paddingTop: u(24) } : {}), display: "flex", alignItems: "baseline", gap: u(12), ...(land ? { gridColumn: 2 } : {}) }}>
              <span
                style={{
                  fontSize: t.statPx * (banner ? 1.6 : 1),
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: ink,
                }}
              >
                {content.stat.value}
              </span>
              <span style={{ fontSize: t.bodyPx * (banner ? 2 : 1), color: "#666666", maxWidth: "24ch" }}>
                {content.stat.label}
              </span>
            </div>
          ) : null}

          <div
            style={{
              marginTop: big ? "auto" : content.stat ? 0 : "auto",
              ...(land ? { position: "absolute" as const, left: pad, right: pad, bottom: pad } : {}),
              borderTop: `${u(1)}px solid rgba(3,0,44,0.15)`,
              paddingTop: u(10),
              flexWrap: "wrap",
              display: "flex",
              justifyContent: "space-between",
              gap: u(16),
              fontSize: t.eyebrowPx * (banner ? 1.8 : 1),
              color: "#666666",
            }}
          >
            <span>{brand.name}</span>
            {content.footnote ? <span style={{ maxWidth: "48ch" }}>{content.footnote}</span> : null}
            {content.cta ? <span style={{ color: ink, fontWeight: 600 }}>{content.cta}</span> : null}
          </div>
        </div>
      </div>
    );
  },
);
