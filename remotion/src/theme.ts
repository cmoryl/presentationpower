/**
 * Light + airy Element film theme. Everything on screen is built from these
 * tokens so the three role films read as one system.
 */
export const BRICKS = [
  { x: 0, y: 0, w: 100, h: 28.89, color: "#135CFB" },
  { x: 0, y: 35.19, w: 35.48, h: 30.16, color: "#08BFC1" },
  { x: 41.52, y: 35.19, w: 58.48, h: 30.16, color: "#073091" },
  { x: 0, y: 72.09, w: 58.77, h: 29.73, color: "#FC5950" },
  { x: 64.66, y: 72.09, w: 35.34, h: 29.73, color: "#7C4EF4" },
] as const;

export const MARK_W = 100;
export const MARK_H = 101.82;

export const C = {
  paper: "#FBFCFE",
  paperDeep: "#EEF3FB",
  ink: "#0B1220",
  inkSoft: "#5A6577",
  hair: "#DCE4F2",
  blue: "#135CFB",
  teal: "#08BFC1",
  navy: "#073091",
  coral: "#FC5950",
  violet: "#7C4EF4",
} as const;

export const SPECTRUM = [C.blue, C.teal, C.navy, C.coral, C.violet] as const;
