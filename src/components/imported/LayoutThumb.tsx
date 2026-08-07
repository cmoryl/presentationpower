/**
 * Tiny schematic previews of a layout, so the design picker can be scanned
 * visually (funnel vs timeline vs stat wall) instead of read word by word.
 * Purely presentational SVG — no slide rendering cost, safe in long lists.
 */

export type ThumbKind =
  | "funnel"
  | "pyramid"
  | "iceberg"
  | "flywheel"
  | "sankey"
  | "timeline"
  | "timeline-v"
  | "journey"
  | "donut"
  | "gauge"
  | "bars"
  | "statwall"
  | "stat-photo"
  | "cards"
  | "bento"
  | "list"
  | "quote"
  | "image"
  | "image-grid"
  | "cover"
  | "divider"
  | "matrix"
  | "generic";

/** Map a variant id to a schematic family using its naming vocabulary. */
export function thumbKindFor(variantId: string): ThumbKind {
  const v = variantId.toUpperCase();
  const has = (...k: string[]) => k.some((s) => v.includes(s));
  if (has("SANKEY")) return "sankey";
  if (has("FLYWHEEL", "CIRCULAR")) return "flywheel";
  if (has("ICEBERG")) return "iceberg";
  if (has("PYRAMID")) return "pyramid";
  if (has("FUNNEL")) return "funnel";
  if (has("TIMELINE-VERTICAL", "VERTICAL-TIMELINE")) return "timeline-v";
  if (has("TIMELINE", "ROADMAP", "QUARTERS", "PHASES", "PROC-")) return "timeline";
  if (has("JOURNEY", "MATURITY", "HORIZON")) return "journey";
  if (has("GAUGE")) return "gauge";
  if (has("DONUT", "RING")) return "donut";
  if (has("BARS", "PERCENT", "COMPARE", "GRAPH")) return "bars";
  if (has("STAT-CALLOUT", "IMG-STAT")) return "stat-photo";
  if (has("KPI", "STATS", "STAT-GRID", "NUMBERS", "BREAKDOWN", "DASH")) return "statwall";
  if (has("MATRIX", "TABLE")) return "matrix";
  if (has("IMG-STRIP", "IMG-MATRIX", "GRID3")) return "image-grid";
  if (has("IMG", "PHOTO", "PORTRAIT", "BLEED")) return "image";
  if (has("PILLARS-5", "BENTO", "CARDS-5")) return "bento";
  if (has("PILLARS", "CARDS")) return "cards";
  if (has("CHECKLIST", "LIST", "STACK", "RISK", "NEXT")) return "list";
  if (has("QUOTE", "MANIFESTO", "BIG-IDEA", "CALLOUT")) return "quote";
  if (has("DIVIDER")) return "divider";
  if (has("COVER", "POSTER", "HERO")) return "cover";
  return "generic";
}

const W = 64;
const H = 36;

/** Schematic layout preview. `size` scales the 16:9 box. */
export function LayoutThumb({
  variantId,
  kind,
  className,
  accent = "#003FC7",
}: {
  variantId?: string;
  kind?: ThumbKind;
  className?: string;
  accent?: string;
}) {
  const k = kind ?? thumbKindFor(variantId ?? "");
  const soft = `${accent}33`;
  const mid = `${accent}80`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={`${k} layout preview`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={W} height={H} rx="3" fill="#F7F8FB" stroke="#0000001a" />
      {body(k, accent, mid, soft)}
    </svg>
  );
}

function body(k: ThumbKind, accent: string, mid: string, soft: string) {
  const bar = (x: number, y: number, w: number, h: number, fill: string, r = 1) => (
    <rect key={`${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} rx={r} fill={fill} />
  );
  const title = bar(6, 5, 22, 2.5, mid);

  switch (k) {
    case "funnel":
      return (
        <>
          {title}
          <polygon points="14,11 50,11 43,17 21,17" fill={accent} />
          <polygon points="21,18.5 43,18.5 38,24 26,24" fill={mid} />
          <polygon points="26,25.5 38,25.5 34,31 30,31" fill={soft} />
        </>
      );
    case "pyramid":
      return (
        <>
          {title}
          <polygon points="32,11 39,18 25,18" fill={accent} />
          <polygon points="24,19.5 40,19.5 45,25 19,25" fill={mid} />
          <polygon points="18,26.5 46,26.5 50,31 14,31" fill={soft} />
        </>
      );
    case "iceberg":
      return (
        <>
          {title}
          <polygon points="32,10 42,19 22,19" fill={accent} />
          <rect x="6" y="19.5" width={52} height="0.8" fill={mid} />
          <polygon points="22,20.5 42,20.5 48,32 16,32" fill={soft} />
        </>
      );
    case "flywheel":
      return (
        <>
          {title}
          <circle cx="32" cy="21" r="8" fill="none" stroke={accent} strokeWidth="2" />
          <circle cx="32" cy="13" r="2" fill={accent} />
          <circle cx="39" cy="25" r="2" fill={mid} />
          <circle cx="25" cy="25" r="2" fill={soft} />
        </>
      );
    case "sankey":
      return (
        <>
          {title}
          <path d="M8 13 C 26 13, 34 18, 56 18" stroke={accent} strokeWidth="4" fill="none" opacity="0.8" />
          <path d="M8 20 C 26 20, 34 25, 56 25" stroke={mid} strokeWidth="3" fill="none" />
          <path d="M8 26 C 26 26, 34 30, 56 30" stroke={soft} strokeWidth="2.5" fill="none" />
        </>
      );
    case "timeline":
      return (
        <>
          {title}
          {bar(8, 21, 48, 0.9, mid, 0)}
          {[10, 25, 40, 53].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy="21.5" r="2.2" fill={i === 0 ? accent : mid} />
              {bar(x - 4, 25, 9, 1.6, soft)}
            </g>
          ))}
        </>
      );
    case "timeline-v":
      return (
        <>
          {title}
          {bar(14, 11, 0.9, 21, mid, 0)}
          {[12, 19, 26].map((y, i) => (
            <g key={y}>
              <circle cx="14.5" cy={y} r="2" fill={i === 0 ? accent : mid} />
              {bar(19, y - 1, 26, 2, soft)}
            </g>
          ))}
        </>
      );
    case "journey":
      return (
        <>
          {title}
          <path d="M8 30 C 20 30, 22 16, 34 16 S 48 12, 56 11" stroke={accent} strokeWidth="1.8" fill="none" />
          {[[8, 30], [34, 16], [56, 11]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="2" fill={mid} />
          ))}
        </>
      );
    case "donut":
      return (
        <>
          {title}
          {[18, 32, 46].map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy="22" r="6" fill="none" stroke={soft} strokeWidth="3" />
              <circle
                cx={cx}
                cy="22"
                r="6"
                fill="none"
                stroke={i === 0 ? accent : mid}
                strokeWidth="3"
                strokeDasharray={`${12 + i * 6} 40`}
                transform={`rotate(-90 ${cx} 22)`}
              />
            </g>
          ))}
        </>
      );
    case "gauge":
      return (
        <>
          {title}
          {[18, 32, 46].map((cx, i) => (
            <g key={cx}>
              <path
                d={`M ${cx - 7} 26 A 7 7 0 0 1 ${cx + 7} 26`}
                fill="none"
                stroke={soft}
                strokeWidth="3"
              />
              <path
                d={`M ${cx - 7} 26 A 7 7 0 0 1 ${cx + (i === 2 ? 5 : 1)} ${i === 2 ? 21 : 19}`}
                fill="none"
                stroke={i === 0 ? accent : mid}
                strokeWidth="3"
              />
            </g>
          ))}
        </>
      );
    case "bars":
      return (
        <>
          {title}
          {[[12, 14], [22, 9], [32, 18], [42, 6], [52, 12]].map(([x, h], i) => (
            <rect
              key={x}
              x={x - 3}
              y={31 - h}
              width="6"
              height={h}
              rx="1"
              fill={i % 2 ? mid : accent}
            />
          ))}
        </>
      );
    case "statwall":
      return (
        <>
          {title}
          {[
            [6, 11],
            [21, 11],
            [36, 11],
            [51, 11],
            [6, 22],
            [21, 22],
            [36, 22],
            [51, 22],
          ].map(([x, y], i) => (
            <g key={`${x}-${y}`}>
              <rect x={x} y={y} width="12" height="9" rx="1.5" fill="#fff" stroke="#00000014" />
              {bar(x + 1.5, y + 2, 6, 3, i % 3 === 0 ? accent : mid)}
              {bar(x + 1.5, y + 6, 9, 1.2, soft)}
            </g>
          ))}
        </>
      );
    case "stat-photo":
      return (
        <>
          <rect x="0" y="0" width="32" height={H} rx="3" fill={soft} />
          <circle cx="16" cy="16" r="5" fill={mid} />
          {bar(36, 10, 12, 6, accent)}
          {bar(36, 19, 22, 1.6, soft)}
          {bar(36, 23, 18, 1.6, soft)}
        </>
      );
    case "cards":
      return (
        <>
          {title}
          {[6, 26, 46].map((x) => (
            <g key={x}>
              <rect x={x} y="12" width="12" height="18" rx="1.5" fill="#fff" stroke="#00000014" />
              {bar(x + 2, 14.5, 5, 2, accent)}
              {bar(x + 2, 19, 8, 1.2, soft)}
              {bar(x + 2, 22, 6, 1.2, soft)}
            </g>
          ))}
        </>
      );
    case "bento":
      return (
        <>
          {title}
          <rect x="6" y="11" width="24" height="20" rx="2" fill="#fff" stroke="#00000014" />
          {bar(8.5, 13.5, 9, 3, accent)}
          {[[32, 11], [46, 11], [32, 22], [46, 22]].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <rect x={x} y={y} width="12" height="9" rx="1.5" fill="#fff" stroke="#00000014" />
              {bar(x + 2, y + 2, 5, 2, mid)}
            </g>
          ))}
        </>
      );
    case "list":
      return (
        <>
          {title}
          {[12, 18, 24, 30].map((y, i) => (
            <g key={y}>
              <circle cx="9" cy={y + 1} r="1.6" fill={i === 0 ? accent : mid} />
              {bar(13, y, 40 - i * 4, 2, soft)}
            </g>
          ))}
        </>
      );
    case "quote":
      return (
        <>
          {bar(8, 10, 3, 16, accent)}
          {bar(14, 12, 42, 3, mid)}
          {bar(14, 18, 36, 3, mid)}
          {bar(14, 24, 22, 2, soft)}
        </>
      );
    case "image":
      return (
        <>
          <rect x="0" y="0" width={W} height={H} rx="3" fill={soft} />
          <circle cx="18" cy="14" r="4" fill={mid} />
          <path d="M0 30 L20 20 L36 30 Z" fill={mid} opacity="0.7" />
          {bar(8, 26, 30, 3, accent)}
        </>
      );
    case "image-grid":
      return (
        <>
          {title}
          {[6, 26, 46].map((x) => (
            <g key={x}>
              <rect x={x} y="12" width="12" height="18" rx="1.5" fill={soft} />
              <circle cx={x + 4} cy="17" r="1.8" fill={mid} />
            </g>
          ))}
        </>
      );
    case "cover":
      return (
        <>
          <rect x="0" y="0" width={W} height={H} rx="3" fill={accent} opacity="0.12" />
          <circle cx="50" cy="10" r="10" fill={accent} opacity="0.18" />
          {bar(8, 14, 34, 4, accent)}
          {bar(8, 21, 24, 2, mid)}
        </>
      );
    case "divider":
      return (
        <>
          <rect x="0" y="0" width={W} height={H} rx="3" fill={accent} opacity="0.1" />
          {bar(10, 16, 4, 4, accent)}
          {bar(17, 17, 30, 3, mid)}
        </>
      );
    case "matrix":
      return (
        <>
          {title}
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={7 + c * 13}
                y={12 + r * 6.5}
                width="11.5"
                height="5.5"
                rx="1"
                fill={r === 0 ? mid : "#fff"}
                stroke="#00000012"
              />
            )),
          )}
        </>
      );
    default:
      return (
        <>
          {title}
          {bar(6, 12, 34, 2, soft)}
          {bar(6, 17, 28, 2, soft)}
          {bar(6, 22, 30, 2, soft)}
          <rect x="44" y="11" width="14" height="14" rx="2" fill={soft} />
        </>
      );
  }
}
