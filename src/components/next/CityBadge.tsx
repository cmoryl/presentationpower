import type { CSSProperties } from "react";

import {
  BADGE_SPEC,
  SAFE_INSET_X,
  SAFE_INSET_Y,
  cityBadgeFace,
  cityBadgeDivision,
  cityBadgeLockup,
  type CityBadgeConfig,
} from "@/lib/next-city-badge";

type Props = {
  config: CityBadgeConfig;
  /** Pixels per inch used for rendering. 96 = 1 CSS inch (print scale). */
  ppi?: number;
  /** Bleed / trim / safe-area / cutout guides over the artwork. */
  guides?: boolean;
  style?: CSSProperties;
  className?: string;
};

/**
 * City Series attendee badge — the approved artwork face run full bleed, with
 * event and attendee copy typeset inside the template safe area. Rendered at
 * native inches so the same node rasterises cleanly for press output.
 */
export function CityBadge({ config, ppi = 96, guides = false, style, className }: Props) {
  const face = cityBadgeFace(config.face);
  const lockup = cityBadgeLockup(config.divisionId);
  // The supplied artwork carries the City Series mark in its head. For any
  // other division area we cover that head with a clean brand plate and set
  // the division lockup in it, so the badge stays on-brand per area.
  const swapLockup = config.showLockup && !!lockup.url && config.divisionId !== "city-series";
  const px = (inches: number) => inches * ppi;
  const w = px(BADGE_SPEC.bleedW);
  const h = px(BADGE_SPEC.bleedH);
  const safeX = px(SAFE_INSET_X);
  const safeY = px(SAFE_INSET_Y);
  const klikTop = h - px(BADGE_SPEC.klik.fromBottom + BADGE_SPEC.klik.h);
  const scale = ppi / 96;

  const eventLine = [config.cityLabel, config.datesLabel, config.venueLabel]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-kit-asset-frame="true"
      className={className}
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        background: "#03002C",
        ...style,
      }}
    >
      <img
        src={face.artwork}
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {swapLockup ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: px(2.35),
            background:
              face.id === "light"
                ? "linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 78%,rgba(255,255,255,0) 100%)"
                : "linear-gradient(180deg,#03002C 0%,#03002C 78%,rgba(3,0,44,0) 100%)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: px(0.42),
          }}
        >
          <img
            src={face.id === "light" ? cityBadgeDivision(config.divisionId).colorUrl || lockup.url : lockup.url}
            alt=""
            aria-hidden
            style={{
              width: px(2.5),
              height: px(2.5) / lockup.ratio,
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ) : null}

      {/* Safe-area copy */}
      <div
        style={{
          position: "absolute",
          left: safeX,
          right: safeX,
          top: safeY,
          bottom: h - klikTop + px(0.06),
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 10 * scale,
        }}
      >
        {eventLine ? (
          <div
            style={{
              fontSize: 11 * scale,
              letterSpacing: 1.6 * scale,
              textTransform: "uppercase",
              fontWeight: 600,
              color: face.ink,
              textShadow: "0 1px 6px rgba(3,0,44,0.35)",
            }}
          >
            {eventLine}
          </div>
        ) : null}

        {config.showAttendee ? (
          <div
            style={{
              background: face.panel,
              color: face.panelInk,
              borderRadius: 10 * scale,
              padding: `${13 * scale}px ${15 * scale}px ${15 * scale}px`,
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: face.band,
                color: face.bandInk,
                fontSize: 9.5 * scale,
                fontWeight: 700,
                letterSpacing: 1.5 * scale,
                padding: `${4 * scale}px ${9 * scale}px`,
                borderRadius: 999,
              }}
            >
              {config.roleLabel || "ATTENDEE"}
            </div>
            <div
              style={{
                marginTop: 9 * scale,
                fontSize: 25 * scale,
                lineHeight: 1.03,
                fontWeight: 600,
                letterSpacing: -0.7 * scale,
              }}
            >
              {config.firstName}
              {config.lastName ? (
                <>
                  <br />
                  {config.lastName}
                </>
              ) : null}
            </div>
            {config.jobTitle ? (
              <div style={{ marginTop: 7 * scale, fontSize: 11 * scale, lineHeight: 1.35, opacity: 0.85 }}>
                {config.jobTitle}
              </div>
            ) : null}
            {config.company ? (
              <div style={{ marginTop: 2 * scale, fontSize: 12 * scale, fontWeight: 600 }}>
                {config.company}
              </div>
            ) : null}
            {config.reference ? (
              <div
                style={{
                  marginTop: 9 * scale,
                  fontSize: 8.5 * scale,
                  letterSpacing: 1.1 * scale,
                  opacity: 0.6,
                }}
              >
                {config.reference}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {guides ? <BadgeGuides ppi={ppi} /> : null}
    </div>
  );
}

function BadgeGuides({ ppi }: { ppi: number }) {
  const px = (i: number) => i * ppi;
  const w = px(BADGE_SPEC.bleedW);
  const h = px(BADGE_SPEC.bleedH);
  const trimX = px((BADGE_SPEC.bleedW - BADGE_SPEC.trimW) / 2);
  const trimY = px((BADGE_SPEC.bleedH - BADGE_SPEC.trimH) / 2);
  const slot = BADGE_SPEC.slot;
  const klik = BADGE_SPEC.klik;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} fill="none" stroke="#EC388A" strokeDasharray="4 3" />
      <rect x={trimX} y={trimY} width={w - trimX * 2} height={h - trimY * 2} fill="none" stroke="#FFEB66" />
      <rect
        x={px(SAFE_INSET_X)}
        y={px(SAFE_INSET_Y)}
        width={px(BADGE_SPEC.safeW)}
        height={px(BADGE_SPEC.safeH)}
        fill="none"
        stroke="#A6FA87"
        strokeDasharray="6 4"
      />
      {[px(slot.fromSide), w - px(slot.fromSide + slot.w)].map((x, i) => (
        <rect
          key={i}
          x={x}
          y={px(slot.fromTop)}
          width={px(slot.w)}
          height={px(slot.h)}
          rx={px(slot.radius)}
          fill="none"
          stroke="#A1FBF9"
        />
      ))}
      <rect
        x={(w - px(klik.w)) / 2}
        y={h - px(klik.fromBottom + klik.h)}
        width={px(klik.w)}
        height={px(klik.h)}
        rx={px(klik.radius)}
        fill="none"
        stroke="#A1FBF9"
      />
    </svg>
  );
}
