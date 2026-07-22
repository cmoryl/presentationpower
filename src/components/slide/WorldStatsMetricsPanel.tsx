/**
 * WorldStatsMetricsPanel — data editor for the MV-LOC-WORLD-STATS variant.
 *
 * Lets the user:
 *   • Define a list of metrics (id, label, unit, format, precision)
 *   • Pick which metric drives the stats panel
 *   • Enter a per-pin value for each metric in a spreadsheet-style grid
 *
 * All state writes back through `onChange` as { metrics, activeMetricId, items }.
 * Pin identity, coordinates, and metadata are preserved untouched — this panel
 * only edits `values` on each pin.
 */
import * as React from "react";
import {
  getDivisionLocationSet,
  formatMetricValue,
  REGION_LABELS,
  type LocationPin,
  type LocationMetric,
} from "@/lib/location-maps";

type RegionKey = LocationPin["region"];
const REGION_KEYS: RegionKey[] = ["AMER", "EMEA", "APAC", "LATAM", "MEA"];

type Props = {
  brandId: string;
  items: unknown;
  metrics: unknown;
  activeMetricId: unknown;
  regionFilter: unknown;
  onChange: (patch: {
    items?: LocationPin[];
    metrics?: LocationMetric[];
    activeMetricId?: string | null;
    regionFilter?: RegionKey[] | null;
  }) => void;
};


const FORMATS: NonNullable<LocationMetric["format"]>[] = ["number", "currency", "percent"];

function coerceMetrics(raw: unknown): LocationMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m: Record<string, unknown>, i): LocationMetric | null => {
      if (!m || typeof m !== "object") return null;
      const id = String(m.id ?? `metric-${i}`).trim();
      const label = String(m.label ?? "").trim();
      if (!id || !label) return null;
      return {
        id,
        label,
        unit: m.unit ? String(m.unit) : undefined,
        format: (FORMATS.includes(m.format as never) ? (m.format as LocationMetric["format"]) : "number"),
        precision: Number.isFinite(Number(m.precision)) ? Number(m.precision) : 0,
      };
    })
    .filter((x): x is LocationMetric => !!x);
}

function coercePins(raw: unknown, fallback: LocationPin[]): LocationPin[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw
    .map((r: Record<string, unknown>, i): LocationPin | null => {
      const lat = Number(r?.lat);
      const lon = Number(r?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      let values: Record<string, number> | undefined;
      if (r?.values && typeof r.values === "object") {
        values = {};
        for (const [k, v] of Object.entries(r.values as Record<string, unknown>)) {
          const n = Number(v);
          if (Number.isFinite(n)) values[k] = n;
        }
      }
      return {
        id: String(r?.id ?? `pin-${i}`),
        city: String(r?.city ?? "Location"),
        country: (r?.country as string) || undefined,
        region: (r?.region as LocationPin["region"]) || "AMER",
        lat,
        lon,
        role: (r?.role as LocationPin["role"]) || "office",
        label: (r?.label as string) || undefined,
        values,
      };
    })
    .filter((x): x is LocationPin => !!x);
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `metric-${Date.now()}`;
}

export function WorldStatsMetricsPanel({ brandId, items, metrics, activeMetricId, regionFilter, onChange }: Props) {
  const seeded = React.useMemo(() => getDivisionLocationSet(brandId), [brandId]);
  const pins = React.useMemo(() => coercePins(items, seeded.pins), [items, seeded.pins]);
  const metricList = React.useMemo(() => coerceMetrics(metrics), [metrics]);
  const activeId = typeof activeMetricId === "string" && activeMetricId ? activeMetricId : metricList[0]?.id ?? "";

  const activeRegions = React.useMemo<RegionKey[]>(() => {
    if (!Array.isArray(regionFilter) || regionFilter.length === 0) return REGION_KEYS;
    const set = new Set(regionFilter.filter((r): r is RegionKey => REGION_KEYS.includes(r as RegionKey)));
    return set.size ? Array.from(set) : REGION_KEYS;
  }, [regionFilter]);
  const allActive = activeRegions.length === REGION_KEYS.length;

  const toggleRegion = (k: RegionKey) => {
    const set = new Set(activeRegions);
    if (set.has(k)) set.delete(k); else set.add(k);
    const next = REGION_KEYS.filter((r) => set.has(r));
    onChange({ regionFilter: next.length === 0 || next.length === REGION_KEYS.length ? null : next });
  };
  const setPreset = (regions: RegionKey[] | null) => onChange({ regionFilter: regions });

  const regionCounts = React.useMemo(() => {
    const acc: Record<RegionKey, number> = { AMER: 0, EMEA: 0, APAC: 0, LATAM: 0, MEA: 0 };
    for (const p of pins) acc[p.region] = (acc[p.region] ?? 0) + 1;
    return acc;
  }, [pins]);


  const updateMetric = (id: string, patch: Partial<LocationMetric>) => {
    const next = metricList.map((m) => (m.id === id ? { ...m, ...patch } : m));
    onChange({ metrics: next });
  };

  const removeMetric = (id: string) => {
    const next = metricList.filter((m) => m.id !== id);
    // Strip that key from every pin.
    const nextPins = pins.map((p) => {
      if (!p.values || !(id in p.values)) return p;
      const { [id]: _drop, ...rest } = p.values;
      return { ...p, values: Object.keys(rest).length ? rest : undefined };
    });
    onChange({
      metrics: next,
      items: nextPins,
      activeMetricId: activeId === id ? next[0]?.id ?? null : activeId,
    });
  };

  const addMetric = () => {
    const base = `Metric ${metricList.length + 1}`;
    let id = slug(base);
    const existing = new Set(metricList.map((m) => m.id));
    while (existing.has(id)) id = `${id}-${Math.floor(Math.random() * 1000)}`;
    const next: LocationMetric[] = [
      ...metricList,
      { id, label: base, unit: "", format: "number", precision: 0 },
    ];
    onChange({
      metrics: next,
      activeMetricId: activeId || next[next.length - 1].id,
    });
  };

  const setActive = (id: string) => onChange({ activeMetricId: id });

  const setValue = (pinId: string, metricId: string, raw: string) => {
    const trimmed = raw.trim();
    const next = pins.map((p) => {
      if (p.id !== pinId) return p;
      const current = { ...(p.values || {}) };
      if (trimmed === "") {
        delete current[metricId];
      } else {
        const n = Number(trimmed);
        if (!Number.isFinite(n)) return p;
        current[metricId] = n;
      }
      return { ...p, values: Object.keys(current).length ? current : undefined };
    });
    onChange({ items: next });
  };

  const fillAll = (metricId: string, value: number) => {
    const next = pins.map((p) => ({
      ...p,
      values: { ...(p.values || {}), [metricId]: value },
    }));
    onChange({ items: next });
  };

  const clearMetric = (metricId: string) => {
    const next = pins.map((p) => {
      if (!p.values || !(metricId in p.values)) return p;
      const { [metricId]: _drop, ...rest } = p.values;
      return { ...p, values: Object.keys(rest).length ? rest : undefined };
    });
    onChange({ items: next });
  };

  const activeMetric = metricList.find((m) => m.id === activeId);
  const total = activeMetric
    ? pins.reduce((sum, p) => sum + (Number.isFinite(p.values?.[activeMetric.id]) ? (p.values![activeMetric.id] as number) : 0), 0)
    : 0;
  const coverage = activeMetric
    ? pins.filter((p) => Number.isFinite(p.values?.[activeMetric.id])).length
    : 0;

  return (
    <div className="rounded-2xl border-2 border-sky-500/20 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-sky-700">World stats · metric editor</div>
          <div className="mt-1 text-[11px] text-black/50">
            Define the metric shown on the world-stats panel and enter a value per pin. The active metric drives the headline total, per-region breakdown, and top locations.
          </div>
        </div>
        <button
          type="button"
          onClick={addMetric}
          className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-sky-700"
        >
          + Add metric
        </button>
      </div>

      {/* Region filter */}
      <div className="mt-5 rounded-xl border border-black/10 bg-black/[0.015] p-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/60">
            Region filter {allActive ? "· all regions" : `· ${activeRegions.length}/${REGION_KEYS.length}`}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreset(null)} className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${allActive ? "bg-sky-600 text-white" : "border border-black/15 text-black/60 hover:border-sky-500 hover:text-sky-600"}`}>All</button>
            <button type="button" onClick={() => setPreset(["AMER", "LATAM"])} className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-sky-500 hover:text-sky-600">Americas</button>
            <button type="button" onClick={() => setPreset(["EMEA", "MEA"])} className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-sky-500 hover:text-sky-600">EMEA</button>
            <button type="button" onClick={() => setPreset(["APAC"])} className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-sky-500 hover:text-sky-600">APAC</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REGION_KEYS.map((k) => {
            const on = activeRegions.includes(k);
            const count = regionCounts[k] ?? 0;
            const disabled = count === 0;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => toggleRegion(k)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  disabled
                    ? "cursor-not-allowed border-black/10 text-black/25"
                    : on
                    ? "border-sky-500 bg-sky-500/10 text-sky-700"
                    : "border-black/15 text-black/60 hover:border-sky-500 hover:text-sky-600"
                }`}
                title={disabled ? "No pins in this region" : on ? "Click to hide" : "Click to show"}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${on && !disabled ? "bg-sky-600" : "bg-black/25"}`} />
                <span className="tracking-wide">{REGION_LABELS[k]}</span>
                <span className="tabular-nums text-black/40">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-black/45">
          Filters apply to the map, the legend scale, the headline total, and the top-locations list.
        </div>


      {/* Metrics list */}
      {metricList.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-black/15 bg-black/[0.015] p-6 text-center text-sm text-black/50">
          No metrics defined yet. Add one to enable per-pin data entry — until then the panel shows pin counts.
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-3">
            {metricList.map((m) => {
              const isActive = m.id === activeId;
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 ${isActive ? "border-sky-500 bg-sky-50/60" : "border-black/10 bg-white"}`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActive(m.id)}
                      className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${
                        isActive ? "bg-sky-600 text-white" : "border border-black/20 text-black/40 hover:border-sky-500 hover:text-sky-600"
                      }`}
                      title={isActive ? "Active metric" : "Set as active"}
                    >
                      {isActive ? "●" : "○"}
                    </button>
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => updateMetric(m.id, { label: e.target.value })}
                      className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm font-medium"
                      placeholder="Metric label"
                    />
                    <input
                      type="text"
                      value={m.unit ?? ""}
                      onChange={(e) => updateMetric(m.id, { unit: e.target.value || undefined })}
                      className="w-20 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-center text-sm font-mono"
                      placeholder="unit"
                      title="Unit e.g. $M, %, hrs"
                    />
                    <select
                      value={m.format ?? "number"}
                      onChange={(e) => updateMetric(m.id, { format: e.target.value as LocationMetric["format"] })}
                      className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs"
                    >
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={m.precision ?? 0}
                      onChange={(e) => updateMetric(m.id, { precision: Math.max(0, Math.min(4, Number(e.target.value) || 0)) })}
                      className="w-14 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-center text-xs font-mono"
                      title="Decimal precision"
                    />
                    <button
                      type="button"
                      onClick={() => removeMetric(m.id)}
                      className="rounded-full border border-red-200 px-2 py-1 text-[11px] uppercase tracking-widest text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                  {isActive && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-black/50">
                      <span>
                        Total <b className="text-black/80">{formatMetricValue(total, m)}</b> · {coverage}/{pins.length} pins
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fillAll(m.id, 0)}
                          className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-black/40 hover:text-black"
                        >
                          Fill all · 0
                        </button>
                        <button
                          type="button"
                          onClick={() => clearMetric(m.id)}
                          className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-red-300 hover:text-red-600"
                        >
                          Clear values
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Per-pin value grid for the active metric */}
          {activeMetric && (
            <div className="mt-5 overflow-hidden rounded-xl border border-black/10">
              <div className="grid grid-cols-[1fr_120px_100px] items-center gap-3 border-b border-black/10 bg-black/[0.02] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">
                <div>Location</div>
                <div className="text-right">Value ({activeMetric.label})</div>
                <div className="text-right">Formatted</div>
              </div>
              <div className="max-h-[420px] divide-y divide-black/5 overflow-y-auto">
                {pins.map((p) => {
                  const raw = p.values?.[activeMetric.id];
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_120px_100px] items-center gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-black">{p.label || p.city}</div>
                        <div className="truncate text-[10px] text-black/40">
                          {[p.country, p.region].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={Number.isFinite(raw) ? String(raw) : ""}
                        onChange={(e) => setValue(p.id, activeMetric.id, e.target.value)}
                        placeholder="—"
                        className="w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-right text-sm font-mono"
                      />
                      <div className="text-right text-[12px] font-medium text-black/70 tabular-nums">
                        {Number.isFinite(raw) ? formatMetricValue(raw as number, activeMetric) : "—"}
                      </div>
                    </div>
                  );
                })}
                {pins.length === 0 && (
                  <div className="p-6 text-center text-sm text-black/50">Add pins first, then enter their values here.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
