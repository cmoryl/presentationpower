import type { CSSProperties } from "react";

import {
  BADGE_SPEC,
  BADGE_NAVY,
  BADGE_EVENT,
  BADGE_BACK_INFO,
  BADGE_ROLES,
  SAFE_INSET_X,
  SAFE_INSET_Y,
  badgeLockup,
  type BadgeAttendee,
} from "@/lib/next-badge";
import type { NextDivisionBrand } from "@/lib/next-brand-guide";

export type BadgeSide = "front" | "back";

type Props = {
  division: NextDivisionBrand;
  attendee: BadgeAttendee;
  side?: BadgeSide;
  /** Pixels per inch used for on-screen rendering. Print uses 96 = 1in. */
  ppi?: number;
  /** Draws bleed / trim / safe-area / cutout guides over the artwork. */
  guides?: boolean;
  /** City line for the City Series variant. */
  cityLabel?: string;
  style?: CSSProperties;
};

/** Deterministic pseudo-QR block — a placeholder for the real registration code. */
function QrBlock({ seed, size, dark }: { seed: string; size: number; dark: string }) {
  const n = 21;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push(((h >> 16) & 1) === 1);
  }
  const finder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const cell = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} aria-hidden role="presentation">
      <rect width={n} height={n} fill="#FFFFFF" />
      {cells.map((on, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        if (finder(r, c) || !on) return null;
        return <rect key={i} x={c} y={r} width={1} height={1} fill={dark} />;
      })}
      {[
        [0, 0],
        [0, n - 7],
        [n - 7, 0],
      ].map(([r, c]) => (
        <g key={`${r}-${c}`} fill={dark}>
          <rect x={c} y={r} width={7} height={7} />
          <rect x={c + 1} y={r + 1} width={5} height={5} fill="#FFFFFF" />
          <rect x={c + 2} y={r + 2} width={3} height={3} />
        </g>
      ))}
      <rect width={n} height={n} fill="none" stroke={dark} strokeWidth={0.25} opacity={0.4} />
      <rect width={0} height={0} x={cell} y={cell} />
    </svg>
  );
}

export function NextBadge({
  division,
  attendee,
  side = "front",
  ppi = 96,
  guides = false,
  cityLabel,
  style,
}: Props) {
  const u = (inches: number) => inches * ppi;
  const accent = division.accentArtwork || division.accent;
  const role = BADGE_ROLES.find((r) => r.id === attendee.roleId) ?? BADGE_ROLES[0];
  const lockup = badgeLockup(division, "white");
  const isCity = division.id === "city-series";

  const { bleedW, bleedH, slot, klik } = BADGE_SPEC;

  const shell: CSSProperties = {
    position: "relative",
    width: u(bleedW),
    height: u(bleedH),
    overflow: "hidden",
    background: BADGE_NAVY,
    color: "#FFFFFF",
    fontFamily: "'Geist', system-ui, sans-serif",
    ...style,
  };

  const safeBox: CSSProperties = {
    position: "absolute",
    left: u(SAFE_INSET_X),
    top: u(SAFE_INSET_Y),
    width: u(BADGE_SPEC.safeW),
    height: u(BADGE_SPEC.safeH),
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={shell} data-badge-side={side} data-division={division.id}>
      {/* --- background system ------------------------------------------- */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 70% at 100% 0%, ${accent}59 0%, ${accent}00 58%), radial-gradient(90% 55% at 0% 100%, ${accent}33 0%, ${accent}00 60%)`,
        }}
      />
      <svg
        aria-hidden
        viewBox="0 0 458 655"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M ${-60 + i * 44} 655 L ${190 + i * 44} 250 L ${470 + i * 44} 250`}
            fill="none"
            stroke={accent}
            strokeWidth={1.6}
            opacity={0.22 - i * 0.03}
          />
        ))}
      </svg>

      {side === "front" ? (
        <div style={safeBox}>
          {/* lockup */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            {lockup.src ? (
              <img
                src={lockup.src}
                alt={`${division.name} lockup`}
                style={{ height: u(0.72), width: "auto", maxWidth: u(2.5) }}
              />
            ) : null}
            <div
              style={{
                textAlign: "right",
                fontSize: u(0.085),
                letterSpacing: "0.16em",
                lineHeight: 1.5,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {BADGE_EVENT.datesLabel}
              <br />
              {cityLabel ?? (isCity ? "City Series" : BADGE_EVENT.venue)}
            </div>
          </div>

          <div
            aria-hidden
            style={{ marginTop: u(0.16), height: u(0.03), width: u(0.9), background: accent, borderRadius: 99 }}
          />

          {/* identity */}
          <div style={{ marginTop: "auto", marginBottom: "auto", paddingBottom: u(0.1) }}>
            <div
              style={{
                fontSize: u(0.31),
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.02,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              {attendee.firstName}
            </div>
            <div
              style={{
                fontSize: u(0.42),
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
                marginTop: u(0.02),
                wordBreak: "break-word",
              }}
            >
              {attendee.lastName}
            </div>
            {attendee.pronouns ? (
              <div
                style={{
                  marginTop: u(0.07),
                  fontSize: u(0.09),
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: accent,
                }}
              >
                {attendee.pronouns}
              </div>
            ) : null}
            <div
              style={{
                marginTop: u(0.14),
                fontSize: u(0.125),
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              {attendee.jobTitle}
            </div>
            <div style={{ fontSize: u(0.15), fontWeight: 600, lineHeight: 1.3, marginTop: u(0.03) }}>
              {attendee.company}
            </div>
          </div>

          {/* QR + reference, sits above the Klik cutout */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: u(0.14),
              paddingBottom: u(0.62),
            }}
          >
            <div style={{ maxWidth: u(2.1) }}>
              <div
                style={{
                  fontSize: u(0.075),
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                Scan to connect
              </div>
              <div style={{ fontSize: u(0.095), marginTop: u(0.04), color: "rgba(255,255,255,0.85)" }}>
                {attendee.reference ?? BADGE_EVENT.url}
              </div>
            </div>
            <div style={{ background: "#FFFFFF", padding: u(0.045), borderRadius: u(0.05), lineHeight: 0 }}>
              <QrBlock seed={`${attendee.reference ?? ""}${attendee.lastName}`} size={u(0.78)} dark={BADGE_NAVY} />
            </div>
          </div>
        </div>
      ) : (
        <div style={safeBox}>
          <div
            style={{
              fontSize: u(0.085),
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {division.name}
          </div>
          <div style={{ fontSize: u(0.17), fontWeight: 700, letterSpacing: "-0.02em", marginTop: u(0.04) }}>
            {BADGE_EVENT.datesLabel}
          </div>
          <div style={{ fontSize: u(0.105), color: "rgba(255,255,255,0.72)", marginTop: u(0.02) }}>
            {BADGE_EVENT.venue} · {BADGE_EVENT.city}
          </div>

          <div
            style={{
              marginTop: u(0.2),
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: u(0.16),
            }}
          >
            {BADGE_BACK_INFO.map((block) => (
              <div key={block.label}>
                <div
                  style={{
                    fontSize: u(0.075),
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: accent,
                    paddingBottom: u(0.04),
                    borderBottom: `${Math.max(1, u(0.008))}px solid ${accent}66`,
                  }}
                >
                  {block.label}
                </div>
                {block.lines.map((l) => (
                  <div
                    key={l}
                    style={{
                      fontSize: u(0.088),
                      lineHeight: 1.5,
                      color: "rgba(255,255,255,0.82)",
                      marginTop: u(0.03),
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", paddingBottom: u(0.62) }}>
            <div style={{ fontSize: u(0.12), fontWeight: 600, color: accent }}>{BADGE_EVENT.hashtag}</div>
            <div style={{ fontSize: u(0.09), color: "rgba(255,255,255,0.6)", marginTop: u(0.02) }}>
              {BADGE_EVENT.url} · Please return your badge and lanyard at the end of the event.
            </div>
          </div>
        </div>
      )}

      {/* --- role band (full bleed) --------------------------------------- */}
      {side === "front" ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: u(klik.fromBottom + klik.h + 0.1),
            background: role.accentBand ? accent : "rgba(255,255,255,0.14)",
            color: role.accentBand ? BADGE_NAVY : "#FFFFFF",
            padding: `${u(0.06)}px ${u(SAFE_INSET_X)}px`,
            fontSize: u(0.115),
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {role.label}
        </div>
      ) : null}

      {/* --- die cuts ------------------------------------------------------ */}
      <div aria-hidden>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: u(slot.fromTop),
              [i === 0 ? "left" : "right"]: u(slot.fromSide),
              width: u(slot.w),
              height: u(slot.h),
              borderRadius: u(slot.radius),
              background: "#FFFFFF",
              boxShadow: `inset 0 0 0 ${Math.max(1, u(0.008))}px rgba(0,0,0,0.25)`,
            } as CSSProperties}
          />
        ))}
        <div
          style={{
            position: "absolute",
            bottom: u(klik.fromBottom),
            left: "50%",
            transform: "translateX(-50%)",
            width: u(klik.w),
            height: u(klik.h),
            borderRadius: u(klik.radius),
            background: "#FFFFFF",
            boxShadow: `inset 0 0 0 ${Math.max(1, u(0.008))}px rgba(0,0,0,0.25)`,
          }}
        />
      </div>

      {/* --- print guides --------------------------------------------------- */}
      {guides ? (
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: u(BADGE_SPEC.bleed),
              top: u(BADGE_SPEC.bleed),
              width: u(BADGE_SPEC.trimW),
              height: u(BADGE_SPEC.trimH),
              outline: `1px solid rgba(255,255,255,0.85)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: u(SAFE_INSET_X),
              top: u(SAFE_INSET_Y),
              width: u(BADGE_SPEC.safeW),
              height: u(BADGE_SPEC.safeH),
              outline: `1px dashed ${accent}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: u(BADGE_SPEC.bleed),
              bottom: u(0.03),
              fontSize: u(0.07),
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            BLEED {bleedW}″ × {bleedH}″ · TRIM {BADGE_SPEC.trimW}″ × {BADGE_SPEC.trimH}″ · SAFE{" "}
            {BADGE_SPEC.safeW}″ × {BADGE_SPEC.safeH}″
          </div>
        </div>
      ) : null}
    </div>
  );
}
