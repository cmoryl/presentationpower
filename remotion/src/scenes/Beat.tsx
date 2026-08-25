import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Card, Chip, Counter, Rise } from "../components";
import { C, SPECTRUM } from "../theme";
import type { Beat as BeatType } from "../data";

/** Visual 1 — the look assembling: swatch row + spec rows checking in. */
const LookVisual: React.FC<{ rows: readonly string[] }> = ({ rows }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
        {SPECTRUM.map((c, i) => {
          const p = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 200 } });
          return (
            <div
              key={c}
              style={{
                height: 58,
                flex: 1,
                borderRadius: 10,
                background: c,
                transform: `scaleY(${p})`,
                transformOrigin: "bottom",
                opacity: 0.92,
              }}
            />
          );
        })}
      </div>
      {rows.map((r, i) => {
        const p = spring({ frame: frame - 22 - i * 8, fps, config: { damping: 200 } });
        return (
          <div
            key={r}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "15px 0",
              borderTop: i === 0 ? "none" : `1px solid ${C.hair}`,
              opacity: p,
              transform: `translateX(${interpolate(p, [0, 1], [16, 0])}px)`,
            }}
          >
            <span style={{ fontSize: 23, color: C.ink }}>{r}</span>
            <span style={{ fontSize: 20, color: C.teal, fontWeight: 600 }}>locked</span>
          </div>
        );
      })}
    </div>
  );
};

/** Visual 2 — the gate: rows pass, the last one is held back. */
const GatesVisual: React.FC<{ rows: readonly string[] }> = ({ rows }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div>
      {rows.map((r, i) => {
        const p = spring({ frame: frame - 10 - i * 10, fps, config: { damping: 200 } });
        const held = i === rows.length - 1;
        const bar = spring({
          frame: frame - 20 - i * 10,
          fps,
          durationInFrames: 34,
          config: { damping: 200 },
        });
        return (
          <div
            key={r}
            style={{
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)`,
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 23, color: held ? C.inkSoft : C.ink }}>{r}</span>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: held ? C.coral : C.blue,
                }}
              >
                {held ? "held" : "pass"}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: C.hair, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(held ? 0.36 : 1) * bar * 100}%`,
                  borderRadius: 99,
                  background: held ? C.coral : SPECTRUM[i % SPECTRUM.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Visual 3 — one source fanning out to every channel. */
const FanoutVisual: React.FC<{ rows: readonly string[] }> = ({ rows }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  return (
    <div>
      <div
        style={{
          opacity: src,
          border: `1px solid ${C.hair}`,
          borderRadius: 14,
          padding: "16px 20px",
          fontSize: 22,
          color: C.ink,
          background: "#fff",
          marginBottom: 22,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Master look</span>
        <span style={{ color: C.blue, fontWeight: 600 }}>published</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {rows.map((r, i) => {
          const p = spring({ frame: frame - 20 - i * 9, fps, config: { damping: 200 } });
          return (
            <div
              key={r}
              style={{
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
                borderRadius: 16,
                border: `1px solid ${C.hair}`,
                background: "#fff",
                padding: 18,
                minHeight: 104,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 8,
                  borderRadius: 3,
                  background: SPECTRUM[i % SPECTRUM.length],
                  marginBottom: 14,
                }}
              />
              <div style={{ fontSize: 22, color: C.ink }}>{r}</div>
              <div style={{ fontSize: 17, color: C.inkSoft, marginTop: 6 }}>inherits the look</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Beat: React.FC<{ beat: BeatType; duration: number }> = ({ beat, duration }) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [duration - 22, duration - 2], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const float = Math.sin(frame / 55) * 5;
  return (
    <AbsoluteFill
      style={{
        opacity: out,
        padding: "0 118px",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.02fr 0.98fr",
          gap: 74,
          alignItems: "center",
        }}
      >
        <div>
          <Rise delay={0} y={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <span
                style={{ fontSize: 19, fontWeight: 600, letterSpacing: "0.2em", color: C.blue }}
              >
                {beat.n}
              </span>
              <span style={{ height: 1, width: 74, background: C.hair }} />
            </div>
          </Rise>
          <Rise delay={6} y={30}>
            <div
              style={{
                fontSize: 68,
                lineHeight: 1.04,
                letterSpacing: "-0.035em",
                fontWeight: 600,
                color: C.ink,
              }}
            >
              {beat.title}
            </div>
          </Rise>
          <Rise delay={16} y={22}>
            <div
              style={{
                marginTop: 20,
                fontSize: 27,
                lineHeight: 1.42,
                color: C.inkSoft,
                maxWidth: 720,
              }}
            >
              {beat.body}
            </div>
          </Rise>
          <div style={{ marginTop: 40, display: "flex", alignItems: "flex-end", gap: 30 }}>
            <div>
              <Counter
                to={beat.stat.to}
                prefix={beat.stat.prefix}
                suffix={beat.stat.suffix}
                delay={34}
                size={118}
                color={C.navy}
              />
              <Rise delay={52} y={12}>
                <div style={{ fontSize: 22, color: C.inkSoft, marginTop: 8 }}>
                  {beat.stat.label}
                </div>
              </Rise>
            </div>
          </div>
          <div style={{ marginTop: 30 }}>
            <Chip label={beat.saved} tone={C.coral} delay={62} />
          </div>
        </div>

        <Rise delay={8} y={40}>
          <Card style={{ transform: `translateY(${float}px)` }}>
            {beat.visual === "look" ? (
              <LookVisual rows={beat.rows} />
            ) : beat.visual === "gates" ? (
              <GatesVisual rows={beat.rows} />
            ) : (
              <FanoutVisual rows={beat.rows} />
            )}
          </Card>
        </Rise>
      </div>
    </AbsoluteFill>
  );
};
