import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadManifest,
  loadPack,
  iconSvgMarkup,
  type IconManifestPack,
  type IconPack,
} from "@/lib/icon-packs";
import { IconRenderer } from "@/components/IconRenderer";

export const Route = createFileRoute("/admin/icon-library")({
  head: () => ({
    meta: [
      { title: "Icon Library · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Browse, search, preview and copy icons from every locally-owned pack. 111,000+ icons across 30 collections.",
      },
    ],
  }),
  component: IconLibrary,
});

function IconLibrary() {
  const [packs, setPacks] = useState<IconManifestPack[]>([]);
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [pack, setPack] = useState<IconPack | null>(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [size, setSize] = useState(32);
  const [color, setColor] = useState("#003FC7");
  const [copied, setCopied] = useState<"svg" | "jsx" | "id" | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(300);

  useEffect(() => {
    loadManifest().then((m) => {
      const sorted = [...m.packs].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name)
      );
      setPacks(sorted);
      if (!activePackId && sorted.length) setActivePackId(sorted[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activePackId) return;
    setLoadingPack(true);
    setPack(null);
    setSelected(null);
    setVisibleCount(300);
    loadPack(activePackId)
      .then((p) => setPack(p))
      .finally(() => setLoadingPack(false));
  }, [activePackId]);

  const iconNames = useMemo(() => {
    if (!pack) return [];
    const names = Object.keys(pack.icons);
    const q = query.trim().toLowerCase();
    if (!q) return names;
    return names.filter((n) => n.toLowerCase().includes(q));
  }, [pack, query]);

  const visible = iconNames.slice(0, visibleCount);
  const activeMeta = packs.find((p) => p.id === activePackId);

  const doCopy = (kind: "svg" | "jsx" | "id", value: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const buildSvg = () =>
    pack && selected
      ? iconSvgMarkup(pack, pack.icons[selected], { size, color })
      : "";

  const buildJsx = () => {
    if (!pack || !selected) return "";
    return `<IconRenderer pack="${pack.prefix}" name="${selected}" size={${size}} color="${color}" />`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">
          Design system · Icon library
        </div>
        <h2 className="mt-2 text-3xl font-semibold">Icon Library</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          111,000+ locally-owned icons across 30 collections. Fully self-hosted — no
          runtime dependency on external icon services. See{" "}
          <Link to="/admin/icon-studio" className="text-[#003FC7] hover:underline">
            Icon Studio
          </Link>{" "}
          for placement, treatment, and emphasis rules.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_320px]">
        {/* Pack list */}
        <aside className="rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur">
          <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-black/50">
            Packs · {packs.length}
          </div>
          <div className="mt-1 max-h-[70vh] space-y-0.5 overflow-y-auto pr-1">
            {packs.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePackId(p.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                  activePackId === p.id
                    ? "bg-[#003FC7] text-white"
                    : "text-black/75 hover:bg-black/5"
                }`}
              >
                <span className="truncate">{p.name}</span>
                <span
                  className={`ml-2 font-mono text-[10px] ${
                    activePackId === p.id ? "text-white/70" : "text-black/40"
                  }`}
                >
                  {p.count.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Icon grid */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{activeMeta?.name ?? "…"}</div>
              <div className="text-[11px] text-black/50">
                {activeMeta?.license}
                {activeMeta?.author ? ` · ${activeMeta.author}` : ""}
              </div>
            </div>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(300);
              }}
              placeholder={`Search ${activeMeta?.count.toLocaleString() ?? ""} icons`}
              className="w-64 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs focus:border-[#003FC7] focus:outline-none"
            />
          </div>

          <div
            ref={gridRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (
                el.scrollTop + el.clientHeight >= el.scrollHeight - 200 &&
                visibleCount < iconNames.length
              ) {
                setVisibleCount((c) => Math.min(c + 300, iconNames.length));
              }
            }}
            className="mt-4 max-h-[70vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur"
          >
            {loadingPack ? (
              <div className="grid place-items-center py-16 text-xs text-black/50">
                Loading pack…
              </div>
            ) : iconNames.length === 0 ? (
              <div className="grid place-items-center py-16 text-xs text-black/50">
                No icons match "{query}".
              </div>
            ) : (
              <>
                <div className="grid grid-cols-6 gap-1 md:grid-cols-8 lg:grid-cols-10">
                  {visible.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelected(name)}
                      title={name}
                      className={`grid aspect-square place-items-center rounded-lg border transition ${
                        selected === name
                          ? "border-[#003FC7] bg-[#003FC7]/10"
                          : "border-transparent hover:border-black/15 hover:bg-black/[0.03]"
                      }`}
                    >
                      {activePackId && (
                        <IconRenderer
                          pack={activePackId}
                          name={name}
                          size={24}
                          color="#03002C"
                        />
                      )}
                    </button>
                  ))}
                </div>
                {visibleCount < iconNames.length && (
                  <div className="mt-3 text-center text-[11px] text-black/40">
                    Showing {visibleCount.toLocaleString()} of{" "}
                    {iconNames.length.toLocaleString()} — scroll for more
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Preview / insert */}
        <aside className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur">
          {selected && activePackId && pack ? (
            <div className="space-y-4">
              <div className="grid aspect-square place-items-center rounded-xl border border-black/10 bg-white">
                <IconRenderer
                  pack={activePackId}
                  name={selected}
                  size={size * 3}
                  color={color}
                />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-black/40">
                  Name
                </div>
                <div className="mt-0.5 break-all font-mono text-xs">
                  {pack.prefix}:{selected}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">
                  <div className="text-[10px] uppercase tracking-widest text-black/40">
                    Size
                  </div>
                  <input
                    type="number"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value) || 24)}
                    className="mt-1 w-full rounded-md border border-black/15 bg-white px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs">
                  <div className="text-[10px] uppercase tracking-widest text-black/40">
                    Color
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="mt-1 h-7 w-full cursor-pointer rounded-md border border-black/15 bg-white"
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <CopyButton
                  label="Copy SVG"
                  active={copied === "svg"}
                  onClick={() => doCopy("svg", buildSvg())}
                />
                <CopyButton
                  label="Copy JSX (IconRenderer)"
                  active={copied === "jsx"}
                  onClick={() => doCopy("jsx", buildJsx())}
                />
                <CopyButton
                  label="Copy Iconify ID"
                  active={copied === "id"}
                  onClick={() => doCopy("id", `${pack.prefix}:${selected}`)}
                />
              </div>

              {pack.info?.license && (
                <div className="rounded-lg border border-black/10 bg-black/[0.02] p-2.5 text-[10px] leading-relaxed text-black/55">
                  <div className="font-semibold text-black/70">
                    {pack.info.license.title}
                  </div>
                  {pack.info.author?.name && <div>{pack.info.author.name}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-full min-h-[240px] place-items-center text-center text-xs text-black/50">
              Pick an icon to preview, size, color and copy.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function CopyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-[#A6FA87] text-[#03002C]"
          : "bg-[#03002C] text-white hover:bg-[#003FC7]"
      }`}
    >
      {active ? "Copied ✓" : label}
    </button>
  );
}
