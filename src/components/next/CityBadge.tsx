import type { CSSProperties } from "react";

import {
  BADGE_SPEC,
  BADGE_LOCKUP_WINDOW,
  BADGE_BACK_LINE,
  NEXT_BADGE_GROUND,
  SAFE_INSET_X,
  SAFE_INSET_Y,
  cityBadgeFace,
  cityBadgeLockup,
  type CityBadgeConfig,
} from "@/lib/next-city-badge";

type Props = {
  config: CityBadgeConfig;
  /** Pixels per inch used for rendering. 96 = 1 CSS inch (print scale). */
  ppi?: number;
  /** Bleed / trim / safe-area / cutout guides over the artwork. */
  guides?: boolean;
  /** Front carries the attendee copy; the back is the ground, mark and line. */
  side?: "front" | "back";
  style?: CSSProperties;
  className?: string;
};

/**
 * NEXT attendee badge — the one approved template for NEXT and every sub-NEXT
 * event. The ground, chevron stack and type are drawn live, so each division
 * area is the same artwork with its own white-with-accent lockup on the front
 * and the back.
 */
export function CityBadge({
  config,
  ppi = 96,
  guides = false,
  side = "front",
  style,
  className,
}: Props) {
  const lockup = cityBadgeLockup(config.divisionId);
  const px = (inches: number) => inches * ppi;
  const w = px(BADGE_SPEC.bleedW);
  const h = px(BADGE_SPEC.bleedH);
  const safeX = px(SAFE_INSET_X);
  const safeY = px(SAFE_INSET_Y);
  const klikTop = h - px(BADGE_SPEC.klik.fromBottom + BADGE_SPEC.klik.h);
  const scale = ppi / 96;
  const showMark = config.showLockup && !!lockup.url;
  const markW = px(side === "back" ? BADGE_LOCKUP_WINDOW.backMarkW : BADGE_LOCKUP_WINDOW.markW);

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
        background: NEXT_BADGE_GROUND.core,
        ...style,
      }}
    >
      <BadgeGround w={w} h={h} side={side} />

      {/* Division mark — front sits at the head, back is centred. */}
      {showMark ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            ...(side === "back"
              ? { top: 0, bottom: 0, alignItems: "center" }
              : {
                  top: px(BADGE_LOCKUP_WINDOW.top),
                  height: px(BADGE_LOCKUP_WINDOW.height),
                  alignItems: "center",
                }),
            display: "flex",
            justifyContent: "center",
          }}
        >
          <img
            src={lockup.url}
            alt=""
            aria-hidden
            style={{
              width: markW,
              height: markW / lockup.ratio,
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ) : null}

      {/* The front stays clear below the lockup — that area is covered by the
          badge sleeve, so nothing is printed there. Only the back carries a
          foot line. */}
      {side === "back" ? (
        <div
          style={{
            position: "absolute",
            left: safeX,
            right: safeX,
            bottom: h - klikTop + px(0.1),
            textAlign: "center",
            color: "rgba(255,255,255,0.78)",
            fontSize: 8.5 * scale,
            fontWeight: 600,
            letterSpacing: 3.4 * scale,
          }}
        >
          {BADGE_BACK_LINE}
        </div>
      ) : null}

      {guides ? <BadgeGuides ppi={ppi} /> : null}
    </div>
  );
}

/**
 * The approved ground: a violet → blue ascent with a cool aqua-blue foot, and
 * the NEXT chevron stack as a faint white texture climbing the sheet.
 */
function BadgeGround({ w, h, side }: { w: number; h: number; side: "front" | "back" }) {
  const chevW = w * 0.62;
  const step = h * 0.185;
  const rows = [-0.55, -0.18, 0.19, 0.56, 0.93].map((k) => h * 0.12 + k * step * 2);
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", inset: 0, display: "block" }}
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="nb-ground" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={NEXT_BADGE_GROUND.topLeft} />
          <stop offset="0.34" stopColor={NEXT_BADGE_GROUND.topRight} />
          <stop offset="0.62" stopColor={NEXT_BADGE_GROUND.core} />
          <stop offset="1" stopColor={NEXT_BADGE_GROUND.foot} />
        </linearGradient>
        <radialGradient id="nb-glow" cx="0.16" cy="0.06" r="0.85">
          <stop offset="0" stopColor={NEXT_BADGE_GROUND.topLeft} stopOpacity="0.9" />
          <stop offset="1" stopColor={NEXT_BADGE_GROUND.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nb-core" cx="0.5" cy="0.52" r="0.6">
          <stop offset="0" stopColor="#0B2AB8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0B2AB8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="url(#nb-ground)" />
      <rect width={w} height={h} fill="url(#nb-glow)" />
      <rect width={w} height={h} fill="url(#nb-core)" />
      <g fill={NEXT_BADGE_GROUND.chevronInk} opacity={side === "back" ? 1 : 0.55}>
        {rows.map((y, i) => {
          const x0 = (w - chevW) / 2;
          const rise = step * 0.62;
          const thick = step * 0.42;
          return (
            <path
              key={i}
              d={`M${x0} ${y + rise} L${x0 + chevW / 2} ${y} L${x0 + chevW} ${y + rise} L${x0 + chevW} ${y + rise + thick} L${x0 + chevW / 2} ${y + thick} L${x0} ${y + rise + thick} Z`}
            />
          );
        })}
      </g>
    </svg>
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
      data-bleed-guide="true"
      data-export-ignore="true"
    >
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        fill="none"
        stroke="#EC388A"
        strokeDasharray="4 3"
      />
      <rect
        x={trimX}
        y={trimY}
        width={w - trimX * 2}
        height={h - trimY * 2}
        fill="none"
        stroke="#FFEB66"
      />
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
