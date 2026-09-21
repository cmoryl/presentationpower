// The rebuilt QEII floor plan, drawn from our own geometry and live type.
//
// Every wall and symbol is the issued artwork rebuilt as paths. All typesetting —
// size, multi-line names, event lines, lockups and collision handling — comes from
// qeiiPlanLayout, so the page, the SVG download and the tests agree exactly. The
// ground is a solid brand token; no artwork is used as a background.

import { useMemo } from "react";

import {
  QEII_PLAN_TOKENS,
  qeiiLabelInk,
  qeiiMarkUrl,
  qeiiPlanInk,
  type QeiiMarkVariant,
  type QeiiPlanFace,
} from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import {
  qeiiColourKey,
  qeiiColourPaint,
  qeiiRoomTextInk,
  type QeiiRoomColours,
} from "@/lib/next-london-qeii-rooms";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiFloorPlanProps = {
  floor: QeiiFloorVector;
  face?: QeiiPlanFace;
  labelScale?: number;
  showLabels?: boolean;
  /** Print what each recorded space holds at the event beneath its name. */
  showUse?: boolean;
  /** Print the division lockup above a room held by a division area. */
  showMarks?: boolean;
  /** Which approved lockup file the markers use. */
  markVariant?: QeiiMarkVariant;
  /** Multiplies the lockup height; 1 keeps the house setting. */
  markScale?: number;
  /** Room name → approved fill colour. */
  roomColours?: QeiiRoomColours;
  /** Saved names for the colour key, keyed by colour. */
  keyLabels?: Record<string, string>;
  /** Print the colour key beneath the plan. */
  showKey?: boolean;
  className?: string;
};

export function QeiiFloorPlan({
  floor,
  face = "issued",
  labelScale = 1,
  showLabels = true,
  showUse = false,
  showMarks = false,
  markVariant = "reverse",
  markScale = 1,
  roomColours = {},
  keyLabels = {},
  showKey = true,
  className,
}: QeiiFloorPlanProps) {
  const layout = useMemo(
    () => qeiiPlanLayout(floor, { labelScale, showUse, showMarks, markScale }),
    [floor, labelScale, showUse, showMarks, markScale],
  );

  const paint = useMemo(() => qeiiColourPaint(floor, roomColours), [floor, roomColours]);
  const keyRows = useMemo(
    () => (showKey ? qeiiColourKey(floor, roomColours, keyLabels) : []),
    [floor, roomColours, keyLabels, showKey],
  );
  const keyStep = floor.w * 0.038;
  const keyH = keyRows.length ? keyStep * (keyRows.length + 1.2) : 0;

  return (
    <svg
      viewBox={`0 0 ${floor.w} ${floor.h + keyH}`}
      role="img"
      aria-label={`Queen Elizabeth II Centre ${floor.title} plan, rebuilt as native artwork`}
      className={className}
    >
      <rect width={floor.w} height={floor.h + keyH} fill={QEII_PLAN_TOKENS.surface} />
      {floor.shapes.map((shape, i) => {
        const stroke = qeiiPlanInk(shape.stroke, face);
        const chosen = paint.fills.get(i);
        return (
          <path
            key={`s-${i}`}
            d={shape.d}
            fill={chosen ?? qeiiPlanInk(shape.fill, face) ?? "none"}
            stroke={stroke}
            strokeWidth={stroke ? (shape.w ?? 1) : undefined}
          />
        );
      })}
      {showLabels
        ? layout.blocks.map((block) => {
            const transform =
              Math.abs(block.angle) < 0.5
                ? undefined
                : `rotate(${block.angle} ${block.x} ${block.y})`;
            const font = { fontFamily: "Geist, 'Geist Variable', sans-serif", fontWeight: 600 };
            const markRow =
              block.marks.reduce((w, m) => w + block.markH * m.ratio + block.size * 0.35, 0) -
              block.size * 0.35;
            let markX = block.x - markRow / 2;
            const nameTop = block.y - ((block.lines.length - 1) * block.size * 1.05) / 2;
            const lastLine = nameTop + (block.lines.length - 1) * block.size * 1.05;
            const room = block.lines.join(" ");
            const tag = paint.tags.get(room);
            const fill = roomColours[room];
            const ink = tag ? qeiiRoomTextInk(tag) : fill ? qeiiRoomTextInk(fill) : qeiiLabelInk();
            // A light room colour needs the colour lockup, not the reverse one.
            const variant = ink === "#03002C" ? "colour" : markVariant;
            const pad = block.size * 0.32;
            return (
              <g key={block.key}>
                {tag ? (
                  <rect
                    x={block.box.x0 - pad}
                    y={block.box.y0 - pad * 0.6}
                    width={block.box.x1 - block.box.x0 + pad * 2}
                    height={block.box.y1 - block.box.y0 + pad * 1.2}
                    rx={block.size * 0.35}
                    fill={tag}
                    transform={transform}
                  />
                ) : null}
                {block.marks.map((m) => {
                  const w = block.markH * m.ratio;
                  const x = markX;
                  markX += w + block.size * 0.35;
                  return (
                    <image
                      key={m.divisionId}
                      href={qeiiMarkUrl(m, variant)}
                      x={x}
                      y={nameTop - block.size * 0.7 - block.markH}
                      width={w}
                      height={block.markH}
                      transform={transform}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <title>{`${m.name} NEXT`}</title>
                    </image>
                  );
                })}
                {block.lines.map((line, li) => (
                  <text
                    key={`${block.key}-${li}`}
                    x={block.x}
                    y={nameTop + li * block.size * 1.05}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={block.size}
                    fill={ink}
                    transform={transform}
                    style={font}
                  >
                    {line}
                  </text>
                ))}
                {block.use ? (
                  <text
                    x={block.x}
                    y={lastLine + block.size * 0.62 + block.useSize * 0.6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={block.useSize}
                    fill={ink}
                    transform={transform}
                    style={font}
                  >
                    {block.use}
                  </text>
                ) : null}
              </g>
            );
          })
        : null}
      {keyRows.length ? (
        <g>
          {keyRows.map((row, i) => {
            const y = floor.h + keyStep * (0.9 + i);
            return (
              <g key={row.hex}>
                <rect
                  x={floor.w * 0.02}
                  y={y - keyStep * 0.34}
                  width={keyStep * 0.72}
                  height={keyStep * 0.72}
                  rx={keyStep * 0.14}
                  fill={row.hex}
                />
                <text
                  x={floor.w * 0.02 + keyStep}
                  y={y}
                  dominantBaseline="middle"
                  fontSize={keyStep * 0.52}
                  fill={QEII_PLAN_TOKENS.ink}
                  style={{ fontFamily: "Geist, 'Geist Variable', sans-serif", fontWeight: 600 }}
                >
                  {row.label}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}
    </svg>
  );
}
