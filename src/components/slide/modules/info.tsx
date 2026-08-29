// Info-graphic family — hub & satellites, pill orbit, donut, funnel, bar
// comparison, circular flow, pyramid and Venn. Extracted verbatim from the
// legacy `VariantRenderer` switch onto the module registry so the diagram
// geometry (orbit rings, tapered funnels, pyramid steps) has a single owner.
//
// `pickIcon` lives inside `VariantRenderer` (it depends on that file's icon
// plumbing), so this module reaches it through the kit slot `pickKitIcon`
// instead of importing it and creating a cycle.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s } from "../module-kit";
import { pickKitIcon } from "../module-primitives";
import { SupportingText } from "../primitives";
import { AccentTick, AuroraOrb, GlassTile, moduleCardSurface } from "../flagship";
import { SummaryBand, readSummary } from "../SummaryBand";
import { OrbitDisc } from "../OrbitDisc";
import { SEAM_HEIGHT_PX } from "@/lib/surface-tokens";
import { accentInk } from "@/lib/accent-tokens";
import { iconByName } from "@/lib/icon-library";
import { cellAccent, cellIconScale } from "./cell-controls";
import { fillPx } from "@/lib/open-space-fill";

registerSlideModule({
  id: "family:info",
  variantIds: [
    "MV-INFO-HUB-SATELLITES",
    "MV-INFO-HUB-PILL-ORBIT",
    "MV-INFO-DONUT",
    "MV-INFO-FUNNEL",
    "MV-INFO-BAR-COMPARE",
    "MV-INFO-CIRCULAR-FLOW",
    "MV-INFO-PYRAMID",
    "MV-INFO-VENN",
  ],
  render: ({ variant, brand, pageNumber, c, mode, isDark, ink }) => {
    switch (variant.id) {
      case "MV-INFO-HUB-SATELLITES": {
        // Hub & satellites: one centre disc ringed by icon nodes, each node paired
        // with a feature block in the flanking columns. Scales 4-8 features — the
        // ring angles, node size and type all derive from the count so a 4-up and
        // an 8-up read with the same weight.
        // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
        // is too deep to read as text or as a hairline, so lift it onto the
        // shared accentInk ramp. Light mode is unchanged.
        const accent = accentInk(brand.tokens.accent, mode, 4.5);
        const cool = isDark ? "#7FB3F5" : "#3E7BD1";
        const hub = obj(c.hub);
        const feats = arr(c.items).slice(0, 8);
        const count = Math.max(feats.length, 1);
        const half = Math.ceil(count / 2);
        const left = feats.slice(0, half);
        const right = feats.slice(half);
        const dense = count >= 7;
        const labelSize = dense ? 22 : 24;
        const bodySize = dense ? 17 : 18;
        const node = dense ? 58 : 66;
        // Orbit radius is set so the node's INNER edge clears the hub's dashed
        // ring (OrbitDisc draws it at size * 1.347 / 2 = 186px) — no hairline may
        // cut through a satellite disc.
        const ring = 222;

        // Satellite angles: the left group hugs the left arc, the right group the
        // right arc, so every node sits beside the column its copy lives in.
        const angleFor = (i: number, total: number, side: "left" | "right") => {
          const span = total > 1 ? 108 : 0;
          const start = side === "left" ? 180 - span / 2 : -span / 2;
          const step = total > 1 ? span / (total - 1) : 0;
          const deg = side === "left" ? start + step * i : start + step * i;
          return (deg * Math.PI) / 180;
        };

        const Satellite = ({
          it,
          i,
          total,
          side,
        }: {
          it: Record<string, unknown>;
          i: number;
          total: number;
          side: "left" | "right";
        }) => {
          const NodeIcon = it.icon ? iconByName(s(it.icon)) : null;
          const nodeAccent = cellAccent(it, accent, mode);
          const a = angleFor(i, total, side);
          const x = Math.cos(a) * ring;
          const y = Math.sin(a) * ring;
          return (
            <div
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: node,
                height: node,
                left: `calc(50% + ${x}px - ${node / 2}px)`,
                top: `calc(50% + ${y}px - ${node / 2}px)`,
                border: `1px solid color-mix(in oklab, ${nodeAccent} 46%, transparent)`,
                // Neutral base under the accent wash so the connector ring (and
                // any ground pattern) is occluded rather than showing through the
                // icon — same treatment as the pill-orbit chips.
                backgroundColor: `color-mix(in oklab, ${isDark ? "#03002C" : "#FFFFFF"} ${isDark ? 72 : 82}%, transparent)`,
                backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${nodeAccent} ${isDark ? 30 : 18}%, transparent), color-mix(in oklab, ${nodeAccent} ${isDark ? 10 : 5}%, transparent))`,
                zIndex: 4,
              }}
            >
              {NodeIcon ? (
                <NodeIcon
                  size={Math.round(node * 0.42 * cellIconScale(it))}
                  strokeWidth={1.8}
                  color={nodeAccent}
                  aria-hidden
                />
              ) : (
                <span
                  style={{
                    fontSize: Math.round(node * 0.36),
                    fontWeight: 800,
                    color: accent,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String((side === "left" ? i : half + i) + 1).padStart(2, "0")}
                </span>
              )}
            </div>
          );
        };

        const Feature = ({
          it,
          n,
          side,
        }: {
          it: Record<string, unknown>;
          n: number;
          side: "left" | "right";
        }) => (
          <div
            className="relative px-6 py-4"
            style={{ textAlign: side === "left" ? "right" : "left" }}
          >
            {/* Accent seam on the inner edge — the house "open" card signature,
              rotated to point back at the hub. */}
            <div
              aria-hidden
              data-decorative
              className="absolute top-4 bottom-4"
              style={{
                width: SEAM_HEIGHT_PX,
                [side === "left" ? "right" : "left"]: 0,
                borderRadius: SEAM_HEIGHT_PX,
                backgroundImage: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
              }}
            />
            <div
              style={{
                fontSize: labelSize,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: ink.strong,
              }}
            >
              {s(it.label)}
            </div>
            {s(it.body) && (
              <div
                className="mt-1.5"
                style={{
                  fontSize: bodySize,
                  lineHeight: 1.35,
                  color: "color-mix(in oklab, currentColor 68%, transparent)",
                }}
              >
                {s(it.body)}
              </div>
            )}
          </div>
        );

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title)} />
            <div className="relative mt-8">
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: "1fr 520px 1fr", columnGap: 8 }}
              >
                <div className="flex flex-col justify-center gap-2">
                  {left.map((it, i) => (
                    <Feature key={i} it={it} n={i + 1} side="left" />
                  ))}
                </div>
                <div className="relative flex items-center justify-center" style={{ height: 540 }}>
                  {/* Connector ring: the satellites read as one orbit rather than
                    loose discs. Drawn as SVG arc SEGMENTS with a gap around
                    every node, so the hairline never crosses a satellite disc
                    or its icon. Each segment carries its own dash length, which
                    also lets the intro choreography draw the orbit on. */}
                  {(() => {
                    const box = ring * 2 + 4;
                    const cx = box / 2;
                    const gapDeg =
                      (Math.asin(Math.min(0.85, (node / 2 + 12) / ring)) * 180) / Math.PI;
                    const degs = [
                      ...left.map((_, i) => (angleFor(i, left.length, "left") * 180) / Math.PI),
                      ...right.map((_, i) => (angleFor(i, right.length, "right") * 180) / Math.PI),
                    ]
                      .map((d) => ((d % 360) + 360) % 360)
                      .sort((a, b) => a - b);
                    const at = (deg: number) => {
                      const r = (deg * Math.PI) / 180;
                      return { x: cx + Math.cos(r) * ring, y: cx + Math.sin(r) * ring };
                    };
                    const segs = degs
                      .map((d, i) => {
                        const next = degs[(i + 1) % degs.length]!;
                        const start = d + gapDeg;
                        let end = next - gapDeg;
                        if (end <= start) end += 360;
                        return { start, end, sweep: end - start };
                      })
                      .filter((sg) => sg.sweep > 3);
                    return (
                      <svg
                        aria-hidden
                        className="absolute"
                        width={box}
                        height={box}
                        viewBox={`0 0 ${box} ${box}`}
                        style={{ zIndex: 1 }}
                      >
                        {segs.map((sg, i) => {
                          const p1 = at(sg.start);
                          const p2 = at(sg.end);
                          const len = (sg.sweep * Math.PI * ring) / 180;
                          return (
                            <path
                              key={i}
                              d={`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${ring} ${ring} 0 ${sg.sweep > 180 ? 1 : 0} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`}
                              fill="none"
                              stroke={accent}
                              strokeOpacity={0.22}
                              strokeWidth={1}
                              strokeLinecap="round"
                              strokeDasharray={`${len.toFixed(1)} ${len.toFixed(1)}`}
                            />
                          );
                        })}
                      </svg>
                    );
                  })()}
                  <OrbitDisc size={276} accent={accent} cool={cool} isDark={isDark}>
                    <div
                      style={{
                        fontSize: fillPx(34, "figure"),
                        fontWeight: 800,
                        letterSpacing: "-0.035em",
                        lineHeight: 1.05,
                        color: ink.strong,
                      }}
                    >
                      {s(hub.title)}
                    </div>
                    {s(hub.subtitle) && (
                      <div
                        className="mt-3"
                        style={{
                          fontSize: fillPx(19, "body"),
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: accent,
                        }}
                      >
                        {s(hub.subtitle)}
                      </div>
                    )}
                  </OrbitDisc>
                  {left.map((it, i) => (
                    <Satellite key={`l${i}`} it={it} i={i} total={left.length} side="left" />
                  ))}
                  {right.map((it, i) => (
                    <Satellite key={`r${i}`} it={it} i={i} total={right.length} side="right" />
                  ))}
                </div>
                <div className="flex flex-col justify-center gap-2">
                  {right.map((it, i) => (
                    <Feature key={i} it={it} n={half + i + 1} side="right" />
                  ))}
                </div>
              </div>
              <SummaryBand
                {...readSummary(c.summary)}
                accent={accent}
                leadTone={ink.strong}
                scale={0.8}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-HUB-PILL-ORBIT": {
        // Hub & pill orbit: a centre hub flanked by two stacks of pill chips whose
        // inner edges follow the hub's arc, so the column silhouette curves around
        // the circle instead of sitting in a flat block. Takes 4-12 chips; chip
        // height, type and hub size all derive from the count.
        // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
        // is too deep to read as text or as a hairline, so lift it onto the
        // shared accentInk ramp. Light mode is unchanged.
        const accent = accentInk(brand.tokens.accent, mode, 4.5);
        const cool = isDark ? "#7FB3F5" : "#3E7BD1";
        const hub = obj(c.hub);
        const chips = arr(c.items).slice(0, 12);
        const count = Math.max(chips.length, 1);
        const half = Math.ceil(count / 2);
        const leftChips = chips.slice(0, half);
        const rightChips = chips.slice(half);
        const perSide = Math.max(leftChips.length, rightChips.length, 1);

        const STAGE_H = 560;
        const discSize = count >= 10 ? 252 : count >= 8 ? 272 : 296;
        // OrbitDisc's dashed ring sits at size * 1.347 — keep chips clear of it.
        const clearR = (discSize * 1.347) / 2 + 16;
        const pillH = perSide >= 6 ? 52 : perSide >= 5 ? 58 : 64;
        const pillW = perSide >= 6 ? 322 : 344;
        const labelSize = perSide >= 6 ? 20 : perSide >= 5 ? 22 : 23;
        const step = perSide > 1 ? Math.min(pillH + 26, (STAGE_H - pillH - 8) / (perSide - 1)) : 0;
        const LEAD = 30; // breathing room between chip edge and the hub arc

        const rowOffset = (i: number, total: number) => (i - (total - 1) / 2) * step;

        /** Horizontal distance from the hub centre to a chip's inner edge, tracing
         *  the hub arc so middle rows step outward and end rows tuck inward. */
        const innerEdge = (dy: number) => {
          const inside = clearR * clearR - dy * dy;
          const arc = inside > 0 ? Math.sqrt(inside) : 0;
          return Math.max(arc, clearR * 0.34) + LEAD;
        };

        const Pill = ({
          it,
          i,
          total,
          side,
        }: {
          it: Record<string, unknown>;
          i: number;
          total: number;
          side: "left" | "right";
        }) => {
          const dy = rowOffset(i, total);
          const edge = innerEdge(dy);
          const PillIcon = it.icon ? iconByName(s(it.icon)) : null;
          const pillAccent = cellAccent(it, accent, mode);
          const inner = side === "left" ? "right" : "left";
          return (
            <div
              className="absolute"
              data-intro-step={i + 1}
              style={{
                width: pillW,
                height: pillH,
                top: `calc(50% + ${dy}px - ${pillH / 2}px)`,
                [side === "left" ? "right" : "left"]: `calc(50% + ${edge}px)`,
                zIndex: 3,
              }}
            >
              {/* Tapered hand-off line: chip edge toward the hub, fading out so the
                arc never reads as a hard spoke. */}
              <div
                aria-hidden
                data-decorative
                className="absolute top-1/2"
                style={{
                  width: LEAD - 8,
                  height: 1,
                  [inner]: -(LEAD - 8),
                  transform: "translateY(-0.5px)",
                  backgroundImage: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, color-mix(in oklab, ${pillAccent} 62%, transparent), transparent)`,
                }}
              />
              <div
                className="flex h-full items-center gap-3 px-5"
                style={{
                  borderRadius: pillH / 2,
                  border: `1px solid color-mix(in oklab, ${pillAccent} ${isDark ? 46 : 34}%, transparent)`,
                  // Neutral base under the accent wash so the chip holds its own
                  // against bright or busy patches of the ground.
                  backgroundColor: `color-mix(in oklab, ${isDark ? "#03002C" : "#FFFFFF"} ${isDark ? 62 : 58}%, transparent)`,
                  backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${pillAccent} ${isDark ? 26 : 12}%, transparent), color-mix(in oklab, ${pillAccent} ${isDark ? 8 : 3}%, transparent))`,
                  flexDirection: side === "left" ? "row-reverse" : "row",
                }}
              >
                <span
                  aria-hidden
                  data-decorative
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: Math.round(pillH * 0.56),
                    height: Math.round(pillH * 0.56),
                    border: `1px solid color-mix(in oklab, ${pillAccent} 48%, transparent)`,
                    backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${pillAccent} ${isDark ? 34 : 20}%, transparent), transparent)`,
                  }}
                >
                  {PillIcon ? (
                    <PillIcon
                      size={Math.round(pillH * 0.3 * cellIconScale(it))}
                      strokeWidth={1.8}
                      color={pillAccent}
                      aria-hidden
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: Math.round(pillH * 0.26),
                        fontWeight: 800,
                        color: pillAccent,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {String((side === "left" ? i : half + i) + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    fontSize: labelSize,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                    color: ink.strong,
                    textAlign: "center",
                  }}
                >
                  {s(it.label)}
                </span>
              </div>
            </div>
          );
        };

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.kicker) || undefined} />
            {s(c.subtitle) && (
              <div
                data-title-subline
                className="mt-2"
                style={{
                  fontSize: fillPx(26, "body"),
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                  color: accent,
                }}
              >
                {s(c.subtitle)}
              </div>
            )}
            <div className="relative mt-8">
              <div className="relative" style={{ height: STAGE_H }}>
                {/* Clearance halo: ties the two stacks to one orbit. */}
                <div
                  aria-hidden
                  data-decorative
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: (clearR + LEAD) * 2,
                    height: (clearR + LEAD) * 2,
                    marginLeft: -(clearR + LEAD),
                    marginTop: -(clearR + LEAD),
                    border: `1px solid color-mix(in oklab, ${accent} 14%, transparent)`,
                  }}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ zIndex: 2 }}
                >
                  <OrbitDisc size={discSize} accent={accent} cool={cool} isDark={isDark}>
                    <div
                      style={{
                        fontSize: discSize >= 290 ? 36 : 31,
                        fontWeight: 800,
                        letterSpacing: "-0.035em",
                        lineHeight: 1.05,
                        color: ink.strong,
                      }}
                    >
                      {s(hub.title)}
                    </div>
                    {s(hub.subtitle) && (
                      <div
                        className="mt-2.5"
                        style={{
                          fontSize: fillPx(17, "body"),
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: accent,
                        }}
                      >
                        {s(hub.subtitle)}
                      </div>
                    )}
                  </OrbitDisc>
                </div>
                {leftChips.map((it, i) => (
                  <Pill key={`l${i}`} it={it} i={i} total={leftChips.length} side="left" />
                ))}
                {rightChips.map((it, i) => (
                  <Pill key={`r${i}`} it={it} i={i} total={rightChips.length} side="right" />
                ))}
              </div>
              <SummaryBand
                {...readSummary(c.summary)}
                accent={accent}
                leadTone={ink.strong}
                scale={0.8}
              />
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-DONUT": {
        const items = arr(c.items);
        const total =
          items.reduce(
            (sum, it) => sum + (typeof it.value === "number" ? it.value : Number(it.value) || 0),
            0,
          ) || 1;
        const palette = [
          brand.tokens.primary,
          brand.tokens.accent,
          "#4A90A4",
          "#8E44AD",
          "#22C1C3",
        ];
        // Ring geometry: stroked SVG arcs (not a conic gradient) so the intro can
        // draw each slice on clockwise from 12 o'clock. The resting ring is pixel
        // identical to the previous gradient, so export/raster fidelity is unchanged.
        const RING_BOX = 560;
        const RING_R = 229.5;
        const RING_SW = 101;
        const RING_C = 2 * Math.PI * RING_R;
        let cum = 0;
        const arcs = items.map((it, i) => {
          const v = typeof it.value === "number" ? it.value : Number(it.value) || 0;
          const start = (cum / total) * RING_C;
          cum += v;
          const len = Math.max(0, (v / total) * RING_C);
          return { len, start, color: palette[i % palette.length]! };
        });
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Where the effort goes")} />
            <div className="mt-10 grid grid-cols-[560px_1fr] items-center gap-16">
              <div className="relative aspect-square w-[560px]">
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
                  aria-hidden="true"
                >
                  <g transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}>
                    {arcs.map((a, i) => (
                      <circle
                        key={i}
                        data-intro-arc="on"
                        cx={RING_BOX / 2}
                        cy={RING_BOX / 2}
                        r={RING_R}
                        fill="none"
                        stroke={a.color}
                        strokeWidth={RING_SW}
                        strokeDasharray={`${a.len.toFixed(2)} ${(RING_C - a.len).toFixed(2)}`}
                        strokeDashoffset={(-a.start).toFixed(2)}
                      />
                    ))}
                  </g>
                </svg>
                {/* House circle centre: glass disc + seam sitting in the donut hole. */}
                <div className="absolute inset-0 grid place-items-center">
                  <OrbitDisc
                    size={358}
                    accent={brand.tokens.accent}
                    cool={brand.tokens.primary}
                    isDark={isDark}
                    rings={false}
                  >
                    <div
                      className="text-8xl font-semibold leading-none"
                      style={{ color: ink.strong }}
                    >
                      {s(c.centerValue)}
                      <span className="text-4xl" style={{ color: "var(--slide-accent-text)" }}>
                        {s(c.centerUnit)}
                      </span>
                    </div>
                    <div className="mt-4 max-w-[80%] text-xl opacity-80">{s(c.centerLabel)}</div>
                  </OrbitDisc>
                </div>
              </div>
              <div className="space-y-5">
                {items.map((it, i) => (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i}
                    className="flex items-start gap-5"
                  >
                    <div
                      className="mt-3 h-5 w-5 shrink-0 rounded"
                      style={{ backgroundColor: palette[i % palette.length] }}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-6">
                        <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                          {s(it.label)}
                        </div>
                        <div
                          className="text-2xl font-semibold"
                          style={{ color: "var(--slide-accent-text)" }}
                        >
                          {s(it.value)}%
                        </div>
                      </div>
                      <div className="mt-1 text-lg opacity-70">{s(it.note)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-FUNNEL": {
        const items = arr(c.items);
        const n = Math.max(items.length, 1);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Funnel")} />
            <div className="slide-fill-stretch mt-12 flex flex-col gap-3">
              {items.map((it, i) => {
                const widthPct = 100 - (i / n) * 55;
                const shade = 1 - (i / n) * 0.55;
                return (
                  <div key={i} className="flex flex-1 items-center gap-8">
                    <div
                      data-on-fill
                      className="flex h-full min-h-24 items-center justify-between rounded-xl px-10 text-white"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: brand.tokens.primary,
                        opacity: 0.55 + shade * 0.45,
                      }}
                    >
                      <div className="text-2xl font-semibold">{s(it.label)}</div>
                      <div className="text-3xl font-semibold">
                        {s(it.value)}
                        <span className="ml-2 text-xl opacity-80">{s(it.unit)}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-xl opacity-70">{s(it.note)}</div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-BAR-COMPARE": {
        const items = arr(c.items);
        const values = items.map((it) =>
          typeof it.value === "number" ? it.value : Number(it.value) || 0,
        );
        const max = Math.max(1, ...values);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <AuroraOrb x={90} y={30} size={840} />
            <div className="relative">
              <SlideTitle brand={brand} title={s(c.title, "Comparison")} />
              <GlassTile radius={26} padding="px-12 py-10" className="mt-12">
                <div className="space-y-6">
                  {items.map((it, i) => {
                    const v = values[i];
                    const pct = Math.max(6, (v / max) * 100);
                    const highlight = i === items.length - 1;
                    return (
                      <div key={i} className="grid grid-cols-[260px_1fr_140px] items-center gap-6">
                        <div
                          className="text-2xl font-semibold"
                          style={{ color: ink.strong, letterSpacing: "-0.01em" }}
                        >
                          {s(it.label)}
                        </div>
                        <div className="relative h-10 w-full">
                          <div
                            className="absolute left-0 right-0 top-1/2 -translate-y-1/2"
                            style={{
                              height: 2,
                              background: `color-mix(in oklab, ${brand.tokens.accent} 14%, transparent)`,
                            }}
                          />
                          <div
                            className="absolute top-1/2 left-0 -translate-y-1/2"
                            style={{
                              width: `${pct}%`,
                              height: highlight ? 10 : 6,
                              background: highlight
                                ? `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.accent} 40%, transparent), ${brand.tokens.accent})`
                                : `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.primary} 18%, transparent), color-mix(in oklab, ${brand.tokens.primary} 60%, transparent))`,
                            }}
                          />
                          {s(it.note) && (
                            <div
                              className="absolute right-3 top-1/2 -translate-y-[135%] uppercase"
                              style={{
                                fontSize: fillPx(13, "kicker"),
                                letterSpacing: "0.22em",
                                color: ink.faint,
                                fontWeight: 600,
                              }}
                            >
                              {s(it.note)}
                            </div>
                          )}
                        </div>
                        <div
                          className="text-right tabular-nums"
                          style={{
                            fontSize: fillPx(34, "figure"),
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: highlight ? "var(--slide-accent-text)" : ink.strong,
                          }}
                        >
                          {s(it.value)}
                          <span
                            className="ml-1"
                            style={{ fontSize: fillPx(18, "body"), color: ink.faint }}
                          >
                            {s(c.unit)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassTile>
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-CIRCULAR-FLOW": {
        const items = arr(c.items).slice(0, 6);
        const n = Math.max(items.length, 1);
        // Stage geometry: the whole cycle must live inside the 1080 stage under the
        // title, so the orbit is sized from the remaining height rather than a
        // fixed tall box. Radii stay clear of the hub disc at every count.
        const STAGE_W = 1180;
        const STAGE_H = 580;
        const HUB = 232;
        const RX = 420;
        const RY = 200;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "The cycle")} />
            <div
              className="relative mx-auto mt-8"
              style={{ height: STAGE_H, width: STAGE_W, maxWidth: "100%" }}
            >
              {/* Hub uses the house circle so the cycle reads like the rest of the system. */}
              <div className="absolute inset-0 grid place-items-center">
                <OrbitDisc
                  size={HUB}
                  accent={brand.tokens.accent}
                  cool={brand.tokens.primary}
                  isDark={isDark}
                >
                  <div
                    className="px-2 text-2xl font-semibold leading-tight"
                    style={{ color: ink.strong }}
                  >
                    {s(c.hub, "Program")}
                  </div>
                </OrbitDisc>
              </div>

              {items.map((it, i) => {
                const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const x = STAGE_W / 2 + RX * cos;
                const rawY = STAGE_H / 2 + RY * sin;
                // Anchor the block on the side of the point facing away from the hub.
                const side =
                  Math.abs(cos) > 0.6 ? (cos > 0 ? "right" : "left") : sin < 0 ? "top" : "bottom";
                const tx = side === "right" ? "0%" : side === "left" ? "-100%" : "-50%";
                const ty = side === "top" ? "-100%" : side === "bottom" ? "0%" : "-50%";
                // Keep vertical blocks inside the stage: a top block grows upward and
                // a bottom block grows downward, so clamp their anchors by block height.
                const BLOCK = 190;
                const y =
                  side === "top"
                    ? Math.max(rawY, BLOCK)
                    : side === "bottom"
                      ? Math.min(rawY, STAGE_H - BLOCK)
                      : rawY;
                const iconFirst = side !== "top";
                const Ic = pickKitIcon(s(it.label), i, s(it.icon));
                const icon = (
                  <OrbitDisc
                    size={68}
                    accent={brand.tokens.accent}
                    cool={brand.tokens.primary}
                    isDark={isDark}
                    rings={false}
                    seam={false}
                    className="mx-auto"
                    contentClassName="flex items-center justify-center"
                    style={{ color: "var(--slide-accent-text)" }}
                  >
                    <Ic size={28} />
                  </OrbitDisc>
                );
                const copy = (
                  <>
                    <div
                      style={{
                        fontSize: fillPx(22, "body"),
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <SupportingText size="sm" opacity={0.72} className="mt-1.5">
                      {s(it.body)}
                    </SupportingText>
                  </>
                );
                return (
                  <div
                    key={i}
                    className="absolute w-[240px] text-center"
                    style={{
                      left: x,
                      top: y,
                      transform: `translate(${tx}, ${ty})`,
                    }}
                  >
                    {iconFirst ? (
                      <>
                        {icon}
                        <div className="mt-3">{copy}</div>
                      </>
                    ) : (
                      <>
                        <div className="mb-3">{copy}</div>
                        {icon}
                      </>
                    )}

                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-PYRAMID": {
        const items = arr(c.items);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Value pyramid")} />
            <div className="slide-fill-stretch mt-12 grid grid-cols-[1fr_1fr] items-center gap-16">
              <div className="flex h-full flex-col items-center gap-3">
                {items.map((it, i) => {
                  const widthPct =
                    40 + ((items.length - 1 - i) / Math.max(items.length - 1, 1)) * 55;
                  // Emphasis rises toward the base of the pyramid so the glass
                  // reads as stacked strata rather than four identical tiles.
                  const emphasis = 0.85 + (i / Math.max(items.length - 1, 1)) * 0.5;
                  return (
                    <div
                      key={i}
                      className="relative flex h-full min-h-20 flex-1 items-center justify-center overflow-hidden"
                      style={{
                        width: `${widthPct}%`,
                        ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
                          radius: 18,
                          emphasis,
                        }),
                      }}
                    >
                      <AccentTick accent={brand.tokens.accent} height={3} radius={18} />
                      <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                        {s(it.label)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6">
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="border-l-4 pl-6"
                    style={{ borderColor: brand.tokens.accent }}
                  >
                    <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                      {s(it.label)}
                    </div>
                    <div className="mt-2 text-xl opacity-80">{s(it.body)}</div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-INFO-VENN": {
        const items = arr(c.items).slice(0, 3);
        const colors = [brand.tokens.primary, brand.tokens.accent, "#4A90A4"];
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Where it lives")} />
            <div className="mt-10 grid grid-cols-[720px_1fr] items-center gap-12">
              <div className="relative h-[600px] w-[720px]">
                {[
                  { left: "20%", top: "18%" },
                  { left: "50%", top: "18%" },
                  { left: "35%", top: "48%" },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className="absolute h-[380px] w-[380px] rounded-full"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      backgroundColor: colors[i],
                      opacity: 0.45,
                      mixBlendMode: "multiply",
                    }}
                  />
                ))}
                <div className="absolute left-1/2 top-1/2 z-10 max-w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 p-6 text-center shadow-lg">
                  <div
                    className="text-lg uppercase tracking-[0.25em]"
                    style={{ color: "var(--slide-accent-text)" }}
                  >
                    Intersection
                  </div>
                  <div className="mt-2 text-2xl font-semibold" style={{ color: ink.strong }}>
                    {s(c.intersection)}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {items.map((it, i) => (
                  <div key={i} className="flex items-start gap-5">
                    <div
                      className="mt-2 h-6 w-6 shrink-0 rounded-full"
                      style={{ backgroundColor: colors[i] }}
                    />
                    <div>
                      <div className="text-2xl font-semibold" style={{ color: ink.strong }}>
                        {s(it.label)}
                      </div>
                      <div className="mt-2 text-xl opacity-80">{s(it.body)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      default:
        return null;
    }
  },
});
