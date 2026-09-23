// NEXT MART price list studio.
//
// The issued price-list sheet as a live template: pick the mart stop (city), set
// its currency, type the local prices, edit the categories and items, choose an
// approved ground, and export the editable files. Prices are never converted
// between currencies — a stop that still carries the London figures is flagged
// until somebody types the local price.

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { PILLAR_FACES, PILLAR_STYLE_IDS } from "@/lib/next-pillar-masters";
import { LONDON_STOP, listMartStops, type MartStop } from "@/lib/next-mart-stops";
import { NEXT_MART_LOGOS } from "@/lib/next-mart";
import {
  MART_CURRENCIES,
  MART_PRICE_BAR_COLOURS,
  MART_PRICE_LIST_SOURCE,
  martCurrency,
  martPriceListItemCount,
  martPriceListLayout,
  martPriceListMissing,
  martPriceListStyleLabel,
  martPriceListSvg,
  type MartPriceCategory,
  type MartPriceListConfig,
} from "@/lib/next-mart-price-list";
import {
  martPriceList,
  martPriceListIsEdited,
  resetMartPriceList,
  saveMartPriceList,
} from "@/lib/next-mart-price-list-store";
import { exportMartPriceListPack } from "@/lib/next-mart-price-list-export";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] text-[#03002C] outline-none focus:border-[#003FC7]";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MartPriceListStudio() {
  const stops = useMemo<MartStop[]>(() => {
    const all = listMartStops();
    return all.length ? all : [LONDON_STOP];
  }, []);
  const [stopId, setStopId] = useState(stops[0]?.id ?? LONDON_STOP.id);
  const stop = stops.find((s) => s.id === stopId) ?? LONDON_STOP;
  const [config, setConfig] = useState<MartPriceListConfig>(() => martPriceList(stopId));
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadedFor = useRef(stopId);

  useEffect(() => {
    if (loadedFor.current === stopId) return;
    loadedFor.current = stopId;
    setConfig(martPriceList(stopId));
    setEdited(false);
  }, [stopId]);

  const set = (patch: Partial<MartPriceListConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setEdited(true);
  };

  const setCategories = (next: MartPriceCategory[]) => set({ categories: next });

  const patchCategory = (id: string, patch: Partial<MartPriceCategory>) =>
    setCategories(config.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const currency = martCurrency(config.currencyId);
  const layout = martPriceListLayout(config);
  const missing = martPriceListMissing(config);
  const lockup = NEXT_MART_LOGOS.find(
    (l) => l.id === (config.face === "light" ? "mart-logo-colour" : "mart-logo-white"),
  );
  const svg = useMemo(
    () =>
      martPriceListSvg(config, stop, {
        martLockupUrl: lockup?.svgUrl,
      }),
    [config, stop, lockup?.svgUrl],
  );

  const save = () => {
    saveMartPriceList(stopId, config);
    setEdited(false);
    toast.success(`Price list saved for ${stop.city || "this stop"}`);
  };

  const reset = () => {
    resetMartPriceList(stopId);
    setConfig(martPriceList(stopId));
    setEdited(false);
    toast.success("Back to the issued sheet");
  };

  const exportPack = async () => {
    setBusy(true);
    try {
      const pack = await exportMartPriceListPack(config, stop);
      download(pack.blob, pack.filename);
      const flags = pack.notes.filter((n) => /could not|missing|not included/i.test(n));
      if (flags.length) {
        toast.warning(`The pack downloaded, with ${flags.length} thing${flags.length > 1 ? "s" : ""} to check`, {
          description: flags.slice(0, 3).join(" · "),
          duration: 12000,
        });
      } else {
        toast.success("Editable price-list pack downloaded");
      }
    } catch (error) {
      toast.error("The price-list pack could not be built", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* preview */}
      <div className="space-y-3">
        <div
          className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="text-[12px] text-[#666]">
          A4 portrait, 3 mm bleed · {martPriceListItemCount(config)} items · ground{" "}
          {martPriceListStyleLabel(config.styleId)} · prices in {currency.code}
        </p>
        {layout.overflow ? (
          <p className="flex items-start gap-2 rounded-lg bg-[#FFF4E5] p-3 text-[12px] text-[#7A4A00]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            This list is longer than one A4 sheet. Remove items or split the list across two sheets —
            nothing is clipped silently.
          </p>
        ) : null}
        {missing.length ? (
          <p className="flex items-start gap-2 rounded-lg bg-[#FDECEA] p-3 text-[12px] text-[#9B1C12]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            No {currency.code} price typed yet for: {missing.join(", ")}. Prices are never converted
            between currencies, so these print as “—” until you type them.
          </p>
        ) : null}
        <p className="text-[11px] text-[#666]">{MART_PRICE_LIST_SOURCE.note}</p>
      </div>

      {/* controls */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-[#03002C]">Stop &amp; currency</h3>
            {martPriceListIsEdited(stopId) ? (
              <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 text-[10px] font-semibold text-[#003FC7]">
                Edited
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2">
            <label className="text-[11px] font-semibold text-[#666]">Mart stop</label>
            <select className={inputClass} value={stopId} onChange={(e) => setStopId(e.target.value)}>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.city || s.id} — {s.eventName}
                </option>
              ))}
            </select>
            <label className="text-[11px] font-semibold text-[#666]">Currency</label>
            <select
              className={inputClass}
              value={config.currencyId}
              onChange={(e) => set({ currencyId: e.target.value })}
            >
              {MART_CURRENCIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.label} ({c.symbol.trim()})
                </option>
              ))}
            </select>
            <label className="text-[11px] font-semibold text-[#666]">Heading</label>
            <input
              className={inputClass}
              value={config.heading}
              maxLength={60}
              onChange={(e) => set({ heading: e.target.value })}
            />
            <label className="text-[11px] font-semibold text-[#666]">Line above the heading</label>
            <input
              className={inputClass}
              value={config.eyebrow}
              maxLength={80}
              placeholder="Optional"
              onChange={(e) => set({ eyebrow: e.target.value })}
            />
            <label className="text-[11px] font-semibold text-[#666]">Footer line</label>
            <input
              className={inputClass}
              value={config.footer}
              maxLength={120}
              placeholder="Optional"
              onChange={(e) => set({ footer: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#03002C]">Look</h3>
          <div className="mt-3 grid gap-2">
            <label className="text-[11px] font-semibold text-[#666]">Approved ground</label>
            <select
              className={inputClass}
              value={config.styleId}
              onChange={(e) => set({ styleId: e.target.value })}
            >
              {PILLAR_STYLE_IDS.map((id) => (
                <option key={id} value={id}>
                  {martPriceListStyleLabel(id)}
                </option>
              ))}
            </select>
            <label className="text-[11px] font-semibold text-[#666]">Face</label>
            <select
              className={inputClass}
              value={config.face}
              onChange={(e) => set({ face: e.target.value === "light" ? "light" : "dark" })}
            >
              {PILLAR_FACES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <label className="text-[11px] font-semibold text-[#666]">Category bar colour</label>
            <div className="flex flex-wrap gap-2">
              {MART_PRICE_BAR_COLOURS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => set({ barHex: c.hex })}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={config.barHex === c.hex}
                  className={`size-7 rounded-full border-2 ${
                    config.barHex === c.hex ? "border-[#03002C]" : "border-transparent"
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-[#03002C]">Categories &amp; prices</h3>
          <div className="mt-3 space-y-4">
            {config.categories.map((category) => (
              <div key={category.id} className="rounded-xl border border-black/10 p-3">
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={category.title}
                    maxLength={60}
                    onChange={(e) => patchCategory(category.id, { title: e.target.value })}
                  />
                  <select
                    className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-[12px]"
                    value={category.column}
                    onChange={(e) =>
                      patchCategory(category.id, { column: e.target.value === "2" ? 2 : 1 })
                    }
                  >
                    <option value={1}>Left</option>
                    <option value={2}>Right</option>
                  </select>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-[#9B1C12] hover:bg-[#FDECEA]"
                    aria-label={`Remove ${category.title}`}
                    onClick={() =>
                      setCategories(config.categories.filter((c) => c.id !== category.id))
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={item.name}
                        maxLength={60}
                        onChange={(e) =>
                          patchCategory(category.id, {
                            items: category.items.map((i) =>
                              i.id === item.id ? { ...i, name: e.target.value } : i,
                            ),
                          })
                        }
                      />
                      <input
                        className="w-24 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-[12px] text-[#03002C]"
                        inputMode="decimal"
                        placeholder={currency.symbol.trim()}
                        value={item.price === null ? "" : String(item.price)}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const price = raw === "" ? null : Number(raw.replace(/[^\d.]/g, ""));
                          patchCategory(category.id, {
                            items: category.items.map((i) =>
                              i.id === item.id
                                ? { ...i, price: price !== null && Number.isFinite(price) ? price : null }
                                : i,
                            ),
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[#9B1C12] hover:bg-[#FDECEA]"
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          patchCategory(category.id, {
                            items: category.items.filter((i) => i.id !== item.id),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#003FC7]"
                    onClick={() =>
                      patchCategory(category.id, {
                        items: [
                          ...category.items,
                          { id: `item-${Date.now()}`, name: "NEW ITEM", price: null },
                        ],
                      })
                    }
                  >
                    <Plus className="size-3.5" /> Add item
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#003FC7]"
              onClick={() =>
                setCategories([
                  ...config.categories,
                  { id: `cat-${Date.now()}`, title: "NEW CATEGORY", column: 1, items: [] },
                ])
              }
            >
              <Plus className="size-3.5" /> Add category
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!edited}
            className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <Save className="size-4" /> Save this stop
          </button>
          <button
            type="button"
            onClick={exportPack}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            <Download className="size-4" /> {busy ? "Building…" : "Download editable pack"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-[12px] font-semibold text-[#03002C]"
          >
            <RotateCcw className="size-4" /> Back to issued sheet
          </button>
        </div>
      </div>
    </div>
  );
}
