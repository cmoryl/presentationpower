// Live master pillar sign: the London gradient ground, the approved division
// lockup, and the sign copy. This node is what the export rasterises, so what
// is on screen is exactly what production receives.

import {
  PILLAR_SPEC,
  pillarDivision,
  pillarHeadlineInk,
  pillarHeadlineSize,
  pillarInk,
  pillarStops,
  type PillarConfig,
} from "@/lib/next-pillar-masters";


type Props = {
  config: PillarConfig;
  /** Preview pixels per mm on the bleed sheet. */
  pxPerMm?: number;
  guides?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const ARROW_ROTATION: Record<PillarConfig["arrow"], number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

export function PillarSign({ config, pxPerMm = 0.72, guides = false, className, style }: Props) {
  const mm = (v: number) => v * pxPerMm;
  const w = mm(PILLAR_SPEC.bleedW);
  const h = mm(PILLAR_SPEC.bleedH);
  const face = config.face ?? "dark";
  const ink = pillarInk(face);
  const headlineInk = pillarHeadlineInk(config);
  const headlineSize = pillarHeadlineSize(config);

  const stops = pillarStops(config.styleId, face);
  const vertical = Boolean(config.verticalHeadline) && config.kind !== "logo";
  const division = pillarDivision(config.divisionId);
  const isHalo = config.styleId.includes("halo");
  const gradientId = `pillar-${face}-${config.styleId.replace(/[^a-z0-9]/gi, "")}`;
  const inset = mm(PILLAR_SPEC.bleedEdge + PILLAR_SPEC.safeInset);
  const lockupW = mm(PILLAR_SPEC.trimW * 0.58);

  const axis = config.styleId.includes("diagonal")
    ? { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
    : config.styleId.includes("prism")
      ? { x1: "0%", y1: "100%", x2: "100%", y2: "0%" }
      : config.styleId.includes("bloom")
        ? { x1: "0%", y1: "0%", x2: "85%", y2: "85%" }
        : { x1: "50%", y1: "0%", x2: "50%", y2: "100%" };

  return (
    <div
      className={className}
      data-kit-asset-frame="true"
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        backgroundColor: stops[0],
        ...style,
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute", inset: 0, display: "block" }}
        aria-hidden
      >
        <defs>
          {isHalo ? (
            <radialGradient id={gradientId} cx="50%" cy="45%" r="72%">
              {stops.map((hex, i) => (
                <stop key={hex + i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={hex} />
              ))}
            </radialGradient>
          ) : (
            <linearGradient id={gradientId} {...axis}>
              {stops.map((hex, i) => (
                <stop key={hex + i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={hex} />
              ))}
            </linearGradient>
          )}
        </defs>
        <rect x={0} y={0} width={w} height={h} fill={`url(#${gradientId})`} />
      </svg>

      {/* Content stack inside the safe area */}
      <div
        style={{
          position: "absolute",
          left: inset,
          right: inset,
          top: inset,
          bottom: inset,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: config.kind === "logo" ? "center" : "flex-start",
          textAlign: "center",
          color: ink,
        }}
      >
        {config.showLockup && (division.whiteUrl || division.colorUrl) ? (
          <img
            src={face === "light" ? division.colorUrl || division.whiteUrl : division.whiteUrl || division.colorUrl}
            alt=""
            aria-hidden
            style={{
              width: lockupW,
              height: lockupW / (division.ratio || 1.7),
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : null}

        {config.kind === "logo" ? null : vertical ? (
          <div
            style={{
              marginTop: mm(120),
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {config.headline.trim() ? (
              <div
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                  fontSize: mm(headlineSize * 1.45),
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  color: headlineInk,
                }}
              >
                {config.headline}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ marginTop: mm(140), width: "100%" }}>
            {config.headline.trim() ? (
              <div
                style={{
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.02,
                  fontSize: mm(headlineSize),
                  textTransform: "uppercase",
                  color: headlineInk,
                }}
              >
                {config.headline}
              </div>
            ) : null}
          </div>
        )}

        {config.kind === "directional" ? (
          <div
            style={{
              marginTop: mm(150),
              transform: `rotate(${ARROW_ROTATION[config.arrow]}deg)`,
            }}
          >
            <svg width={mm(300)} height={mm(300)} viewBox="0 0 100 100" aria-hidden>
              <path d="M8 42 H62 V22 L94 50 L62 78 V58 H8 Z" fill={headlineInk} />
            </svg>
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

      </div>

      {guides ? (
        <>
          <div
            style={{
              position: "absolute",
              left: mm(PILLAR_SPEC.bleedEdge),
              top: mm(PILLAR_SPEC.bleedEdge),
              width: mm(PILLAR_SPEC.trimW),
              height: mm(PILLAR_SPEC.trimH),
              border: `1px dashed ${face === "light" ? "rgba(3,0,44,0.55)" : "rgba(255,255,255,0.75)"}`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: inset,
              top: inset,
              right: inset,
              bottom: inset,
              border: `1px dashed ${face === "light" ? "rgba(3,0,44,0.3)" : "rgba(255,255,255,0.4)"}`,
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}
    </div>
  );
}
