// The rebuilt QEII floor plan, drawn from our own geometry and live type.
//
// Every wall and symbol is the issued artwork rebuilt as paths. All typesetting —
// size, multi-line names, event lines, lockups and collision handling — comes from
// qeiiPlanLayout, so the page, the SVG download and the tests agree exactly. The
// ground is a solid brand token; no artwork is used as a background.

import { useMemo } from "react";

import { QEII_PLAN_TOKENS, qeiiLabelInk, qeiiPlanInk, type QeiiPlanFace } from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
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
  className?: string;
};

export function QeiiFloorPlan({
  floor,
  face = "issued",
  labelScale = 1,
  showLabels = true,
  showUse = false,
  showMarks = false,
  className,
}: QeiiFloorPlanProps) {
  const layout = useMemo(
    () => qeiiPlanLayout(floor, { labelScale, showUse, showMarks }),
    [floor, labelScale, showUse, showMarks],
  );

  return (
    <svg
      viewBox={`0 0 ${floor.w} ${floor.h}`}
      role="img"
      aria-label={`Queen Elizabeth II Centre ${floor.title} plan, rebuilt as native artwork`}
      className={className}
    >
      <rect width={floor.w} height={floor.h} fill={QEII_PLAN_TOKENS.surface} />
      {floor.shapes.map((shape, i) => {
        const stroke = qeiiPlanInk(shape.stroke, face);
        return (
          <path
            key={`s-${i}`}
            d={shape.d}
            fill={qeiiPlanInk(shape.fill, face) ?? "none"}
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
            return (
              <g key={block.key}>
                {block.marks.map((m) => {
                  const w = block.markH * m.ratio;
                  const x = markX;
                  markX += w + block.size * 0.35;
                  return (
                    <image
                      key={m.divisionId}
                      href={m.urlReverse}
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
                    fill={qeiiLabelInk()}
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
                    fill={qeiiLabelInk()}
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
    </svg>
  );
}
