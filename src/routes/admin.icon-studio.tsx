import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  ICON_SIZES,
  ICON_PLACEMENTS_META,
  ICON_TREATMENTS_META,
  ICON_EMPHASIS_META,
  MODULE_FAMILY_ICONS,
  PLACEMENT_DEFAULTS,
  resolveEmphasisColors,
  type IconTreatment,
  type IconEmphasis,
  type IconSizeToken,
} from "@/lib/iconography";
import { BRAND_MODES } from "@/lib/taxonomy";
import { ICON_LIBRARY } from "@/lib/icon-library";
import {
  listPacks,
  loadPack,
  iconSvgMarkup,
  searchIcons,
  getLoadedPack,
  resolveIcon,
  type IconManifestPack,
  type IconPack,
  type SearchHit,
} from "@/lib/icon-packs";
import { IconRenderer } from "@/components/IconRenderer";

export const Route = createFileRoute("/admin/icon-studio")({
  head: () => ({
    meta: [
      { title: "Icon Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Governance for the module iconography system plus a browser for every locally-owned icon pack — 111,000+ icons across 30 collections.",
      },
    ],
  }),
  component: IconStudio,
});

const MASTER = BRAND_MODES[0];
type TabId = "system" | "curated" | "packs" | "search";
const TABS: Array<{ id: TabId; label: string; sub: string }> = [
  { id: "system", label: "System", sub: "Placement · treatment · emphasis" },
  { id: "curated", label: "Curated", sub: "100 hand-picked Lucide marks" },
  { id: "packs", label: "Browse packs", sub: "30 packs · 111k icons" },
  { id: "search", label: "Search all", sub: "Cross-pack fuzzy find" },
];

function IconStudio() {
  const [tab, setTab] = useState<TabId>("system");

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">
          Design system · Iconography
        </div>
        <h2 className="mt-2 text-3xl font-semibold">Icon Studio</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
          The single source of truth for icons in TransPerfect decks. Placement,
          treatment, emphasis and sizing live here — as does the full local
          library of 111,000+ icons ported from BrandHUB.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-black/10 bg-white/70 p-1 backdrop-blur dark:border-white/10 dark:bg-white/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-4 py-3 text-left transition ${
              tab === t.id
                ? "bg-[#03002C] text-white shadow-sm"
                : "text-black/70 hover:bg-black/[0.04] dark:text-white/70 dark:hover:bg-white/5"
            }`}
          >
            <div className="text-sm font-semibold">{t.label}</div>
            <div
              className={`mt-0.5 text-[10px] uppercase tracking-widest ${
                tab === t.id ? "text-white/60" : "text-black/40 dark:text-white/40"
              }`}
            >
              {t.sub}
            </div>
          </button>
        ))}
      </div>

      {tab === "system" && <SystemTab />}
      {tab === "curated" && <CuratedTab />}
      {tab === "packs" && <PacksTab />}
      {tab === "search" && <SearchTab />}
    </div>
  );
}

/* ─────────────────────────── System (design tokens) ─────────────────────── */

function Tile({
  treatment,
  emphasis,
  size,
}: {
  treatment: IconTreatment;
  emphasis: IconEmphasis;
  size: IconSizeToken;
}) {
  const sz = ICON_SIZES[size];
  const c = resolveEmphasisColors(MASTER, treatment, emphasis);
  const isCircle = treatment === "soft-circle";
  const showContainer = treatment !== "glyph";
  return (
    <div
      className="grid place-items-center"
      style={{
        width: showContainer ? sz.containerPx : sz.glyphPx,
        height: showContainer ? sz.containerPx : sz.glyphPx,
        background: showContainer ? c.bg : "transparent",
        border: c.border ? `1px solid ${c.border}` : undefined,
        borderRadius: isCircle ? "9999px" : showContainer ? sz.radiusPx : 0,
      }}
    >
      <Sparkles size={sz.glyphPx} strokeWidth={sz.strokeWidth} color={c.fg} />
    </div>
  );
}

function SystemTab() {
  return (
    <div className="space-y-12">
      <div className="flex flex-wrap gap-2 text-xs">
        <Link to="/atlas" className="rounded-full border border-black/15 px-3 py-1.5 text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70">
          View in Atlas →
        </Link>
        <Link to="/knowledge/brand-guides/transperfect-master" className="rounded-full border border-black/15 px-3 py-1.5 text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70">
          Brand guide · Hero Icons →
        </Link>
      </div>

      <section>
        <SectionHead eyebrow="01" title="Module family marks" sub="One representative glyph per module family — wayfinding in Atlas cards, library filters and section chips." />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.values(MODULE_FAMILY_ICONS).map((f) => {
            const c = resolveEmphasisColors(MASTER, "soft-tile", f.emphasis);
            const Icon = f.Icon;
            return (
              <div key={f.id} className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: c.bg }}>
                    <Icon size={22} color={c.fg} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">{f.id}</div>
                    <div className="text-xs capitalize text-black/50 dark:text-white/50">{f.emphasis}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-black/70 dark:text-white/70">{f.rationale}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="02" title="Placements" sub="Where icons sit relative to text and content." />
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {ICON_PLACEMENTS_META.map((p) => {
            const d = PLACEMENT_DEFAULTS[p.id];
            return (
              <div key={p.id} className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="mt-1 text-xs text-black/60 dark:text-white/60">{p.description}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-widest text-black/40 dark:text-white/40">Typical in</div>
                    <div className="text-xs text-black/70 dark:text-white/70">{p.typicalIn}</div>
                  </div>
                  <div className="shrink-0">
                    {p.id === "none" ? (
                      <div className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-black/20 text-[11px] uppercase tracking-widest text-black/40 dark:border-white/20 dark:text-white/40">
                        None
                      </div>
                    ) : (
                      <Tile treatment={d.treatment} emphasis={d.emphasis} size={p.id === "watermark" || p.id === "standalone-hero" ? "lg" : d.size} />
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                  <Chip>size · {d.size}</Chip>
                  <Chip>tone · {d.emphasis}</Chip>
                  <Chip>{d.treatment}</Chip>
                  <Chip>{d.a11yRole}</Chip>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="03" title="Treatments" sub="Container/style of the icon." />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {ICON_TREATMENTS_META.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5"
              style={{ background: t.id === "on-dark" ? "#03002C" : undefined, color: t.id === "on-dark" ? "white" : undefined }}
            >
              <div className="flex items-center justify-center py-2">
                <Tile treatment={t.id} emphasis={t.id === "on-dark" ? "inverse" : "accent"} size="md" />
              </div>
              <div className="mt-3 text-sm font-semibold">{t.name}</div>
              <div className="mt-1 text-xs" style={{ color: t.id === "on-dark" ? "rgba(255,255,255,0.7)" : undefined }}>{t.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="04" title="Emphasis" sub="Color role mapped against active brand tokens." />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {ICON_EMPHASIS_META.map((e) => {
            const c = resolveEmphasisColors(MASTER, "soft-tile", e.id);
            return (
              <div key={e.id} className="rounded-2xl border border-black/10 bg-white/70 p-4 text-center backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="mx-auto flex items-center justify-center">
                  <Tile treatment="soft-tile" emphasis={e.id} size="md" />
                </div>
                <div className="mt-3 text-sm font-semibold">{e.name}</div>
                <div className="mt-1 font-mono text-[10px] text-black/50 dark:text-white/50">{c.fg}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHead eyebrow="05" title="Size tokens" sub="8pt-grid aligned." />
        <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-[11px] uppercase tracking-widest text-black/50 dark:bg-white/5 dark:text-white/50">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Glyph</th>
                <th className="px-4 py-3">Container</th>
                <th className="px-4 py-3">Gap</th>
                <th className="px-4 py-3">Radius</th>
                <th className="px-4 py-3">Stroke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {(Object.keys(ICON_SIZES) as IconSizeToken[]).map((size) => {
                const s = ICON_SIZES[size];
                return (
                  <tr key={size}>
                    <td className="px-4 py-3 font-mono text-xs">{size}</td>
                    <td className="px-4 py-3"><Tile treatment="soft-tile" emphasis="accent" size={size} /></td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{s.glyphPx}px</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{s.containerPx}px</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{s.gapPx}px</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{s.radiusPx}px</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{s.strokeWidth}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────── Curated tier ────────────────────────────── */

function CuratedTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState<"name" | "ref" | null>(null);

  const doCopy = (kind: "name" | "ref", value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <section className="space-y-4">
      <SectionHead eyebrow="Q1" title="Curated Lucide marks" sub="Hand-picked default set used by the deck editor's icon picker. Names are stable; use them directly in module overrides." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="grid grid-cols-6 gap-1 md:grid-cols-10 lg:grid-cols-12">
            {ICON_LIBRARY.map((e) => {
              const Ic = e.Icon;
              const active = selected === e.name;
              return (
                <button
                  key={e.name}
                  onClick={() => setSelected(e.name)}
                  title={`${e.label} · ${e.name}`}
                  className={`grid aspect-square place-items-center rounded-lg border transition ${
                    active
                      ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                      : "border-transparent text-black/75 hover:border-black/15 hover:bg-black/[0.03] dark:text-white/75 dark:hover:border-white/15 dark:hover:bg-white/5"
                  }`}
                >
                  <Ic size={20} strokeWidth={1.9} />
                </button>
              );
            })}
          </div>
        </div>
        <aside className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          {selected ? (
            <div className="space-y-3">
              <div className="grid aspect-square place-items-center rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                {(() => {
                  const Ic = ICON_LIBRARY.find((e) => e.name === selected)!.Icon;
                  return <Ic size={80} strokeWidth={1.75} color="#003FC7" />;
                })()}
              </div>
              <div className="font-mono text-xs">{selected}</div>
              <div className="space-y-1.5">
                <CopyButton label="Copy name" active={copied === "name"} onClick={() => doCopy("name", selected)} />
                <CopyButton label="Copy picker reference" active={copied === "ref"} onClick={() => doCopy("ref", selected)} />
              </div>
              <p className="text-[11px] leading-relaxed text-black/55 dark:text-white/55">
                Paste this name into any module's <code className="rounded bg-black/5 px-1 dark:bg-white/10">iconOverride</code> field, or into the icon picker on any deck cell. The Variant Renderer resolves it via <code className="rounded bg-black/5 px-1 dark:bg-white/10">iconByName</code>.
              </p>
            </div>
          ) : (
            <div className="grid h-full min-h-[200px] place-items-center text-center text-xs text-black/50 dark:text-white/50">
              Pick an icon to copy or insert.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Browse packs ────────────────────────────── */

function PacksTab() {
  const [packs, setPacks] = useState<IconManifestPack[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    listPacks().then((p) => setPacks(p));
  }, []);

  if (activeId) {
    return (
      <PackDetail
        packId={activeId}
        meta={packs.find((p) => p.id === activeId)}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <section className="space-y-4">
      <SectionHead
        eyebrow="Q2"
        title="Icon packs"
        sub={`${packs.length} locally-owned collections. Click a pack to browse its icons — nothing is loaded until you open it.`}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className="group flex flex-col rounded-2xl border border-black/10 bg-white/70 p-4 text-left backdrop-blur transition hover:border-[#003FC7] hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:border-[#A1FBF9]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-black/45 dark:text-white/45">{p.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold tabular-nums">
                  {p.count.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">icons</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] uppercase tracking-widest text-black/55 dark:text-white/55">
              <Chip>{p.license}</Chip>
              {p.multicolor && <Chip>multicolor</Chip>}
              {Object.keys(p.categories).length > 0 && (
                <Chip>{Object.keys(p.categories).length} categories</Chip>
              )}
            </div>
            {p.author && (
              <div className="mt-2 text-[11px] text-black/50 dark:text-white/50">by {p.author}</div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function PackDetail({
  packId,
  meta,
  onBack,
}: {
  packId: string;
  meta?: IconManifestPack;
  onBack: () => void;
}) {
  const [pack, setPack] = useState<IconPack | null>(() => getLoadedPack(packId) ?? null);
  const [loading, setLoading] = useState(!pack);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(300);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (pack) return;
    setLoading(true);
    loadPack(packId)
      .then(setPack)
      .finally(() => setLoading(false));
  }, [packId, pack]);

  const names = useMemo(() => {
    if (!pack) return [];
    const all = Object.keys(pack.icons);
    const q = query.trim().toLowerCase();
    return q ? all.filter((n) => n.toLowerCase().includes(q)) : all;
  }, [pack, query]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-full border border-black/15 px-3 py-1 text-xs text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70"
          >
            ← All packs
          </button>
          <div>
            <div className="text-sm font-semibold">{meta?.name ?? packId}</div>
            <div className="text-[11px] text-black/50 dark:text-white/50">
              {meta?.license}{meta?.author ? ` · ${meta.author}` : ""}
            </div>
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setVisible(300); }}
          placeholder={`Search ${meta?.count.toLocaleString() ?? ""} icons`}
          className="w-64 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs focus:border-[#003FC7] focus:outline-none dark:border-white/15 dark:bg-white/5"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            if (
              el.scrollTop + el.clientHeight >= el.scrollHeight - 200 &&
              visible < names.length
            ) {
              setVisible((c) => Math.min(c + 300, names.length));
            }
          }}
          className="max-h-[70vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5"
        >
          {loading ? (
            <div className="grid place-items-center py-16 text-xs text-black/50 dark:text-white/50">Loading pack…</div>
          ) : names.length === 0 ? (
            <div className="grid place-items-center py-16 text-xs text-black/50 dark:text-white/50">No matches.</div>
          ) : (
            <>
              <div className="grid grid-cols-6 gap-1 md:grid-cols-8 lg:grid-cols-10">
                {names.slice(0, visible).map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelected(name)}
                    title={name}
                    className={`grid aspect-square place-items-center rounded-lg border transition ${
                      selected === name
                        ? "border-[#003FC7] bg-[#003FC7]/10"
                        : "border-transparent hover:border-black/15 hover:bg-black/[0.03] dark:hover:border-white/15 dark:hover:bg-white/5"
                    }`}
                  >
                    <IconRenderer pack={packId} name={name} size={22} />
                  </button>
                ))}
              </div>
              {visible < names.length && (
                <div className="mt-3 text-center text-[11px] text-black/40 dark:text-white/40">
                  Showing {visible.toLocaleString()} of {names.length.toLocaleString()} — scroll for more
                </div>
              )}
            </>
          )}
        </div>

        <PreviewPanel
          pack={pack}
          packId={packId}
          selected={selected}
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────── Global search ───────────────────────────── */

function SearchTab() {
  const [packs, setPacks] = useState<IconManifestPack[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);

  useEffect(() => {
    listPacks().then(setPacks);
  }, []);

  const runSearch = async () => {
    if (!query.trim()) return;
    setBusy(true);
    const ids = selectedPackIds.length ? selectedPackIds : packs.slice(0, 6).map((p) => p.id);
    const results = await searchIcons(query, { packIds: ids, limit: 300 });
    setHits(results);
    setBusy(false);
  };

  const togglePack = (id: string) => {
    setSelectedPackIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const activePack = selected ? getLoadedPack(selected.packId) : null;

  return (
    <section className="space-y-4">
      <SectionHead
        eyebrow="Q3"
        title="Search across packs"
        sub="Fuzzy search bounded to the packs you pick — prevents accidentally loading all 111k icons. Leave empty to scan the top six packs."
      />

      <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search icons (e.g. rocket, chart, translate)"
            className="min-w-64 flex-1 rounded-full border border-black/15 bg-white px-4 py-2 text-sm focus:border-[#003FC7] focus:outline-none dark:border-white/15 dark:bg-white/5"
          />
          <button
            onClick={runSearch}
            disabled={busy || !query.trim()}
            className="rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#003FC7] disabled:opacity-50"
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
            Limit to packs {selectedPackIds.length > 0 && `· ${selectedPackIds.length} selected`}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {packs.map((p) => {
              const on = selectedPackIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePack(p.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    on
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/15 text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
          {hits.length === 0 ? (
            <div className="grid place-items-center py-16 text-xs text-black/50 dark:text-white/50">
              {busy ? "Searching…" : query ? "Press Search to run." : "Enter a query to begin."}
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-1 md:grid-cols-8 lg:grid-cols-10">
              {hits.map((h) => {
                const active = selected?.packId === h.packId && selected?.name === h.name;
                return (
                  <button
                    key={`${h.packId}:${h.name}`}
                    onClick={() => setSelected(h)}
                    title={`${h.packId}:${h.name}`}
                    className={`grid aspect-square place-items-center rounded-lg border transition ${
                      active
                        ? "border-[#003FC7] bg-[#003FC7]/10"
                        : "border-transparent hover:border-black/15 hover:bg-black/[0.03] dark:hover:border-white/15 dark:hover:bg-white/5"
                    }`}
                  >
                    <IconRenderer pack={h.packId} name={h.name} size={22} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <PreviewPanel
          pack={activePack ?? null}
          packId={selected?.packId ?? null}
          selected={selected?.name ?? null}
        />
      </div>
    </section>
  );
}

/* ───────────────────────────────── Preview ──────────────────────────────── */

function PreviewPanel({
  pack,
  packId,
  selected,
}: {
  pack: IconPack | null;
  packId: string | null;
  selected: string | null;
}) {
  const [size, setSize] = useState(48);
  const [color, setColor] = useState("#003FC7");
  const [copied, setCopied] = useState<"svg" | "ref" | "name" | null>(null);

  const doCopy = (kind: "svg" | "ref" | "name", value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  };

  const ref = packId && selected ? `${packId}:${selected}` : "";
  const icon = pack && selected ? resolveIcon(pack, selected) : null;

  return (
    <aside className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
      {selected && packId ? (
        <div className="space-y-3">
          <div className="grid aspect-square place-items-center rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
            <IconRenderer pack={packId} name={selected} size={size * 2} color={color} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">Reference</div>
            <div className="mt-0.5 break-all font-mono text-xs">{ref}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              <div className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">Size</div>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(Number(e.target.value) || 24)}
                className="mt-1 w-full rounded-md border border-black/15 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5"
              />
            </label>
            <label className="text-xs">
              <div className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">Color</div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-1 h-7 w-full cursor-pointer rounded-md border border-black/15 bg-white dark:border-white/15 dark:bg-white/5"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <CopyButton
              label="Insert into deck (copy reference)"
              active={copied === "ref"}
              onClick={() => doCopy("ref", ref)}
              primary
            />
            <CopyButton
              label="Copy SVG"
              active={copied === "svg"}
              disabled={!pack || !icon}
              onClick={() => pack && icon && doCopy("svg", iconSvgMarkup(pack, icon, { size, color }))}
            />
            <CopyButton
              label="Copy name only"
              active={copied === "name"}
              onClick={() => doCopy("name", selected)}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-black/55 dark:text-white/55">
            Paste the reference into any module's icon override field. Variant Renderer resolves <code className="rounded bg-black/5 px-1 dark:bg-white/10">pack:name</code> refs via <code className="rounded bg-black/5 px-1 dark:bg-white/10">parseIconRef</code>.
          </p>
        </div>
      ) : (
        <div className="grid h-full min-h-[200px] place-items-center text-center text-xs text-black/50 dark:text-white/50">
          Pick an icon to preview, size, color and insert.
        </div>
      )}
    </aside>
  );
}

/* ─────────────────────────────── Primitives ─────────────────────────────── */

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <div className="font-mono text-xs text-black/40 dark:text-white/40">{eyebrow}</div>
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">{sub}</p>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 dark:border-white/10 dark:bg-white/5">
      {children}
    </span>
  );
}

function CopyButton({
  label,
  active,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-40 ${
        active
          ? "bg-[#A6FA87] text-[#03002C]"
          : primary
          ? "bg-[#003FC7] text-white hover:bg-[#03002C]"
          : "bg-[#03002C] text-white hover:bg-[#003FC7]"
      }`}
    >
      {active ? "Copied ✓" : label}
    </button>
  );
}
