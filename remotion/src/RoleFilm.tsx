import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Geist";
import { Paper } from "./components";
import { Title } from "./scenes/Title";
import { Beat } from "./scenes/Beat";
import { Close } from "./scenes/Close";
import { FILMS } from "./data";
import { C } from "./theme";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

/** Timeline: title, three process beats, time-saved close. 900 frames @ 30fps. */
export const SEGMENTS = [
  { from: 0, duration: 105 },
  { from: 105, duration: 225 },
  { from: 330, duration: 240 },
  { from: 570, duration: 240 },
  { from: 810, duration: 90 },
] as const;

export const RoleFilm: React.FC<{ role: string }> = ({ role }) => {
  const film = FILMS[role];
  if (!film) return null;
  return (
    <AbsoluteFill style={{ fontFamily, color: C.ink, background: C.paper }}>
      <Paper />
      <Sequence from={SEGMENTS[0].from} durationInFrames={SEGMENTS[0].duration}>
        <Title film={film} />
      </Sequence>
      {film.beats.map((beat, i) => {
        const seg = SEGMENTS[i + 1];
        return (
          <Sequence key={beat.n} from={seg.from} durationInFrames={seg.duration}>
            <Beat beat={beat} duration={seg.duration} />
          </Sequence>
        );
      })}
      <Sequence from={SEGMENTS[4].from} durationInFrames={SEGMENTS[4].duration}>
        <Close film={film} />
      </Sequence>
    </AbsoluteFill>
  );
};
