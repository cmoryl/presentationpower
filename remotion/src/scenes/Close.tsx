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
        <Counter to={close.pct.to} suffix={close.pct.suffix ?? "%"} delay={8} size={190} color={C.navy} />
        <Rise delay={24} y={20}>
          <div style={{ fontSize: 34, color: C.ink, paddingBottom: 26, maxWidth: 520, lineHeight: 1.25 }}>
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
            <div style={{ fontSize: 13, letterSpacing: "0.3em", color: C.inkSoft, fontWeight: 500 }}>
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
