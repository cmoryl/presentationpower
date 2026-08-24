import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRICKS, C, MARK_H, MARK_W, SPECTRUM } from "./theme";

/** Default entrance: rise + fade, springy but never bouncy. */
export const Rise: React.FC<{
  delay?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, y = 26, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.7 } });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [y, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Element five-brick mark, bricks springing in one after another. */
export const BrickMark: React.FC<{ size?: number; delay?: number; drawn?: boolean }> = ({
  size = 120,
  delay = 0,
  drawn = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <svg width={size} height={(size * MARK_H) / MARK_W} viewBox={`0 0 ${MARK_W} ${MARK_H}`}>
      {BRICKS.map((b, i) => {
        const p = drawn
          ? spring({ frame: frame - delay - i * 5, fps, config: { damping: 200, mass: 0.6 } })
          : 1;
        return (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={2.5}
            fill={b.color}
            opacity={p}
            transform={`translate(${interpolate(p, [0, 1], [-14, 0])} 0)`}
          />
        );
      })}
    </svg>
  );
};

/** Airy paper backdrop: soft light pools, hairline grid, drifting brick rail. */
export const Paper: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 190) * 26;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at ${18 + drift / 6}% -10%, #E4EDFF 0%, rgba(228,237,255,0) 60%),
             radial-gradient(90% 80% at 100% 110%, #EAF7F7 0%, rgba(234,247,247,0) 62%),
             linear-gradient(180deg, ${C.paper} 0%, ${C.paperDeep} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `linear-gradient(${C.hair} 1px, transparent 1px), linear-gradient(90deg, ${C.hair} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: `${drift}px ${-drift}px`,
          maskImage: "radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 85%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 8,
          display: "flex",
        }}
      >
        {SPECTRUM.map((c, i) => (
          <div key={i} style={{ flex: i === 2 ? 2 : 1, background: c, opacity: 0.9 }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Number that counts up on a spring, used for every statistic. */
export const Counter: React.FC<{
  to: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  size?: number;
  color?: string;
}> = ({ to, prefix = "", suffix = "", delay = 0, size = 132, color = C.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, durationInFrames: 44, config: { damping: 200 } });
  const value = Math.round(to * p);
  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 0.92,
        letterSpacing: "-0.045em",
        fontWeight: 600,
        color,
        fontVariantNumeric: "tabular-nums",
        display: "flex",
        alignItems: "baseline",
      }}
    >
      <span style={{ opacity: interpolate(p, [0, 0.15], [0, 1], { extrapolateRight: "clamp" }) }}>
        {prefix}
        {value}
      </span>
      <span style={{ fontSize: size * 0.36, letterSpacing: "-0.02em", color: C.inkSoft }}>
        {suffix}
      </span>
    </div>
  );
};

/** Frosted card surface — the film's only container shape. */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: "rgba(255,255,255,0.82)",
      border: `1px solid ${C.hair}`,
      borderRadius: 22,
      boxShadow: "0 24px 60px -38px rgba(11,18,32,0.35)",
      padding: 34,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Small pill used for time-saved and section cues. */
export const Chip: React.FC<{ label: string; tone?: string; delay?: number }> = ({
  label,
  tone = C.blue,
  delay = 0,
}) => (
  <Rise delay={delay} y={12}>
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 16px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.9)",
        border: `1px solid ${C.hair}`,
        fontSize: 20,
        color: C.ink,
        fontWeight: 500,
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 3, background: tone }} />
      {label}
    </div>
  </Rise>
);
