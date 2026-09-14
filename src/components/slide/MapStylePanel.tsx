/**
 * MapStylePanel — map look picker for MV-LOC-* variants.
 *
 * Every option draws the same exact Natural Earth 1:110m geometry in the app's
 * equirectangular projection, so the look changes while the geography stays
 * accurate. Writes `mapStyle` back to the slide content.
 */
import * as React from "react";
import {
  WorldMap,
  MAP_STYLES,
  coerceMapStyle,
  getDivisionLocationSet,
  type MapStyle,
  type LocationPin,
} from "@/lib/location-maps";

type Props = {
  brandId: string;
  accent: string;
  primary?: string;
  items: unknown;
  mapStyle: unknown;
  onChange: (next: MapStyle) => void;
};

function previewPins(brandId: string, items: unknown): LocationPin[] {
  if (Array.isArray(items) && items.length > 0) {
    const pins = (items as Record<string, unknown>[])
      .map((r, i) => {
        const lat = Number(r?.lat);
        const lon = Number(r?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
          id: String(r?.id ?? `p-${i}`),
          city: String(r?.city ?? "Location"),
          region: "EMEA",
          lat,
          lon,
          role: (r?.role as LocationPin["role"]) ?? "office",
        } as LocationPin;
      })
      .filter((p): p is LocationPin => !!p);
    if (pins.length > 0) return pins.slice(0, 12);
  }
  return getDivisionLocationSet(brandId).pins.slice(0, 12);
}

export function MapStylePanel({ brandId, accent, primary, items, mapStyle, onChange }: Props) {
  const active = coerceMapStyle(mapStyle);
  const pins = React.useMemo(() => previewPins(brandId, items), [brandId, items]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="text-xs uppercase tracking-widest text-black/50">Map look</div>
      <p className="mt-2 text-sm text-black/60">
        Ten treatments, one geography — each option inks the same measured
        coastlines and borders, so pins always sit on their true coordinates.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MAP_STYLES.map((s) => {
          const selected = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(s.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[#003FC7] ring-2 ring-[#003FC7]/25"
                  : "border-black/10 hover:border-black/30"
              }`}
            >
              <div
                className="overflow-hidden rounded-lg"
                style={{ background: "#EEF1F7", aspectRatio: "2 / 1" }}
              >
                <WorldMap
                  pins={pins}
                  mode="light"
                  accent={accent}
                  primary={primary}
                  mapStyle={s.id}
                  showLabels={false}
                  showNetwork={false}
                  animate={false}
                  ariaLabel={`${s.label} map preview`}
                />
              </div>
              <div className="mt-2 text-sm font-semibold text-black/80">{s.label}</div>
              <div className="text-xs text-black/50">{s.hint}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
