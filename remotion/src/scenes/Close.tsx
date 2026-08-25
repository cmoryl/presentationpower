import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BrickMark, Counter, Rise } from "../components";
import { C } from "../theme";
import type { Film } from "../data";

export const Close: React.FC<{ film: Film }> = ({ film }) => {
  const frame = useCurrentFrame();
  const { close } = film;
  const fade = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fade, padding: "0 132px", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          right: 132,
          top: "50%",
          transform: "translateY(-50%)",
          width: 470,
        }}
      >
        {film.beats.map((b, i) => (
          <Rise key={b.n} delay={14 + i * 8} y={24}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                background: "rgba(255,255,255,0.86)",
                border: `1px solid ${C.hair}`,
                borderRadius: 18,
                padding: "20px 24px",
                marginBottom: 14,
              }}
            >
              <span
                style={{ fontSize: 44, fontWeight: 600, color: C.navy, letterSpacing: "-0.04em" }}
              >
                {b.stat.to}
                <span style={{ fontSize: 22, color: C.inkSoft }}>{b.stat.suffix ?? ""}</span>
              </span>
              <span style={{ fontSize: 21, color: C.inkSoft, lineHeight: 1.3 }}>
                {b.stat.label}
              </span>
            </div>
          </Rise>
        ))}
      </div>
      <Rise delay={2} y={18}>
        <div
          style={{
            fontSize: 20,
            letterSpacing: "0.24em",
            color: C.blue,
            fontWeight: 600,
            marginBottom: 26,
          }}
        >
          TIME SAVED
        </div>
      </Rise>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 44, marginBottom: 34 }}>
        <Counter
          to={close.pct.to}
          suffix={close.pct.suffix ?? "%"}
          delay={8}
          size={190}
          color={C.navy}
        />
        <Rise delay={24} y={20}>
          <div
            style={{
              fontSize: 34,
              color: C.ink,
              paddingBottom: 26,
              maxWidth: 520,
              lineHeight: 1.25,
            }}
          >
            {close.pct.label}
          </div>
        </Rise>
      </div>

      <Rise delay={30} y={22}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 30 }}>
          <span style={{ color: C.inkSoft, textDecoration: "line-through" }}>{close.from}</span>
          <span style={{ color: C.coral, fontSize: 26 }}>→</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>{close.to}</span>
        </div>
      </Rise>

      <Rise delay={44} y={20}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 56 }}>
          <BrickMark size={54} delay={46} />
          <div>
            <div
              style={{ fontSize: 13, letterSpacing: "0.3em", color: C.inkSoft, fontWeight: 500 }}
            >
              TRANSPERFECT
            </div>
            <div style={{ fontSize: 26, letterSpacing: "0.3em", fontWeight: 600, color: C.ink }}>
              ELEMENT
            </div>
          </div>
          <div style={{ width: 1, height: 46, background: C.hair, marginLeft: 12 }} />
          <div style={{ fontSize: 24, color: C.inkSoft }}>{close.kicker}</div>
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
