// -----------------------------------------------------------------------------
// SocialEditorialCard — "Editorial" layout for converted social cards.
// Designed for the social size, not a cut-down slide: navy ground, a solid
// blue edge bar, the figure set huge in white, a bold headline, points as
// ruled rows, and a footer with the eyebrow, caption line and lockup.
// Brand rules: approved navy / blue / white only, Geist, accent used for rules
// and bars only (never text), no decorative blobs, lockup never recoloured.
// -----------------------------------------------------------------------------

import { useLayoutEffect, useRef } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { SocialFormat } from "@/lib/social-formats";
import { socialCaption, type AdaptResult } from "@/lib/cross-format-adapt";

const INK = "#03002C";
const BLUE = "#003FC7";

export type SocialEditorialCardProps = {
  format: SocialFormat;
  brandId: string;
  result: AdaptResult;
  displayShortEdge: number;
};

function splitPoint(p: string) {
  const i = p.indexOf(" — ");
  return i < 0 ? { title: p, body: "" } : { title: p.slice(0, i), body: p.slice(i + 3) };
}

export function SocialEditorialCard({ format, brandId, result, displayShortEdge }: SocialEditorialCardProps) {
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
  const W = format.width;
  const H = format.height;
  const short = Math.min(W, H);
  const f = short / 1080;
  const scale = displayShortEdge / short;
  const tall = H / W >= 1.6;
  const pad = Math.round(96 * f);
  const c = result.content;
  const points = (c.points ?? []).slice(0, tall ? 4 : 3).map(splitPoint);
  const caption = socialCaption(c.details);
  const stat = c.stat?.value ? c.stat : undefined;
  const glyphs = Math.max(1, (stat?.value ?? "").replace(/\s/g, "").length);
  // Figure fills the width by glyph count (~0.6em per glyph), capped.
  const figurePx = Math.round(Math.min(tall ? 360 : 300, ((W - pad * 2) * 0.9) / (glyphs * 0.6)) );

  // Shrink the body block until it fits — nothing is ever cut.
  const bodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    // Grow or shrink the type until the block fills its space without overflow.
    const fits = (v: number) => {
      el.style.setProperty("--fit", v.toFixed(3));
      return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    };
    let lo = 0.5;
    let hi = 1.6;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    fits(lo);
  }, [W, H, c.headline, c.body, points.length, stat?.value]);

  const px = (n: number) => `calc(${n * f}px * var(--fit, 1))`;

  return (
    <div style={{ width: Math.round(W * scale), height: Math.round(H * scale) }} className="relative overflow-hidden">
      <div
        data-kit-asset-frame="true"
        data-social-editorial="true"
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: INK,
          color: "#FFFFFF",
          position: "relative",
          boxSizing: "border-box",
          padding: pad,
          paddingLeft: pad + Math.round(12 * f),
          display: "flex",
          flexDirection: "column",
          fontFamily: "Geist, 'Geist Variable', sans-serif",
        }}
      >
        <div aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: Math.round(14 * f), background: BLUE }} />

        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {stat ? (
            <div style={{ marginBottom: px(36) }}>
              <div style={{ fontSize: figurePx, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.04em" }}>
                {stat.value}
              </div>
              {stat.label ? (
                <div style={{ marginTop: px(18), fontSize: px(24), fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.8 }}>
                  {stat.label}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ fontSize: px(stat ? 68 : 96), fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", textWrap: "balance" as never }}>
            {c.headline}
          </div>
          {c.body ? (
            <div style={{ marginTop: px(24), fontSize: px(28), lineHeight: 1.4, opacity: 0.8, maxWidth: "92%" }}>{c.body}</div>
          ) : null}

          {points.length ? (
            <div style={{ marginTop: tall ? "auto" : px(48), paddingTop: tall ? px(48) : 0, display: "flex", flexDirection: "column", gap: px(28) }}>
              {points.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: px(28) }}>
                  <span aria-hidden style={{ flexShrink: 0, width: 56 * f, height: Math.max(2, 4 * f), background: BLUE, marginTop: px(20) }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: px(34), fontWeight: 700, lineHeight: 1.2 }}>{p.title}</div>
                    {p.body ? <div style={{ marginTop: px(6), fontSize: px(24), lineHeight: 1.4, opacity: 0.7 }}>{p.body}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div
          style={{
            flexShrink: 0,
            marginTop: Math.round(40 * f),
            paddingTop: Math.round(32 * f),
            borderTop: "1px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: Math.round(32 * f),
          }}
        >
          <div style={{ minWidth: 0 }}>
            {c.eyebrow ? (
              <div style={{ fontSize: Math.round(18 * f), fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.7 }}>{c.eyebrow}</div>
            ) : null}
            {caption ? <div style={{ marginTop: Math.round(8 * f), fontSize: Math.round(20 * f), opacity: 0.75 }}>{caption}</div> : null}
          </div>
          <div style={{ flexShrink: 0 }}>
            <BrandLockup brand={brand} color="#FFFFFF" size="sm" showMark showDivision={false} monochromeOfficialLogo />
          </div>
        </div>
      </div>
    </div>
  );
}
