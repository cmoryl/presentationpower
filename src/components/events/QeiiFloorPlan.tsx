// The rebuilt QEII floor plan, drawn from our own geometry and live type.
//
// Every wall and symbol is the issued artwork rebuilt as paths. All typesetting —
// size, multi-line names, event lines, lockups and collision handling — comes from
// qeiiPlanLayout, so the page, the SVG download and the tests agree exactly. The
// ground is a solid brand token; no artwork is used as a background.

import { useMemo, useRef } from "react";

import {
  QEII_PLAN_TOKENS,
  qeiiLabelInk,
  qeiiMarkUrl,
  qeiiPlanInk,
  type QeiiMarkVariant,
  type QeiiPlanFace,
} from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiRepeatedSymbolShapes, qeiiWallWidth } from "@/lib/next-london-qeii-symbols";
import {
  qeiiColourKey,
  qeiiColourPaint,
  qeiiRoomTextInk,
  type QeiiRoomColours,
} from "@/lib/next-london-qeii-rooms";
import type { QeiiMapEdits } from "@/lib/qeii-map-edits";
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
  /** Multiplies the venue's own wall weight; 0.55 is the house setting. */
  wallWeight?: number;
  /** Draw every cubicle figure the venue drew instead of one bathroom symbol. */
  showAllSymbols?: boolean;
  /** Ring the block of this room so a search result is findable on the plan. */
  highlightRoom?: string;
  /** Saved live edits: corrected names and lines, nudged positions. */
  edits?: QeiiMapEdits;
  /** Names and lockups can be dragged, and picking one opens its fields. */
  editable?: boolean;
  /** Called with the room's issued name and its new total nudge, in plan units. */
  onMoveRoom?: (room: string, dx: number, dy: number) => void;
  /** Called when a room block is clicked in editing mode. */
  onPickRoom?: (room: string) => void;
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
  wallWeight,
  showAllSymbols = false,
  highlightRoom,
  edits,
  editable = false,
  onMoveRoom,
  onPickRoom,
  className,
}: QeiiFloorPlanProps) {
  const layout = useMemo(
    () => qeiiPlanLayout(floor, { labelScale, showUse, showMarks, markScale, edits }),
    [floor, labelScale, showUse, showMarks, markScale, edits],
  );
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ room: string; x: number; y: number; dx: number; dy: number } | null>(null);

  const paint = useMemo(() => qeiiColourPaint(floor, roomColours), [floor, roomColours]);
  const hidden = useMemo(
    () => (showAllSymbols ? new Set<number>() : qeiiRepeatedSymbolShapes(floor)),
    [floor, showAllSymbols],
  );
  const keyRows = useMemo(
    () => (showKey ? qeiiColourKey(floor, roomColours, keyLabels) : []),
    [floor, roomColours, keyLabels, showKey],
  );
  const keyStep = floor.w * 0.038;
  const keyH = keyRows.length ? keyStep * (keyRows.length + 1.2) : 0;

  /** Screen pixels → plan units, so a drag moves the name exactly as far as the pointer. */
  function unitsPerPixel(): number {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return 1;
    return floor.w / box.width;
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${floor.w} ${floor.h + keyH}`}
      role="img"
      aria-label={`Queen Elizabeth II Centre ${floor.title} plan, rebuilt as native artwork`}
      className={className}
    >
      <rect width={floor.w} height={floor.h + keyH} fill={QEII_PLAN_TOKENS.surface} />

      {floor.shapes.map((shape, i) => {
        // Repeated WC cubicle figures are left undrawn; one bathroom symbol stays.
        if (hidden.has(i)) return null;
        const stroke = qeiiPlanInk(shape.stroke, face);
        const chosen = paint.fills.get(i);
        return (
          <path
            key={`s-${i}`}
            d={shape.d}
            fill={chosen ?? qeiiPlanInk(shape.fill, face) ?? "none"}
            stroke={stroke}
            strokeWidth={stroke ? qeiiWallWidth(shape, wallWeight) : undefined}
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
            // A light room colour swallows the reverse lockup, so that one falls back
            // to the colour file. An explicit all-white or colour choice is kept.
            const variant = ink === "#03002C" && markVariant === "reverse" ? "colour" : markVariant;
            const pad = block.size * 0.32;
            const lit =
              !!highlightRoom && room.toLowerCase() === highlightRoom.trim().toLowerCase();
            return (
              <g key={block.key}>
                {lit ? (
                  <rect
                    x={block.box.x0 - block.size * 0.9}
                    y={block.box.y0 - block.size * 0.9}
                    width={block.box.x1 - block.box.x0 + block.size * 1.8}
                    height={block.box.y1 - block.box.y0 + block.size * 1.8}
                    rx={block.size * 0.6}
                    fill="none"
                    stroke={QEII_PLAN_TOKENS.accent}
                    strokeWidth={block.size * 0.16}
                    transform={transform}
                  />
                ) : null}
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
