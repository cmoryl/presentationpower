// Live master pillar sign: the London gradient ground, the approved division
// lockup, the sign copy, an optional sub-line and a real printable QR code.
// This node is what the export rasterises, so what is on screen is exactly
// what production receives.

import {
  pillarDivision,
  pillarGeometry,
  pillarHeadlineInk,
  pillarHeadlineSize,
  pillarHeadlineOffset,
  pillarLockupScale,
  pillarQrBackground,
  pillarQrTransparent,
  pillarQrForeground,
  pillarQrSize,
  pillarQrStyle,
  pillarQrPlacement,
  pillarSubSize,
  pillarInk,
  pillarStops,
  type PillarConfig,
} from "@/lib/next-pillar-masters";
import { pillarArrowPath } from "@/lib/pillar-arrows";
import { PILLAR_LOGO_DROP } from "@/lib/next-pillar-masters";
import { buildPillarQr } from "@/lib/pillar-qr";
import { martPlacement } from "@/lib/next-mart-placement";

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
  const geo = pillarGeometry(config);
  const w = mm(geo.bleedW);
  const h = mm(geo.bleedH);
  const face = config.face ?? "dark";
  const ink = pillarInk(face);
  const headlineInk = pillarHeadlineInk(config);
  const headlineSize = pillarHeadlineSize(config);
  const headlineOffset = pillarHeadlineOffset(config);
  const subSize = pillarSubSize(config);

  const stops = pillarStops(config.styleId, face);
  const vertical = Boolean(config.verticalHeadline) && config.kind !== "logo";
  const division = pillarDivision(config.divisionId);
  const isHalo = config.styleId.includes("halo");
  // Light core, saturated rim: keeps the halo ground readable at pillar scale.
  const haloStops = isHalo ? [...stops].reverse() : stops;
  const gradientId = `pillar-${face}-${config.styleId.replace(/[^a-z0-9]/gi, "")}`;
  const inset = mm(geo.bleedEdge + geo.safeInset);
  const lockupW = mm(geo.trimW * 0.58 * pillarLockupScale(config));

  const linkLines =
    config.kind === "logo"
      ? [config.logoUrl ?? "", config.logoSocial ?? ""].map((v) => v.trim()).filter(Boolean)
      : [];

  const qr = buildPillarQr(config.qrData ?? "");
  const qrPlace = pillarQrPlacement(config);
  const qrEdge = mm(qrPlace.edge);
  const qrStyle = pillarQrStyle(config);
  const qrFore = pillarQrForeground(config);
  const qrClear = pillarQrTransparent(config);
  const qrBack = qrClear ? "transparent" : pillarQrBackground(config);

  // Placed NEXT MART artwork: the supplied master sits on the live ground while
  // every other element stays editable.
  const placed = martPlacement(config);

  const axis = config.styleId.includes("diagonal")
    ? { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
    : config.styleId.includes("prism")
      ? { x1: "0%", y1: "100%", x2: "100%", y2: "0%" }
      : config.styleId.includes("bloom")
        ? { x1: "0%", y1: "0%", x2: "85%", y2: "85%" }
        : { x1: "50%", y1: "0%", x2: "50%", y2: "100%" };

  const subLine = (config.subheadline ?? "").trim() ? (
    <div
      style={{
        marginTop: mm(subSize * 0.7),
        fontWeight: 500,
        letterSpacing: "0.01em",
        lineHeight: 1.15,
        fontSize: mm(subSize),
        color: headlineInk,
        opacity: 0.92,
        maxWidth: "100%",
      }}
    >
      {config.subheadline}
    </div>
  ) : null;

  const qrBlock = qr ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems:
          qrPlace.captionAlign === "left"
            ? "flex-start"
            : qrPlace.captionAlign === "right"
              ? "flex-end"
              : "center",
      }}
    >
              <div
                style={{
                  width: qrEdge,
                  height: qrEdge,
                  background: qrBack,
                  borderRadius: qrClear ? 0 : mm(4),
                  padding: 0,
                }}
              >
                <svg
                  width={qrEdge}
                  height={qrEdge}
                  viewBox={`0 0 ${qr.size} ${qr.size}`}
                  shapeRendering={qrStyle === "block" ? "crispEdges" : undefined}
                  aria-hidden
                >
                  {qrClear ? null : (
                    <rect x={0} y={0} width={qr.size} height={qr.size} fill={qrBack} />
                  )}
                  {qrStyle === "block" ? (
                    <path d={qr.path} fill={qrFore} />
                  ) : (
                    qr.modules.map((on, i) => {
                      if (!on) return null;
                      const cx = i % qr.size;
                      const cy = Math.floor(i / qr.size);
                      return qrStyle === "dot" ? (
                        <circle key={i} cx={cx + 0.5} cy={cy + 0.5} r={0.5} fill={qrFore} />
                      ) : (
                        <rect
                          key={i}
                          x={cx + 0.06}
                          y={cy + 0.06}
                          width={0.88}
                          height={0.88}
                          rx={0.24}
                          fill={qrFore}
                        />
                      );
                    })
                  )}
                </svg>
              </div>
              {qrPlace.caption ? (
                <div
                  style={{
                    marginTop: mm(qrPlace.captionPad),
                    maxWidth: qrEdge,
                    fontSize: mm(qrPlace.captionSize),
                    fontWeight: qrPlace.captionFont.weight,
                    letterSpacing: `${qrPlace.captionFont.tracking}em`,
                    textTransform: qrPlace.captionFont.uppercase ? "uppercase" : "none",
                    textAlign: qrPlace.captionAlign,
                    lineHeight: 1.15,
                    color: headlineInk,
                  }}
                >
                  {config.qrCaption}
                </div>
              ) : null}
  </div>
  ) : null;

  return (
    <div
      className={className}
      data-kit-asset-frame="true"
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        backgroundColor: isHalo ? haloStops[haloStops.length - 1]! : stops[0],
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
            <radialGradient
              id={gradientId}
              cx="50%"
              cy="42%"
              r="78%"
              gradientTransform="translate(0.5 0.42) scale(0.62 1) translate(-0.5 -0.42)"
            >
              {haloStops.map((hex, i) => (
                <stop
                  key={hex + i}
                  offset={`${(i / (haloStops.length - 1)) * 100}%`}
                  stopColor={hex}
                />
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

      {placed ? (
        <img
          src={placed.art.previewUrl || placed.art.url}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: mm(geo.bleedEdge + placed.x),
            top: mm(geo.bleedEdge + placed.y),
            width: mm(placed.w),
            height: mm(placed.h),
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : null}

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
          justifyContent: "flex-start",
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
              // Logo-only pillars sit a quarter of the column lower than the
              // headline pillars, leaving the space under the mark for a URL.
              marginTop: config.kind === "logo" ? mm(geo.trimH * PILLAR_LOGO_DROP) : 0,
            }}
          />
        ) : null}

        {config.kind === "logo" && (linkLines.length || subLine) ? (
          <div style={{ marginTop: mm(Math.max(30, subSize * 1.2)), width: "100%" }}>
            {config.subheadline?.trim() ? subLine : null}
            {linkLines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                style={{
                  marginTop: mm(i === 0 ? 18 : 10),
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  lineHeight: 1.2,
                  fontSize: mm(subSize * (i === 0 ? 1 : 0.82)),
                  color: headlineInk,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}

        {config.kind === "logo" ? null : vertical ? (
          <div
            style={{
              marginTop: mm(Math.min(120, geo.trimH * 0.06) + headlineOffset),
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
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
            {subLine}
          </div>
        ) : (
          <div style={{ marginTop: mm(Math.min(140, geo.trimH * 0.07) + headlineOffset), width: "100%" }}>
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
            {subLine}
          </div>
        )}

        {config.kind === "directional" ? (
          <div
            style={{
              marginTop: mm(Math.min(150, geo.trimH * 0.075)),
              transform: `rotate(${ARROW_ROTATION[config.arrow]}deg)`,
            }}
          >
            <svg
              width={mm(Math.min(300, geo.trimW * 0.5))}
              height={mm(Math.min(300, geo.trimW * 0.5))}
              viewBox="0 0 100 100"
              aria-hidden
            >
              <path d={pillarArrowPath(config.arrowStyle)} fill={headlineInk} />
            </svg>
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

        {qr && !qrPlace.placed ? qrBlock : null}
      </div>

      {qr && qrPlace.placed ? (
        <div
          style={{
            position: "absolute",
            left: mm(geo.bleedEdge + qrPlace.x),
            top: mm(geo.bleedEdge + qrPlace.y),
            width: qrEdge,
          }}
        >
          {qrBlock}
        </div>
      ) : null}

      {guides ? (
        <>
          <div
            style={{
              position: "absolute",
              left: mm(geo.bleedEdge),
              top: mm(geo.bleedEdge),
              width: mm(geo.trimW),
              height: mm(geo.trimH),
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
