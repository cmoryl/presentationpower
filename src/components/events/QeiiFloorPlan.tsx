// The rebuilt QEII floor plan, drawn from our own geometry and live type.
//
// Every wall and symbol is the issued artwork rebuilt as paths, so the plan can be
// re-inked, room names retypeset and the whole thing handed on as an SVG. The
// ground is a solid brand token; no artwork is used as a background.

import {
  QEII_PLAN_TOKENS,
  qeiiLabelInk,
  qeiiLabelSize,
  qeiiLabelTransform,
  qeiiPlanInk,
  type QeiiPlanFace,
} from "@/lib/next-london-qeii-plan";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiFloorPlanProps = {
  floor: QeiiFloorVector;
  face?: QeiiPlanFace;
  labelScale?: number;
  showLabels?: boolean;
  className?: string;
};

export function QeiiFloorPlan({
  floor,
  face = "issued",
  labelScale = 1,
  showLabels = true,
  className,
}: QeiiFloorPlanProps) {
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
        ? floor.labels.map((label, i) => {
            const size = qeiiLabelSize(label, labelScale);
            const use = showUse ? qeiiLabelUse(label, floor.id) : undefined;
            const transform = qeiiLabelTransform(label);
            const font = { fontFamily: "Geist, 'Geist Variable', sans-serif", fontWeight: 600 };
            return (
              <g key={`l-${i}`}>
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={size}
                  fill={qeiiLabelInk()}
                  transform={transform}
                  style={font}
                >
                  {label.text}
                </text>
                {use ? (
                  <text
                    x={label.x}
                    y={label.y + size * 1.15}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 0.72}
                    fill={qeiiLabelInk()}
                    transform={transform}
                    style={font}
                  >
                    {use}
                  </text>
                ) : null}
              </g>
            );
          })
        : null}
    </svg>
  );
}
