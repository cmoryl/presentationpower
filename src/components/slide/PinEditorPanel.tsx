/**
 * PinEditorPanel — for MV-LOC-* variants. Lets the user search world
 * locations (Nominatim / OpenStreetMap), set precise lat/lon, rename each
 * pin, tag role + region, reorder, add, and delete pins. Writes the full
 * `items` array back through the deck store.
 */
import * as React from "react";
import { getDivisionLocationSet, type LocationPin } from "@/lib/location-maps";

const REGIONS: LocationPin["region"][] = ["AMER", "EMEA", "APAC", "LATAM", "MEA"];
const ROLES: NonNullable<LocationPin["role"]>[] = ["HQ", "hub", "office", "delivery", "partner"];

type Props = {
  brandId: string;
  items: unknown;
  onChange: (items: LocationPin[]) => void;
};

type NominatimHit = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    country_code?: string;
  };
};

function inferRegion(lat: number, lon: number): LocationPin["region"] {
  if (lon < -30) return lat > 15 ? "AMER" : "LATAM";
  if (lon < 60) return lat < 12 ? "MEA" : "EMEA";
  return "APAC";
}

function coerceItems(raw: unknown, fallback: LocationPin[]): LocationPin[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  return raw
    .map((r: Record<string, unknown>, i): LocationPin | null => {
      const lat = Number(r?.lat);
      const lon = Number(r?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const region = REGIONS.includes(r?.region as LocationPin["region"])
        ? (r.region as LocationPin["region"])
        : inferRegion(lat, lon);
      let values: Record<string, number> | undefined;
      if (r?.values && typeof r.values === "object") {
        values = {};
        for (const [k, v] of Object.entries(r.values as Record<string, unknown>)) {
          const n = Number(v);
          if (Number.isFinite(n)) values[k] = n;
        }
        if (Object.keys(values).length === 0) values = undefined;
      }
      return {
        id: String(r?.id ?? `pin-${i}-${Date.now()}`),
        city: String(r?.city ?? "Location"),
        country: (r?.country as string) || undefined,
        region,
        lat,
        lon,
        role: (r?.role as LocationPin["role"]) || "office",
        label: (r?.label as string) || undefined,
        values,
      };
    })
    .filter((x): x is LocationPin => !!x);
}

export function PinEditorPanel({ brandId, items, onChange }: Props) {
  const seeded = React.useMemo(() => getDivisionLocationSet(brandId), [brandId]);
  const pins = React.useMemo(() => coerceItems(items, seeded.pins), [items, seeded.pins]);

  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<NominatimHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchErr, setSearchErr] = React.useState<string | null>(null);
  const [activeSearchFor, setActiveSearchFor] = React.useState<number | "new" | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const push = (next: LocationPin[]) => onChange(next);

  const updatePin = (i: number, patch: Partial<LocationPin>) => {
    const next = pins.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    push(next);
  };

  const removePin = (i: number) => push(pins.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= pins.length) return;
    const next = pins.slice();
    [next[i], next[j]] = [next[j], next[i]];
    push(next);
  };

  const addBlank = () => {
    const next: LocationPin[] = [
      ...pins,
      {
        id: `pin-${Date.now()}`,
        city: "New location",
        region: "AMER",
        lat: 40.7128,
        lon: -74.006,
        role: "office",
      },
    ];
    push(next);
    setOpenIdx(next.length - 1);
    setActiveSearchFor(next.length - 1);
    setQuery("");
    setResults([]);
  };

  const runSearch = React.useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchErr(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { signal: ac.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as NominatimHit[];
      setResults(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setSearchErr((err as Error).message || "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced query
  React.useEffect(() => {
    if (activeSearchFor === null) return;
    const t = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, activeSearchFor, runSearch]);

  const applyHit = (i: number, hit: NominatimHit) => {
    const lat = parseFloat(hit.lat);
    const lon = parseFloat(hit.lon);
    const addr = hit.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      hit.display_name.split(",")[0]?.trim() ||
      "Location";
    updatePin(i, {
      lat,
      lon,
      city,
      country: addr.country,
      region: inferRegion(lat, lon),
    });
    setResults([]);
    setQuery("");
    setActiveSearchFor(null);
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/20 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-700">
            Locations · pin editor
          </div>
          <div className="mt-1 text-[11px] text-black/50">
            {pins.length} {pins.length === 1 ? "pin" : "pins"} on this map. Search by city, paste
            exact coordinates, or reorder to control label priority.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => push(seeded.pins)}
            className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[11px] uppercase tracking-widest text-black/60 hover:border-black/40 hover:text-black"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={addBlank}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-emerald-700"
          >
            + Add pin
          </button>
        </div>
      </div>

      <div className="mt-5 divide-y divide-black/5 rounded-xl border border-black/10">
        {pins.length === 0 && (
          <div className="p-6 text-center text-sm text-black/50">
            No pins yet. Click "+ Add pin" to place one.
          </div>
        )}
        {pins.map((p, i) => {
          const open = openIdx === i;
          return (
            <div key={p.id} className="p-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-white"
                  style={{
                    background: p.role === "HQ" || p.role === "hub" ? "#059669" : "#0B2A4A",
                  }}
                  title={p.role}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-black">{p.label || p.city}</div>
                  <div className="truncate text-[11px] text-black/50">
                    {[p.country, p.region, `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`, p.role]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-black/40 hover:bg-black/5 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === pins.length - 1}
                    className="rounded p-1 text-black/40 hover:bg-black/5 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="ml-1 rounded-full border border-black/15 px-3 py-1 text-[11px] uppercase tracking-widest text-black/60 hover:border-black/40 hover:text-black"
                  >
                    {open ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePin(i)}
                    className="rounded-full border border-red-200 px-3 py-1 text-[11px] uppercase tracking-widest text-red-600 hover:bg-red-50"
                    aria-label="Delete pin"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-4 space-y-4 rounded-lg bg-black/[0.02] p-4">
                  {/* Search */}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                      Search a location
                    </div>
                    <input
                      type="text"
                      value={activeSearchFor === i ? query : ""}
                      onFocus={() => setActiveSearchFor(i)}
                      onChange={(e) => {
                        setActiveSearchFor(i);
                        setQuery(e.target.value);
                      }}
                      placeholder="e.g. Tokyo, Japan · 123 Main St, Boston · Marrakesh"
                      className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                    />
                    {activeSearchFor === i && (
                      <div className="mt-2 space-y-1">
                        {searching && <div className="text-[11px] text-black/40">Searching…</div>}
                        {searchErr && <div className="text-[11px] text-red-600">{searchErr}</div>}
                        {results.map((r) => (
                          <button
                            key={r.place_id}
                            type="button"
                            onClick={() => applyHit(i, r)}
                            className="block w-full rounded border border-black/10 bg-white px-3 py-2 text-left text-[12px] hover:border-emerald-500 hover:bg-emerald-50"
                          >
                            <div className="font-medium text-black">{r.display_name}</div>
                            <div className="text-[10px] text-black/40">
                              {parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lon).toFixed(4)}
                            </div>
                          </button>
                        ))}
                        {!searching &&
                          query.trim().length >= 2 &&
                          results.length === 0 &&
                          !searchErr && (
                            <div className="text-[11px] text-black/40">
                              No matches. Enter coordinates directly below.
                            </div>
                          )}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-black/40">
                      Search powered by OpenStreetMap · Nominatim.
                    </div>
                  </div>

                  {/* Grid of fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Display label</span>
                      <input
                        type="text"
                        value={p.label ?? ""}
                        onChange={(e) => updatePin(i, { label: e.target.value || undefined })}
                        placeholder={p.city}
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">City</span>
                      <input
                        type="text"
                        value={p.city}
                        onChange={(e) => updatePin(i, { city: e.target.value })}
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Country</span>
                      <input
                        type="text"
                        value={p.country ?? ""}
                        onChange={(e) => updatePin(i, { country: e.target.value || undefined })}
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Region</span>
                      <select
                        value={p.region}
                        onChange={(e) =>
                          updatePin(i, { region: e.target.value as LocationPin["region"] })
                        }
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      >
                        {REGIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Latitude</span>
                      <input
                        type="number"
                        step="0.0001"
                        min={-90}
                        max={90}
                        value={p.lat}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v))
                            updatePin(i, { lat: Math.max(-90, Math.min(90, v)) });
                        }}
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-mono"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Longitude</span>
                      <input
                        type="number"
                        step="0.0001"
                        min={-180}
                        max={180}
                        value={p.lon}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v))
                            updatePin(i, { lon: Math.max(-180, Math.min(180, v)) });
                        }}
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-mono"
                      />
                    </label>
                    <label className="col-span-2 block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Role</span>
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map((r) => {
                          const active = p.role === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => updatePin(i, { role: r })}
                              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest ${
                                active
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-black/15 bg-white text-black/60 hover:border-black/40"
                              }`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
