import type { CSSProperties } from "react";

import {
  BADGE_SPEC,
  BADGE_LOCKUP_WINDOW,
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
  /** Front carries the attendee copy; the back is the same artwork, logo only. */
  side?: "front" | "back";
  style?: CSSProperties;
  className?: string;
};

/**
 * General NEXT badge — the approved artwork face run full bleed. The only thing
 * a division changes is the mark at the head: its window is repainted from the
 * same artwork and the division lockup is dropped straight in, so no plate,
 * panel or extra copy is ever added.
 */
export function CityBadge({
  config,
  ppi = 96,
  guides = false,
  side = "front",
  style,
  className,
}: Props) {
  const face = cityBadgeFace(config.face);
  const lockup = cityBadgeLockup(config.divisionId);
  const division = cityBadgeDivision(config.divisionId);
  // City Series is already the baked mark, so its artwork stays untouched.
  const swapLockup = config.showLockup && !!lockup.url && config.divisionId !== "city-series";
  const px = (inches: number) => inches * ppi;
  const w = px(BADGE_SPEC.bleedW);
  const h = px(BADGE_SPEC.bleedH);
  const safeX = px(SAFE_INSET_X);
  const safeY = px(SAFE_INSET_Y);
  const klikTop = h - px(BADGE_SPEC.klik.fromBottom + BADGE_SPEC.klik.h);
  const scale = ppi / 96;
  const markUrl = face.id === "light" ? division.colorUrl || lockup.url : lockup.url;

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
            top: px(BADGE_LOCKUP_WINDOW.top),
            height: px(BADGE_LOCKUP_WINDOW.height),
            // Same artwork, sampled from a mark-free band, so the field reads
            // continuous where the original lockup used to sit.
            backgroundImage: `url(${face.artwork})`,
            backgroundSize: `${w}px ${h}px`,
            backgroundPosition: `0px ${-px(BADGE_LOCKUP_WINDOW.sampleFrom)}px`,
            backgroundRepeat: "no-repeat",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={markUrl}
            alt=""
            aria-hidden
            style={{
              width: px(BADGE_LOCKUP_WINDOW.markW),
              height: px(BADGE_LOCKUP_WINDOW.markW) / lockup.ratio,
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ) : null}

      {/* Safe-area copy — front only; the back is artwork and mark alone. */}
      {side === "front" ? (
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
      ) : null}


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
