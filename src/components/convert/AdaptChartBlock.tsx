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
  const PAL = dark ? ["#FFFFFF", "#8FA8E0", "#A1FBF9", "#C2A3FF"] : [BLUE, INK, "#8FA8E0", "#C2A3FF"];
  const svg = (kind: string, children: React.ReactNode) => (
    <svg data-adapt-chart={kind} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Chart">{children}</svg>
  );
  const legendH = chart.series && chart.series.length > 1 ? fontPx * 1.8 : 0;
  const legend = chart.series && chart.series.length > 1 ? (
    <g>
      {chart.series.slice(0, 4).map((s, i) => {
        const x = (width / Math.min(4, chart.series!.length)) * i;
        return (
          <g key={i}>
            <rect x={x} y={fontPx * 0.2} width={fontPx * 0.8} height={fontPx * 0.8} fill={PAL[i]} />
            <text x={x + fontPx * 1.1} y={fontPx * 0.95} fontSize={fontPx} fill={muted}>{s.name.slice(0, 18)}</text>
          </g>
        );
      })}
    </g>
  ) : null;
  const top0 = legendH + fontPx * 0.6;
  const plotH0 = height - top0 - labelH;
  const xLabels = (labels: string[], stepW: number) =>
    labels.map((l, i) =>
      labels.length <= 8 || i % 2 === 0 ? (
        <text key={`l${i}`} x={stepW * (i + 0.5)} y={height - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fill={muted}>{l.slice(0, 10)}</text>
      ) : null,
    );

  if (chart.series && ["grouped", "stacked", "area", "combo"].includes(chart.kind) || (chart.kind === "line" && chart.series)) {
    const labels = (chart.labels ?? chart.data.map((x) => x.label)).slice(0, 12);
    const series = chart.series!.slice(0, 4).map((s) => ({ ...s, values: s.values.slice(0, labels.length) }));
    const stepW = width / labels.length;
    const stacked = chart.kind === "stacked" || chart.kind === "area";
    const barSeries = chart.kind === "combo" ? series.slice(0, 1) : series;
    const lineSeries = chart.kind === "combo" ? series.slice(1) : series;
    const smax = stacked
      ? Math.max(...labels.map((_, i) => series.reduce((t, s) => t + (s.values[i] ?? 0), 0)), 1)
      : Math.max(...barSeries.flatMap((s) => s.values), 1);
    const lmin = chart.invert ? Math.min(...lineSeries.flatMap((s) => s.values)) : 0;
    const lmax = Math.max(...lineSeries.flatMap((s) => s.values), 1);
    const y = (v: number, m = smax) => top0 + plotH0 - (v / m) * plotH0;
    const ly = (v: number) => chart.invert ? top0 + ((v - lmin) / Math.max(1, lmax - lmin)) * plotH0 : top0 + plotH0 - ((v - lmin) / Math.max(1e-9, lmax - lmin)) * plotH0;
    const sw = Math.max(2, fontPx * 0.2);
    return svg(chart.kind, (
      <>
        {legend}
        <line x1={0} x2={width} y1={top0 + plotH0} y2={top0 + plotH0} stroke={track} strokeWidth={Math.max(1, fontPx * 0.08)} />
        {chart.kind === "grouped" || chart.kind === "combo" || chart.kind === "stacked"
          ? labels.map((_, i) => {
              const cx = stepW * (i + 0.5);
              if (chart.kind === "stacked") {
                let acc = 0;
                return (
                  <g key={i}>
                    {series.map((s, j) => {
                      const v = s.values[i] ?? 0;
                      const r = <rect key={j} x={cx - stepW * 0.31} y={y(acc + v)} width={stepW * 0.62} height={y(acc) - y(acc + v)} fill={PAL[j]} />;
                      acc += v;
                      return r;
                    })}
                  </g>
                );
              }
              const bw = (stepW * 0.72) / barSeries.length;
              return (
                <g key={i}>
                  {barSeries.map((s, j) => (
                    <rect key={j} x={cx - stepW * 0.36 + bw * j} y={y(s.values[i] ?? 0)} width={bw * 0.92} height={top0 + plotH0 - y(s.values[i] ?? 0)} fill={chart.kind === "combo" ? "#8FA8E0" : PAL[j]} />
                  ))}
                </g>
              );
            })
          : null}
        {chart.kind === "area"
          ? (() => {
              let base = labels.map(() => 0);
              return series.map((s, j) => {
                const next = base.map((b, i) => b + (s.values[i] ?? 0));
                const upper = next.map((v, i) => `${(stepW * (i + 0.5)).toFixed(1)},${y(v).toFixed(1)}`);
                const lower = base.map((v, i) => `${(stepW * (i + 0.5)).toFixed(1)},${y(v).toFixed(1)}`).reverse();
                base = next;
                return <polygon key={j} points={[...upper, ...lower].join(" ")} fill={PAL[j]} opacity={0.85} />;
              });
            })()
          : null}
        {chart.kind === "line" || chart.kind === "combo"
          ? lineSeries.map((s, j) => {
              const col = chart.kind === "combo" ? BLUE : PAL[j];
              const pts = s.values.map((v, i) => [stepW * (i + 0.5), ly(v)] as const);
              return (
                <g key={j}>
                  <path d={pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />
                  {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={fontPx * 0.24} fill={col} />)}
                </g>
              );
            })
          : null}
        {xLabels(labels, stepW)}
      </>
    ));
  }

  if (chart.kind === "waterfall") {
    const stepW = width / d.length;
    let run = 0;
    const bars = d.map((x, i) => {
      const total = chart.totals?.[i];
      const from = total ? 0 : run;
      const to = total ? x.value : run + x.value;
      run = to;
      return { from, to, total, x };
    });
    const wmax = Math.max(...bars.flatMap((b) => [b.from, b.to]), 1);
    const y = (v: number) => top0 + plotH0 - (v / wmax) * plotH0;
    return svg("waterfall", (
      <>
        <line x1={0} x2={width} y1={top0 + plotH0} y2={top0 + plotH0} stroke={track} />
        {bars.map((b, i) => {
          const cx = stepW * (i + 0.5);
          const col = b.total ? (dark ? "#FFFFFF" : INK) : b.to < b.from ? BLUE : "#8FA8E0";
          return (
            <g key={i}>
              <rect x={cx - stepW * 0.32} y={y(Math.max(b.from, b.to))} width={stepW * 0.64} height={Math.max(1, Math.abs(y(b.from) - y(b.to)))} fill={col} />
              <text x={cx} y={y(Math.max(b.from, b.to)) - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fontWeight={600} fill={ink}>{fmt(b.x.value)}</text>
            </g>
          );
        })}
        {xLabels(d.map((x) => x.label), stepW)}
      </>
    ));
  }

  if (chart.kind === "scatter" && chart.points) {
    const P = chart.points.slice(0, 16);
    const xs = P.map((p) => p.x), ys = P.map((p) => p.y), ss = P.map((p) => p.size ?? 1);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const smx = Math.max(...ss, 1);
    const padX = fontPx * 2, padY = fontPx * 1.6;
    const px = (v: number) => padX + ((v - x0) / Math.max(1e-9, x1 - x0)) * (width - padX * 2);
    const py = (v: number) => height - padY - ((v - y0) / Math.max(1e-9, y1 - y0)) * (height - padY * 2);
    return svg("scatter", (
      <>
        <line x1={padX} x2={width - padX} y1={height - padY * 0.5} y2={height - padY * 0.5} stroke={track} />
        <line x1={padX * 0.5} x2={padX * 0.5} y1={padY * 0.5} y2={height - padY * 0.5} stroke={track} />
        {P.map((p, i) => {
          const r = fontPx * (0.5 + 1.3 * Math.sqrt((p.size ?? 1) / smx));
          return (
            <g key={i}>
              <circle cx={px(p.x)} cy={py(p.y)} r={r} fill={BLUE} opacity={0.75} />
              <text x={px(p.x)} y={py(p.y) - r - fontPx * 0.25} textAnchor="middle" fontSize={fontPx * 0.9} fill={ink}>{p.label.slice(0, 14)}</text>
            </g>
          );
        })}
      </>
    ));
  }

  if (chart.kind === "range" && chart.ranges) {
    const R = chart.ranges.slice(0, 10);
    const lo = Math.min(0, ...R.map((r) => Math.min(r.from, r.to)));
    const hi = Math.max(...R.map((r) => Math.max(r.from, r.to)), 1);
    const labW = Math.min(width * 0.36, fontPx * 9);
    const rowH = height / R.length;
    const x = (v: number) => labW + ((v - lo) / (hi - lo)) * (width - labW - fontPx * 2.5);
    return svg("range", (
      <>
        {R.map((r, i) => {
          const cy = rowH * (i + 0.5);
          const bar = rowH * 0.42;
          return (
            <g key={i}>
              <text x={0} y={cy + fontPx * 0.35} fontSize={fontPx} fill={ink}>{r.label.slice(0, 20)}</text>
              <line x1={labW} x2={width} y1={cy} y2={cy} stroke={track} />
              <rect x={Math.min(x(r.from), x(r.to))} y={cy - bar / 2} width={Math.max(2, Math.abs(x(r.to) - x(r.from)))} height={bar} fill={BLUE} opacity={0.35} />
              <circle cx={x(r.from)} cy={cy} r={bar * 0.4} fill="#8FA8E0" />
              <circle cx={x(r.to)} cy={cy} r={bar * 0.4} fill={BLUE} />
              {r.mid !== undefined ? <rect x={x(r.mid) - 1.5} y={cy - bar / 2} width={3} height={bar} fill={ink} /> : null}
              <text x={Math.max(x(r.from), x(r.to)) + bar * 0.6} y={cy + fontPx * 0.35} fontSize={fontPx * 0.9} fill={muted}>{fmt(r.to)}</text>
            </g>
          );
        })}
      </>
    ));
  }

  if (chart.kind === "heatmap" && chart.matrix) {
    const M = chart.matrix.slice(0, 8).map((r) => r.slice(0, 8));
    const flat = M.flat();
    const [mn, mx] = [Math.min(...flat), Math.max(...flat)];
    const labW = fontPx * 5;
    const cw = (width - labW) / M[0].length;
    const ch = (height - labelH) / M.length;
    return svg("heatmap", (
      <>
        {M.map((row, i) => (
          <g key={i}>
            <text x={0} y={ch * (i + 0.5) + fontPx * 0.35} fontSize={fontPx} fill={muted}>{(chart.rowLabels?.[i] ?? "").slice(0, 8)}</text>
            {row.map((v, j) => {
              const k = (v - mn) / Math.max(1e-9, mx - mn);
              return (
                <g key={j}>
                  <rect x={labW + cw * j + 1} y={ch * i + 1} width={cw - 2} height={ch - 2} fill={BLUE} opacity={0.15 + 0.85 * k} />
                  <text x={labW + cw * (j + 0.5)} y={ch * (i + 0.5) + fontPx * 0.35} textAnchor="middle" fontSize={fontPx * 0.9} fill={k > 0.5 ? "#FFFFFF" : INK}>{fmt(v)}</text>
                </g>
              );
            })}
          </g>
        ))}
        {(chart.labels ?? []).slice(0, M[0].length).map((l, j) => (
          <text key={j} x={labW + cw * (j + 0.5)} y={height - fontPx * 0.4} textAnchor="middle" fontSize={fontPx} fill={muted}>{l.slice(0, 8)}</text>
        ))}
      </>
    ));
  }


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
        {/* End value never rises above the chart's top edge. */}
        <text x={pts[pts.length - 1][0]} y={Math.max(fontPx * 1.05, pts[pts.length - 1][1] - fontPx * 0.7)} textAnchor="end" fontSize={fontPx * 1.1} fontWeight={700} fill={ink}>{fmt(d[d.length - 1].value)}</text>
        {d.map((x, i) =>
          d.length <= 8 || i % 2 === 0 ? (
            // Edge labels anchor inward so they can't spill past the chart sides.
            <text key={i} x={i === 0 ? 0 : i === d.length - 1 ? width : step * (i + 0.5)} y={height - fontPx * 0.4} textAnchor={i === 0 ? "start" : i === d.length - 1 ? "end" : "middle"} fontSize={fontPx} fill={muted}>{x.label.slice(0, 10)}</text>
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
