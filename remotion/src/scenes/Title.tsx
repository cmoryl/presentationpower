import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BrickMark, Rise } from "../components";
import { C } from "../theme";
import type { Film } from "../data";

export const Title: React.FC<{ film: Film }> = ({ film }) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [78, 104], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill
      style={{
        opacity: out,
        padding: "0 132px",
        justifyContent: "center",
        transform: `scale(${interpolate(frame, [0, 104], [1, 1.03])})`,
      }}
    >
      <Rise delay={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 46 }}>
          <BrickMark size={72} delay={2} />
          <div>
            <div
              style={{
                fontSize: 15,
                letterSpacing: "0.32em",
                color: C.inkSoft,
                fontWeight: 500,
              }}
            >
              TRANSPERFECT
            </div>
            <div style={{ fontSize: 33, letterSpacing: "0.3em", fontWeight: 600, color: C.ink }}>
              ELEMENT
            </div>
          </div>
        </div>
      </Rise>

      <Rise delay={16} y={34}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.22em",
            color: C.blue,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          {film.role.toUpperCase()}
        </div>
      </Rise>
      {film.headline.map((line, i) => (
        <Rise key={line} delay={24 + i * 9} y={40}>
          <div
            style={{
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: "-0.038em",
              fontWeight: 600,
              color: i === 0 ? C.ink : C.navy,
            }}
          >
            {line}
          </div>
        </Rise>
      ))}
      <Rise delay={48} y={24}>
        <div
          style={{
            marginTop: 30,
            fontSize: 30,
            lineHeight: 1.4,
            color: C.inkSoft,
            maxWidth: 1020,
          }}
        >
          {film.sub}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
