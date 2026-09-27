import { useEffect, useState, type RefObject } from "react";

/**
 * Millimetre rulers along the top and left edge of the print sheet.
 * Scale comes from the real trim width, so 10 mm on the ruler is 10 mm on
 * the press sheet. Rulers are chrome only; they sit outside the sheet and
 * never enter an export.
 */
export interface PrintRulersProps {
  targetRef: RefObject<HTMLElement | null>;
  widthMm: number;
}

const SIZE = 20;

export function PrintRulers({ targetRef, widthMm }: PrintRulersProps) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [targetRef]);
  if (!box.w) return null;
  const pxPerMm = box.w / widthMm;
  const heightMm = box.h / pxPerMm;
  const ticks = (lenMm: number) => {
    const out: { mm: number; major: boolean; mid: boolean }[] = [];
    for (let mm = 0; mm <= lenMm; mm += 5) out.push({ mm, major: mm % 50 === 0, mid: mm % 10 === 0 });
    return out;
  };
  const tickCls = "stroke-white/35";
  return (
    <div aria-hidden="true" data-export-ignore="true" className="pointer-events-none">
      <svg
        className="absolute left-0 font-mono"
        style={{ top: -SIZE - 6, width: box.w, height: SIZE }}
        viewBox={`0 0 ${box.w} ${SIZE}`}
      >
        {ticks(widthMm).map((t) => {
          const x = t.mm * pxPerMm;
          const len = t.major ? SIZE : t.mid ? 9 : 5;
          return (
            <g key={t.mm}>
              <line x1={x} x2={x} y1={SIZE - len} y2={SIZE} className={tickCls} />
              {t.mid && t.mm % 20 === 0 ? (
                <text x={x + 3} y={9} className="fill-white/55" fontSize={9}>
                  {t.mm}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <svg
        className="absolute top-0 font-mono"
        style={{ left: -SIZE - 6, width: SIZE, height: box.h }}
        viewBox={`0 0 ${SIZE} ${box.h}`}
      >
        {ticks(heightMm).map((t) => {
          const y = t.mm * pxPerMm;
          const len = t.major ? SIZE : t.mid ? 9 : 5;
          return (
            <g key={t.mm}>
              <line y1={y} y2={y} x1={SIZE - len} x2={SIZE} className={tickCls} />
              {t.mid && t.mm % 20 === 0 ? (
                <text
                  x={9}
                  y={y + 3}
                  className="fill-white/55"
                  fontSize={9}
                  transform={`rotate(-90 9 ${y + 3})`}
                >
                  {t.mm}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
