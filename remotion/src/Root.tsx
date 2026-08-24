import React from "react";
import { Composition } from "remotion";
import { RoleFilm } from "./RoleFilm";

export const RemotionRoot: React.FC = () => (
  <>
    {(["admin", "marketing", "sales"] as const).map((role) => (
      <Composition
        key={role}
        id={role}
        component={RoleFilm}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ role }}
      />
    ))}
  </>
);
