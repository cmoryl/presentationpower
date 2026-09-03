// NEXT MART artwork studio — edit every slot, import replacements by upload or
// link, and register new slots for artwork that lands after the shipped pack.

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Layers, Link2, Pencil, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { martArtworkPanels, type MartArtwork } from "@/lib/next-mart";
import {
  MART_ART_ACCEPT,
  addMartArtwork,
  bulkReplaceMartArt,
  deleteMartArtwork,
  listMartArtwork,
  martArtDraft,
  martArtIsCustom,
  martArtIsEdited,
  normalizeMartArtLink,
  readMartArtFile,
  resetMartArtEdit,
  saveMartArtEdit,
} from "@/lib/next-mart-art-store";

const CATEGORIES = ["Travel", "Tech", "Water", "Local", "Apparel", "Stationery", "Other"];

function labelCls() {
  return "text-[10px] font-medium uppercase tracking-wide text-black/45";
}
function inputCls() {
  return "mt-1 w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] text-[#03002C] outline-none focus:border-[#003FC7]";
}

type Draft = MartArtwork;

function ArtFields({ draft, set }: { draft: Draft; set: (patch: Partial<Draft>) => void }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <label className="block">
        <span className={labelCls()}>Code</span>
        <input
          className={inputCls()}
          value={draft.code}
          onChange={(e) => set({ code: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Category</span>
        <select
          className={inputCls()}
          value={draft.category}
          onChange={(e) => set({ category: e.target.value })}
        >
          {[...new Set([draft.category, ...CATEGORIES])].filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={labelCls()}>Headline</span>
        <input
          className={inputCls()}
          value={draft.headline}
          onChange={(e) => set({ headline: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Trim width (mm)</span>
        <input
          type="number"
          className={inputCls()}
          value={draft.trimW}
          onChange={(e) => set({ trimW: Math.max(50, Number(e.target.value) || 0) })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Trim height (mm)</span>
        <input
          type="number"
          className={inputCls()}
          value={draft.trimH}
          onChange={(e) => set({ trimH: Math.max(50, Number(e.target.value) || 0) })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Bleed (mm)</span>
        <input
          type="number"
          className={inputCls()}
          value={draft.bleed}
          onChange={(e) => set({ bleed: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Quantity</span>
        <input
          type="number"
          className={inputCls()}
          value={draft.quantity}
          onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Face</span>
        <select
          className={inputCls()}
          value={draft.face}
          onChange={(e) => set({ face: e.target.value === "dark" ? "dark" : "light" })}
        >
          <option value="dark">Dark face</option>
          <option value="light">Light face</option>
        </select>
      </label>
      <label className="block">
        <span className={labelCls()}>Die shape</span>
        <input
          className={inputCls()}
          value={draft.die}
          onChange={(e) => set({ die: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Substrate</span>
        <input
          className={inputCls()}
          value={draft.substrate}
          onChange={(e) => set({ substrate: e.target.value })}
        />
      </label>
      <label className="block">
        <span className={labelCls()}>Finishing</span>
        <input
          className={inputCls()}
          value={draft.finishing}
          onChange={(e) => set({ finishing: e.target.value })}
        />
      </label>
    </div>
  );
}

function ImportRow({
  onFile,
  onLink,
  filename,
}: {
  onFile: (file: File) => void;
  onLink: (url: string) => void;
  filename?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [link, setLink] = useState("");
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          onFile(file);
          return;
        }
        const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (url) onLink(url.trim());
      }}
      className={`mt-3 rounded-xl border border-dashed p-3 transition-colors ${
        over ? "border-[#003FC7] bg-[#E0E8F5]" : "border-[#003FC7]/40 bg-[#F7F9FE]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0033a3]"
        >
          <Upload size={12} /> Upload artwork file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={MART_ART_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <span className="text-[11px] text-black/45">or</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://link-to-artwork.svg"
          className="min-w-[220px] flex-1 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#003FC7]"
        />
        <button
          type="button"
          onClick={() => {
            onLink(link);
            setLink("");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-2.5 py-1.5 text-[11px] font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
        >
          <Link2 size={12} /> Import link
        </button>
      </div>
      <p className="mt-2 text-[11px] text-black/50">
        Drag a file or link straight onto this panel, or use the buttons. SVG or PDF/AI keeps the
        vector layers the cutter reads. {filename ? `Current file: ${filename}` : null}
      </p>
    </div>
  );
}

export function MartArtworkStudio() {
  const [list, setList] = useState<MartArtwork[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(() => martArtDraft());
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSource, setBulkSource] = useState<{ url: string; filename: string }>({
    url: "",
    filename: "",
  });

  const refresh = () => setList(listMartArtwork());
  useEffect(refresh, []);

  const toggleSelected = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const applyBulk = () => {
    try {
      const updated = bulkReplaceMartArt(selected, bulkSource);
      setDrafts((d) => {
        const next = { ...d };
        for (const art of updated) delete next[art.id];
        return next;
      });
      setBulkSource({ url: "", filename: "" });
      setSelected([]);
      setBulkOpen(false);
      refresh();
      toast.success(`${updated.length} artwork slots replaced`, {
        description:
          "Every placed pillar and flat master, and all export bundles, now use this file.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk replace failed.");
    }
  };

  const panels = useMemo(
    () => (list.length ? list.reduce((n, a) => n + a.quantity, 0) : martArtworkPanels()),
    [list],
  );

  const draftFor = (art: MartArtwork): Draft => drafts[art.id] ?? art;
  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? list.find((a) => a.id === id)!), ...patch } }));

  const save = (art: MartArtwork) => {
    const draft = draftFor(art);
    try {
      saveMartArtEdit(art.id, {
        code: draft.code,
        category: draft.category,
        headline: draft.headline,
        face: draft.face,
        die: draft.die,
        trimW: draft.trimW,
        trimH: draft.trimH,
        bleed: draft.bleed,
        quantity: draft.quantity,
        substrate: draft.substrate,
        finishing: draft.finishing,
        url: draft.url,
        previewUrl: draft.previewUrl,
        filename: draft.filename,
      });
      refresh();
      toast.success(`${draft.headline || art.id} saved`, {
        description: "Previews, placed masters and the layered exports now use this artwork.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this slot.");
    }
  };

  const reset = (art: MartArtwork) => {
    resetMartArtEdit(art.id);
    setDrafts((d) => {
      const next = { ...d };
      delete next[art.id];
      return next;
    });
    refresh();
    toast.success("Slot returned to the supplied master");
  };

  const remove = (art: MartArtwork) => {
    deleteMartArtwork(art.id);
    setOpenId(null);
    refresh();
    toast.success(`${art.headline || art.id} removed`);
  };

  const takeFile = (id: string | "new", file: File) => {
    readMartArtFile(file)
      .then(({ url, filename }) => {
        const patch = { url, previewUrl: url, filename };
        if (id === "new") setNewDraft((d) => ({ ...d, ...patch }));
        else setDraft(id, patch);
        toast.success(`${filename} attached`, { description: "Save the slot to publish it." });
      })
      .catch((err: Error) => toast.error(err.message));
  };

  const takeLink = (id: string | "new", raw: string) => {
    try {
      const { url, filename } = normalizeMartArtLink(raw);
      const patch = { url, previewUrl: url, filename };
      if (id === "new") setNewDraft((d) => ({ ...d, ...patch }));
      else setDraft(id, patch);
      toast.success("Link mapped to the slot", { description: "Save the slot to publish it." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That link could not be read.");
    }
  };

  const addSlot = () => {
    if (!newDraft.headline.trim()) return toast.error("Give the new artwork a headline.");
    if (!newDraft.url) return toast.error("Upload a file or import a link for the new slot.");
    try {
      const record = addMartArtwork(newDraft);
      setNewDraft(martArtDraft());
      setAdding(false);
      refresh();
      toast.success(`${record.headline} added to the artwork pack`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add this slot.");
    }
  };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            London artwork pack · supplied working files
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            Die-cut merch boards for the London mart, straight from the Illustrator masters. Layers
            stay intact: bleed, board, icon, type and the magenta CutContour path the cutter reads.
            Every slot is editable — drop a new file in by upload or link and it maps onto the same
            master slot, so placed artwork and the layered vector exports pick it up. {list.length}{" "}
            designs · {panels} panels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0033a3]"
        >
          <Plus size={13} /> {adding ? "Close importer" : "Import new artwork"}
        </button>
      </div>

      {adding ? (
        <div className="mt-5 rounded-2xl border border-[#003FC7]/25 bg-white p-4">
          <div className="text-sm font-medium text-[#03002C]">New artwork slot</div>
          <p className="mt-1 text-[12px] text-black/55">
            For a design that arrives after the shipped pack. It joins the pack with its own trim,
            quantity and finishing, and can be placed on any live master.
          </p>
          <ImportRow
            filename={newDraft.filename}
            onFile={(f) => takeFile("new", f)}
            onLink={(u) => takeLink("new", u)}
          />
          <div className="mt-3">
            <ArtFields draft={newDraft} set={(patch) => setNewDraft((d) => ({ ...d, ...patch }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={addSlot}
              className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0033a3]"
            >
              Add to the pack
            </button>
            <button
              type="button"
              onClick={() => {
                setNewDraft(martArtDraft());
                setAdding(false);
              }}
              className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium text-black/60 hover:bg-black/5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[#003FC7]/25 bg-[#F7F9FE] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-[#03002C]">Bulk replace placed artwork</div>
            <p className="mt-1 max-w-2xl text-[12px] text-black/55">
              Select slots below, attach one file or link, and replace them in a single action.
              Every placed pillar, flat master and export bundle resolves through these slots, so
              the swap publishes everywhere at once. {selected.length} selected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelected(list.map((a) => a.id))}
              className="rounded-lg border border-black/15 px-2.5 py-1.5 text-[11px] font-medium text-black/65 hover:bg-black/5"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-lg border border-black/15 px-2.5 py-1.5 text-[11px] font-medium text-black/65 hover:bg-black/5"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#003FC7] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#0033a3]"
            >
              <Layers size={12} /> {bulkOpen ? "Close bulk replace" : "Bulk replace"}
            </button>
          </div>
        </div>
        {bulkOpen ? (
          <>
            <ImportRow
              filename={bulkSource.filename}
              onFile={(f) =>
                readMartArtFile(f)
                  .then(({ url, filename }) => {
                    setBulkSource({ url, filename });
                    toast.success(`${filename} attached`, {
                      description: "Choose slots and apply to replace them all.",
                    });
                  })
                  .catch((err: Error) => toast.error(err.message))
              }
              onLink={(raw) => {
                try {
                  const { url, filename } = normalizeMartArtLink(raw);
                  setBulkSource({ url, filename });
                  toast.success("Link attached for bulk replace");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "That link could not be read.");
                }
              }}
            />
            <button
              type="button"
              onClick={applyBulk}
              disabled={!bulkSource.url || selected.length === 0}
              className="mt-3 rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0033a3] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Replace {selected.length || "selected"} slot{selected.length === 1 ? "" : "s"}
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => {
          const draft = draftFor(a);
          const open = openId === a.id;
          const picked = selected.includes(a.id);
          return (
            <article
              key={a.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                picked ? "border-[#003FC7] ring-2 ring-[#003FC7]/25" : "border-black/10"
              }`}
            >
              <div
                className={`flex items-center justify-center p-4 ${
                  draft.face === "dark" ? "bg-[#03002C]" : "bg-[#F2F2F2]"
                }`}
              >
                <img
                  src={draft.previewUrl || draft.url}
                  alt={`NEXT MART ${draft.category} sign — ${draft.headline}`}
                  loading="lazy"
                  className="h-auto w-full"
                />
              </div>
              <div className="px-4 py-3">
                <label className="mb-2 flex items-center gap-2 text-[11px] font-medium text-black/60">
                  <input
                    type="checkbox"
                    checked={picked}
                    onChange={() => toggleSelected(a.id)}
                    className="h-3.5 w-3.5 accent-[#003FC7]"
                  />
                  Select for bulk replace
                </label>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#E0E8F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#003FC7]">
                    {draft.code || "—"}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-black/45">
                    {draft.category}
                  </span>
                  {martArtIsCustom(a.id) ? (
                    <span className="rounded bg-[#A1FBF9]/60 px-1.5 py-0.5 text-[10px] font-medium text-[#03002C]">
                      Imported
                    </span>
                  ) : martArtIsEdited(a.id) ? (
                    <span className="rounded bg-[#FFEB66]/70 px-1.5 py-0.5 text-[10px] font-medium text-[#03002C]">
                      Edited
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 text-sm font-medium text-[#03002C]">{draft.headline}</div>
                <ul className="mt-2 space-y-1 text-[11px] text-black/55">
                  <li>
                    Qty {draft.quantity} · {draft.trimW} × {draft.trimH} mm · {draft.bleed} mm bleed
                  </li>
                  <li>{draft.die}</li>
                  <li>{draft.substrate}</li>
                  <li>{draft.finishing}</li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={draft.url}
                    download={draft.filename}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#003FC7] px-2.5 py-1.5 text-[11px] font-medium text-[#003FC7] hover:bg-[#E0E8F5]"
                  >
                    <Download size={12} /> Download vector master
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : a.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-2.5 py-1.5 text-[11px] font-medium text-black/65 hover:bg-black/5"
                  >
                    <Pencil size={12} /> {open ? "Close" : "Edit slot"}
                  </button>
                </div>

                {open ? (
                  <div className="mt-3 border-t border-black/10 pt-3">
                    <ImportRow
                      filename={draft.filename}
                      onFile={(f) => takeFile(a.id, f)}
                      onLink={(u) => takeLink(a.id, u)}
                    />
                    <div className="mt-3">
                      <ArtFields draft={draft} set={(patch) => setDraft(a.id, patch)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => save(a)}
                        className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0033a3]"
                      >
                        Save slot
                      </button>
                      {martArtIsCustom(a.id) ? (
                        <button
                          type="button"
                          onClick={() => remove(a)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E53D2E] px-3 py-1.5 text-xs font-medium text-[#E53D2E] hover:bg-[#E53D2E]/10"
                        >
                          <Trash2 size={12} /> Delete slot
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reset(a)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium text-black/60 hover:bg-black/5"
                        >
                          <RotateCcw size={12} /> Revert to supplied master
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
