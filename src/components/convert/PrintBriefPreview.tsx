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
            padding: `${0.6 * CSS_DPI}px`,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ height: 6, width: 96, background: accent }} />

          {content.eyebrow ? (
            <p
              style={{
                fontSize: t.eyebrowPx,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "#666666",
                margin: 0,
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
              maxWidth: "20ch",
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
                fontSize: caseStudy ? t.bodyPx * 1.35 : t.bodyPx * 1.55,
                lineHeight: t.bodyLeading,
                margin: 0,
                maxWidth: "62ch",
                fontWeight: 500,
              }}
            >
              {content.body}
            </p>
          ) : null}

          {content.points?.length ? (
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: caseStudy ? "1fr" : "1fr 1fr",
                gap: 12,
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
            >
              {content.points.map((p, i) => (
                <li
                  key={`${i}-${p.slice(0, 12)}`}
                  style={{
                    fontSize: t.pointPx,
                    lineHeight: t.bodyLeading,
                    paddingLeft: 12,
                    borderLeft: `3px solid ${accent}`,
                  }}
                >
                  {p}
                </li>
              ))}
            </ul>
          ) : null}

          {content.stat ? (
            <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 12 }}>
              <span
                style={{
                  fontSize: t.statPx,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: ink,
                }}
              >
                {content.stat.value}
              </span>
              <span style={{ fontSize: t.bodyPx, color: "#666666", maxWidth: "24ch" }}>
                {content.stat.label}
              </span>
            </div>
          ) : null}

          <div
            style={{
              marginTop: content.stat ? 0 : "auto",
              borderTop: `1px solid rgba(3,0,44,0.15)`,
              paddingTop: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: t.eyebrowPx,
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
