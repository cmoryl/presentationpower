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

import { AdaptIcon, iconFor } from "./AdaptIcon";
import { Fragment, forwardRef, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { AdaptResult } from "@/lib/cross-format-adapt";
import { CSS_DPI } from "@/lib/print-proof-export";
import { BRAND_MODES } from "@/lib/taxonomy";
import { AdaptChartBlock } from "./AdaptChartBlock";
import { MediaTile } from "@/components/slide/module-primitives";

export type PrintBriefPreviewProps = {
  result: AdaptResult;
  brandId: string;
  /** Display width in CSS px — the page renders at true trim and scales down. */
  displayWidth?: number;
  /** Approved light template background (CSS) painted behind the page. */
  ground?: string;
};

export const PrintBriefPreview = forwardRef<HTMLDivElement, PrintBriefPreviewProps>(
  function PrintBriefPreview({ result, brandId, displayWidth = 420, ground }, ref) {
    const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
    const accent = brand.tokens.accent;
    const ink = "#03002C";
    const trim = result.target.trimIn ?? { width: 8.268, height: 11.693 };
    const pageW = Math.round(trim.width * CSS_DPI);
    const pageH = Math.round(trim.height * CSS_DPI);
    const scale = displayWidth / pageW;
    // Auto-fit: every type size scales by one factor, measured so the copy
    // fills the page height without overflowing (same idea as the social tiles).
    const [fit, setFit] = useState(1);
    const pageRef = useRef<HTMLDivElement | null>(null);
    const iter = useRef(0);
    const setRefs = useCallback(
      (el: HTMLDivElement | null) => {
        pageRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref],
    );
    const fitKey = JSON.stringify([result.target.id, result.content, displayWidth]);
    useLayoutEffect(() => {
      iter.current = 0;
      setFit(1);
    }, [fitKey]);
    useLayoutEffect(() => {
      const el = pageRef.current;
      if (!el || iter.current > 16) return;
      iter.current += 1;
      const prevH = el.style.height;
      const autos = Array.from(el.children).filter((c) => (c as HTMLElement).style.marginTop === "auto") as HTMLElement[];
      autos.forEach((c) => (c.style.marginTop = "0px"));
      el.style.height = "auto";
      let natural = el.scrollHeight;
      const abs = Array.from(el.children).find((c) => (c as HTMLElement).style.position === "absolute") as HTMLElement | undefined;
      if (abs) natural += abs.offsetHeight + 12;
      el.style.height = prevH;
      autos.forEach((c) => (c.style.marginTop = "auto"));
      const ratio = (pageH * 0.96) / Math.max(1, natural);
      if (Math.abs(ratio - 1) < 0.02 || (ratio > 1 && fit >= 4.5)) return;
      const next = Math.min(4.5, Math.max(0.55, fit * Math.pow(ratio, ratio > 1 ? 0.7 : 1)));
      if (Math.abs(next - fit) > 0.005) setFit(next);
    });
    const t0 = result.type;
    const t = {
      ...t0,
      eyebrowPx: t0.eyebrowPx * Math.min(fit, 1.4),
      headlinePx: t0.headlinePx * Math.min(fit, trim.width > trim.height ? 2.6 : 2),
      bodyPx: t0.bodyPx * fit,
      pointPx: t0.pointPx * fit,
      statPx: t0.statPx * Math.min(fit, 1.6),
    };
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
    const groundToken = content.media?.kind === "token" ? content.media.token : (ground ?? "#FFFFFF");

    // Module layout rebuilt natively: steps, before/after, table, matrix, figures.
    const pts = content.points ?? [];
    const shape = content.shape;
    const split = (p: string) => {
      const i = p.indexOf(" — ");
      return i < 0 ? [p, ""] : [p.slice(0, i), p.slice(i + 3)];
    };
    const cellPx = t.pointPx * bb;
    const place = land ? { gridColumn: 2, gridRow: "2 / span 3" } : {};
    let shapedBlock: ReactNode = null;
    if (pts.length && shape && shape.kind !== "list") {
      if (shape.kind === "steps") {
        shapedBlock = (
          <ol data-shape="steps" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: u(banner ? 24 : 10), ...(banner ? { flex: 1, alignContent: "space-evenly" } : {}), ...place }}>
            {pts.map((p, i) => {
              const [h, b] = split(p);
              return (
                <li key={i} style={{ display: "grid", gridTemplateColumns: `${u(banner ? 64 : 28)}px 1fr`, gap: u(12), alignItems: "start", fontSize: cellPx, lineHeight: t.bodyLeading }}>
                  <span style={{ width: u(banner ? 64 : 28), height: u(banner ? 64 : 28), background: accent, color: ink, fontWeight: 700, display: "grid", placeItems: "center", fontSize: "0.9em" }}>{i + 1}</span>
                  <span><strong style={{ display: "block" }}>{h}</strong>{b ? <span style={{ color: "#3A3A55" }}>{b}</span> : null}</span>
                </li>
              );
            })}
          </ol>
        );
      } else if (shape.kind === "pairs") {
        shapedBlock = (
          <div data-shape="pairs" style={{ display: "grid", gridTemplateColumns: banner || k < 0.7 ? "1fr" : "1fr 1fr", gap: u(14), ...(banner ? { flex: 1, alignContent: "space-evenly" } : {}), ...place }}>
            {pts.map((p, i) => {
              const m = /^(Before|After):\s*/.exec(p);
              const [h, b] = split(m ? p.slice(m[0].length) : p);
              const after = m?.[1] === "After";
              return (
                <div key={i} style={{ padding: u(16), background: after ? "#EEF1F7" : "#F2F2F2", borderTop: `${u(4)}px solid ${after ? accent : "#666666"}`, fontSize: cellPx, lineHeight: t.bodyLeading }}>
                  {m ? <div style={{ fontSize: "0.75em", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666666", marginBottom: u(6) }}>{m[1]}</div> : null}
                  <strong style={{ display: "block", marginBottom: u(4) }}>{h}</strong>
                  {b ? <span style={{ color: "#3A3A55" }}>{b}</span> : null}
                </div>
              );
            })}
          </div>
        );
      } else if (shape.kind === "quadrants") {
        shapedBlock = (
          <div data-shape="quadrants" style={{ ...place }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: u(6) }}>
              {pts.slice(0, 4).map((p, i) => (
                <div key={i} style={{ padding: u(14), minHeight: u(banner ? 220 : 70), background: i === 0 ? accent : "#EEF1F7", fontSize: cellPx, fontWeight: 600, lineHeight: 1.25 }}>{p}</div>
              ))}
            </div>
            {shape.axisX || shape.axisY ? (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: u(6), fontSize: t.eyebrowPx * bb, color: "#666666" }}>
                <span>{shape.axisY ? `↑ ${shape.axisY}` : ""}</span>
                <span>{shape.axisX ? `${shape.axisX} →` : ""}</span>
              </div>
            ) : null}
          </div>
        );
      } else if (shape.kind === "table") {
        shapedBlock = (
          <div style={{ width: "100%", ...(land ? { gridColumn: "1 / -1", alignSelf: "stretch", display: "flex", flexDirection: "column" } : {}) }}>
          <table data-shape="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: cellPx * (land ? 1.9 : 1.1), lineHeight: 1.3, ...(land ? { flex: 1, height: "100%" } : {}) }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: u(land ? 30 : 6) }} />
                {shape.columns.map((c, i) => (
                  <th key={i} style={{ textAlign: "left", padding: u(land ? 30 : 6), borderBottom: `${u(3)}px solid ${i === shape.columns.length - 1 ? accent : "rgba(3,0,44,0.2)"}` }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pts.map((p, i) => {
                const [h, b] = split(p);
                const vals = b.split(" · ");
                return (
                  <tr key={i} style={{ borderBottom: `${u(1)}px solid rgba(3,0,44,0.12)` }}>
                    <td style={{ padding: u(land ? 30 : 6), fontWeight: 600 }}>{h}</td>
                    {shape.columns.map((_, j) => (
                      <td key={j} style={{ padding: u(land ? 30 : 6), fontWeight: j === shape.columns.length - 1 ? 700 : 400 }}>{vals[j] ?? ""}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        );
      } else if (shape.kind === "stats") {
        shapedBlock = (
          <div data-shape="stats" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(pts.length, banner || k < 0.7 ? 1 : pts.length > 4 ? 3 : 2)}, 1fr)`, gap: u(16), ...(banner ? { flex: 1, alignContent: "space-evenly" } : {}), ...place }}>
            {pts.map((p, i) => {
              const [h, b] = split(p);
              const [fig, ...lab] = h.split(" ");
              return (
                <div key={i} style={{ borderTop: `${u(4)}px solid ${accent}`, paddingTop: u(10) }}>
                  <div style={{ fontSize: t.statPx * 0.7 * bb, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em" }}>{fig}</div>
                  <div style={{ fontSize: cellPx, fontWeight: 600, marginTop: u(6) }}>{lab.join(" ")}</div>
                  {b ? <div style={{ fontSize: cellPx * 0.9, color: "#3A3A55" }}>{b}</div> : null}
                </div>
              );
            })}
          </div>
        );
      }
    }
    const detailsBlock = content.details?.length ? (
      <dl data-shape="details" style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: u(14), rowGap: u(4), fontSize: t.eyebrowPx * 1.15 * bb, lineHeight: 1.35, ...(land ? { gridColumn: "1 / -1" } : {}) }}>
        {content.details.map((d) => (
          <Fragment key={d.label}>
            <dt style={{ color: "#666666", fontWeight: 600 }}>{d.label}</dt>
            <dd style={{ margin: 0 }}>{d.value}</dd>
          </Fragment>
        ))}
      </dl>
    ) : null;

    return (
      <div
        style={{ width: displayWidth, height: Math.round(pageH * scale) }}
        className="relative overflow-hidden"
      >
        <div
          ref={setRefs}
          data-print-brief-page="true"
          data-fit={fit.toFixed(2)}
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
                fontSize: t.eyebrowPx * (banner ? 1.8 : 1),
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

          {!photo && content.images?.length ? (
            <div data-adapt-images="true" style={{ ...L, display: "grid", gridTemplateColumns: `repeat(${Math.min(3, content.images.length)}, 1fr)`, gap: u(8) }}>
              {content.images.slice(0, 3).map((m, i) => (
                <div key={i} style={{ position: "relative", height: Math.round(pageH * (banner ? 0.16 : land ? 0.2 : 0.14)), overflow: "hidden", borderTop: `${u(3)}px solid ${accent}` }}>
                  <MediaTile brand={brand} seed={m.seed} overrideUrl={m.url} className="absolute inset-0 h-full w-full rounded-none" />
                  {m.title ? (
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: u(6), color: "#FFFFFF", fontWeight: 700, fontSize: Math.max(8, t.pointPx * 0.8), background: "linear-gradient(to top, rgba(3,0,44,0.78), rgba(3,0,44,0))" }}>{m.title}</div>
                  ) : null}
                </div>
              ))}
            </div>
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

          {content.chart ? (
            <div data-adapt-chart-block="true" style={{ ...(land ? { gridColumn: 1 } : {}), ...(banner ? {} : {}) }}>
              <AdaptChartBlock
                chart={content.chart}
                width={(land ? (pageW - pad * 2) * 0.5 : pageW - pad * 2)}
                height={Math.round(pageH * (banner ? 0.2 : land ? 0.38 : content.points?.length ? 0.22 : 0.32))}
                fontPx={Math.max(8, t.pointPx * 0.85)}
              />
            </div>
          ) : null}

          {shapedBlock ? shapedBlock : content.points?.length ? (
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
                    fontSize: t.pointPx * bb * (banner ? 1.3 : 1),
                    lineHeight: t.bodyLeading,
                    padding: `${u(banner ? 18 : 10)}px ${u(banner ? 20 : 12)}px`,
                    background: "rgba(224,232,245,0.7)",
                    borderTop: `${u(banner ? 6 : 3)}px solid ${accent}`,
                    fontWeight: banner ? 500 : undefined,
                  }}
                >
                  {banner && p.includes(" — ") ? (
                    <>
                      <span style={{ display: "block", fontWeight: 700, fontSize: "1.35em", lineHeight: 1.15, marginBottom: u(10) }}>
                        {iconFor(content.pointIcons, p) ? <AdaptIcon name={iconFor(content.pointIcons, p)!} label={p} size={u(40)} color={accent} /> : null}{p.split(" — ")[0]}
                      </span>
                      <span style={{ fontWeight: 400 }}>{p.split(" — ").slice(1).join(" — ")}</span>
                    </>
                  ) : iconFor(content.pointIcons, p) ? (
                    <span style={{ display: "flex", gap: u(10), alignItems: "flex-start" }}>
                      <AdaptIcon name={iconFor(content.pointIcons, p)!} label={p} size={Math.round(t.pointPx * bb * 1.3)} color={accent} />
                      <span>{p}</span>
                    </span>
                  ) : (
                    p
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          {content.stat ? (
            <div style={{ marginTop: banner ? 0 : big ? u(24) : "auto", ...(banner ? { flexDirection: "column" as const, alignItems: "flex-start" as const, borderTop: `${u(3)}px solid ${accent}`, paddingTop: u(24), ...(content.points?.length ? {} : { flex: 1, justifyContent: "center" as const }) } : {}), display: "flex", alignItems: banner ? "flex-start" : "baseline", gap: u(12), ...(land ? { gridColumn: 1 } : {}) }}>
              <span
                style={{
                  fontSize: t.statPx * (banner ? (content.points?.length ? 1.6 : 2.6) : 1),
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

          {detailsBlock}

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
