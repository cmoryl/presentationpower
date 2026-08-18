// Approved icon library for a brand guide.
//
// Browse a division's approved glyphs by sub-area, preview them at the chosen
// size and approved colour, then download any single icon — or a whole sub-area
// / the full set as a zip — in SVG or PNG.

import { useMemo, useState } from "react";
import { iconByName } from "@/lib/icon-library";
import {
  ICON_DOWNLOAD_SIZES,
  brandIconSet,
  flatIcons,
  iconColorOptions,
  type IconDownloadSize,
} from "@/lib/brand-icon-sets";
import { downloadFullSet, downloadIcon, downloadSubArea } from "@/lib/icon-export";

interface Props {
  /** Brand guide slug. */
  slug: string;
  /** Hero accent for this guide, used for eyebrows and focus states. */
  hero: string;
}

export function BrandIconLibrary({ slug, hero }: Props) {
  const set = useMemo(() => brandIconSet(slug), [slug]);
  const colors = useMemo(() => iconColorOptions(slug), [slug]);
  const [areaId, setAreaId] = useState<string>(set.subAreas[0]?.id ?? "");
  const [size, setSize] = useState<IconDownloadSize>(48);
  const [format, setFormat] = useState<"svg" | "png">("svg");
  const [colorHex, setColorHex] = useState<string>(colors[0]?.hex ?? "#03002C");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const color = colors.find((c) => c.hex === colorHex) ?? colors[0];
  const area = set.subAreas.find((a) => a.id === areaId) ?? set.subAreas[0];
  const total = flatIcons(set).length;

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = area?.icons ?? [];
    if (!q) return list;
    return list.filter((i) =>
      [i.name, i.label, ...(i.keywords ?? [])].some((t) => t.toLowerCase().includes(q)),
    );
  }, [area, query]);

  const opts = { format, size, color: colorHex } as const;

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  const swatchDark = Boolean(color?.onDark);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-lg font-semibold">{set.headline}</div>
        <p className="mt-2 max-w-3xl text-sm text-foreground/80">{set.body}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.25em]" style={{ color: hero }}>
          {total} approved glyphs · {set.subAreas.length} sub-areas · SVG + PNG
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">Format</span>
            <div className="flex overflow-hidden rounded-full border border-border">
              {(["svg", "png"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  aria-pressed={format === f}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] ${
                    format === f ? "text-white" : "text-foreground/70 hover:bg-muted"
                  }`}
                  style={format === f ? { background: hero } : undefined}
                >
                  {f}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">
              Size (px)
            </span>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value) as IconDownloadSize)}
              className="h-9 rounded-full border border-border bg-background px-4 text-sm"
            >
              {ICON_DOWNLOAD_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} px{s === 512 ? " — print master" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">
              Approved colour
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={`${c.name} — ${c.note}`}
                  aria-label={`${c.name} ${c.hex}`}
                  aria-pressed={colorHex === c.hex}
                  onClick={() => setColorHex(c.hex)}
                  className={`h-7 w-7 rounded-full border transition ${
                    colorHex === c.hex
                      ? "ring-2 ring-offset-2 ring-offset-card"
                      : "border-border hover:scale-105"
                  }`}
                  style={{
                    background: c.hex,
                    borderColor: c.hex === "#FFFFFF" ? "var(--border)" : c.hex,
                    // @ts-expect-error CSS custom prop for the ring colour
                    "--tw-ring-color": hero,
                  }}
                />
              ))}
              {color && (
                <span className="text-xs text-foreground/60">
                  {color.name} · {color.hex}
                </span>
              )}
            </div>
          </div>

          <label className="ml-auto flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter this sub-area…"
              className="h-9 w-52 rounded-full border border-border bg-background px-4 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("set", () => downloadFullSet(set, { ...opts }))
            }
            className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white disabled:opacity-60"
            style={{ background: hero }}
          >
            {busy === "set" ? "Zipping…" : `Download full set (.zip · ${format.toUpperCase()})`}
          </button>
          {area && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("area", () => downloadSubArea(set, area, { ...opts }))}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] hover:bg-muted disabled:opacity-60"
            >
              {busy === "area" ? "Zipping…" : `Download “${area.name}”`}
            </button>
          )}
        </div>
      </div>

      {/* Sub-area tabs */}
      <div className="flex flex-wrap gap-2">
        {set.subAreas.map((a) => {
          const active = a.id === area?.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAreaId(a.id)}
              aria-pressed={active}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
                active ? "text-white" : "border-border text-foreground/75 hover:bg-muted"
              }`}
              style={active ? { background: hero, borderColor: hero } : undefined}
            >
              {a.name}
              <span className="ml-2 opacity-70">{a.icons.length}</span>
            </button>
          );
        })}
      </div>

      {area && <p className="text-sm text-foreground/70">{area.note}</p>}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {icons.map((icon) => {
          const Icon = iconByName(icon.name);
          const key = `icon:${icon.name}`;
          return (
            <div
              key={icon.name}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4 text-center"
            >
              <div
                className="flex h-24 w-full items-center justify-center rounded-xl"
                style={{ background: swatchDark ? "#03002C" : "#F2F2F2" }}
              >
                {Icon && (
                  <Icon
                    width={Math.min(72, Math.max(24, size))}
                    height={Math.min(72, Math.max(24, size))}
                    color={colorHex}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold">{icon.label}</div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-foreground/55">
                  {icon.name}
                </div>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run(key, () => downloadIcon(icon.name, { ...opts }))}
                className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted disabled:opacity-60"
              >
                {busy === key ? "…" : `↓ ${format.toUpperCase()} ${size}px`}
              </button>
            </div>
          );
        })}
        {icons.length === 0 && (
          <p className="col-span-full text-sm text-foreground/60">
            No approved glyph in this sub-area matches “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}
