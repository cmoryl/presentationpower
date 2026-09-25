// Native vector rebuild of a module's chart for the cross-format adaptor.
import type { AdaptChart } from "@/lib/cross-format-adapt";

const INK = "#03002C";
const BLUE = "#003FC7";

export function AdaptChartBlock({
  chart,
  width,
  height,
  fontPx,
  dark = false,
}: {
  chart: AdaptChart;
  width: number;
  height: number;
  fontPx: number;
  dark?: boolean;
}) {
  const ink = dark ? "#FFFFFF" : INK;
  const muted = dark ? "rgba(255,255,255,0.7)" : "#666666";
  const track = dark ? "rgba(255,255,255,0.18)" : "#E0E8F5";
  const d = chart.data.slice(0, 12);
  const max = Math.max(...d.map((x) => x.value), 1);
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${chart.unit ?? ""}`;
  const labelH = fontPx * 1.8;

  if (chart.kind === "ring") {
    const n = d.length;
    const cell = Math.min(width / n, height - labelH);
    const r = cell * 0.36;
    const sw = r * 0.28;
    return (
      <svg data-adapt-chart="ring" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Chart">
        {d.map((x, i) => {
          const cx = (width / n) * (i + 0.5);
          const cy = (height - labelH) / 2;
          const C = 2 * Math.PI * r;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={sw} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={BLUE} strokeWidth={sw} strokeDasharray={`${(C * x.value) / 100} ${C}`} transform={`rotate(-90 ${cx} ${cy})`} />
              <text x={cx} y={cy + fontPx * 0.45} textAnchor="middle" fontSize={fontPx * 1.4} fontWeight={700} fill={ink}>{fmt(x.value)}</text>
              <text x={cx} y={height - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fill={muted}>{x.label.slice(0, 22)}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  const plotH = height - labelH - fontPx * 1.6;
  const top = fontPx * 1.6;
  const step = width / d.length;
  if (chart.kind === "line") {
    const pts = d.map((x, i) => [step * (i + 0.5), top + plotH - (x.value / max) * plotH] as const);
    const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${top + plotH} L${pts[0][0].toFixed(1)},${top + plotH} Z`;
    return (
      <svg data-adapt-chart="line" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Chart">
        <line x1={0} x2={width} y1={top + plotH} y2={top + plotH} stroke={track} strokeWidth={Math.max(1, fontPx * 0.08)} />
        <path d={area} fill={BLUE} opacity={0.12} />
        <path d={path} fill="none" stroke={BLUE} strokeWidth={Math.max(2, fontPx * 0.22)} strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={fontPx * 0.28} fill={BLUE} />
        ))}
        <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - fontPx * 0.7} textAnchor="end" fontSize={fontPx * 1.1} fontWeight={700} fill={ink}>{fmt(d[d.length - 1].value)}</text>
        {d.map((x, i) =>
          d.length <= 8 || i % 2 === 0 ? (
            <text key={i} x={step * (i + 0.5)} y={height - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fill={muted}>{x.label.slice(0, 10)}</text>
          ) : null,
        )}
      </svg>
    );
  }
  const bw = step * 0.62;
  const longest = Math.max(...d.map((x) => Math.min(10, x.label.length)), 1);
  const lab = Math.min(fontPx, (step * 0.92) / (longest * 0.56));
  return (
    <svg data-adapt-chart="bar" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Chart">
      <line x1={0} x2={width} y1={top + plotH} y2={top + plotH} stroke={track} strokeWidth={Math.max(1, fontPx * 0.08)} />
      {d.map((x, i) => {
        const h = (x.value / max) * plotH;
        const hot = chart.highlight ? chart.highlight === x.label : i === d.length - 1;
        const cx = step * (i + 0.5);
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={top + plotH - h} width={bw} height={h} fill={hot ? BLUE : dark ? "rgba(255,255,255,0.45)" : "#8FA8E0"} />
            <text x={cx} y={top + plotH - h - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fontWeight={600} fill={ink}>{fmt(x.value)}</text>
            <text x={cx} y={height - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fill={muted}>{x.label.slice(0, 10)}</text>
          </g>
        );
      })}
    </svg>
  );
}
