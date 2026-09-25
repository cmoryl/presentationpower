// Layer editor for a California kiosk rebuilt from the partner's live London
// file: every text line and graphic piece is a layer you can retype, move,
// resize, hide or show; the background ramp can be changed; edits save per
// kiosk. The TV keep-clear is drawn as a guide only (never exported).

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw, Save, Undo2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  KIOSK_BLEED,
  KIOSK_H,
  KIOSK_TV,
  KIOSK_W,
  kioskFontFaceCss,
  kioskFontFamily,
  kioskGround,
  layoutKiosk,
  partGroup,
  defaultPartGroups,
  pieceBackdropPath,
  splitArtSvg,
  type KioskEdits,
  type LiveLayout,
} from "@/lib/next-california-kiosk-live";
import { downloadKiosk, loadArtSvg, type KioskDownload } from "@/lib/next-california-kiosk-live-export";

type Sel = { kind: "block" | "text" | "part"; id: string } | null;

const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/15 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#03002C] hover:bg-[#F2F4F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] disabled:opacity-50";

const draftKey = (id: string) => `kiosk-draft:${id}`;
function readLocalDraft(id: string): { at: number; edits: KioskEdits } | null {
  try { const v = localStorage.getItem(draftKey(id)); return v ? JSON.parse(v) : null; } catch { return null; }
}
function writeLocalDraft(id: string, edits: KioskEdits) {
  try { localStorage.setItem(draftKey(id), JSON.stringify({ at: Date.now(), edits })); } catch { /* storage full or blocked */ }
}
function clearLocalDraft(id: string) {
  try { localStorage.removeItem(draftKey(id)); } catch { /* ignore */ }
}

/** Saved edits for a kiosk (shared copy, or this device's newer draft). */
async function loadKioskEdits(id: string): Promise<KioskEdits> {
  const local = readLocalDraft(id);
  const { data } = await supabase.from("kiosk_layer_edits").select("edits, updated_at").eq("booth_id", id).maybeSingle();
  const remoteAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
  if (local && local.at > remoteAt) return local.edits;
  return (data?.edits as KioskEdits | undefined) ?? {};
}

export function KioskLayerEditor({ layout: L, vendor }: { layout: LiveLayout; vendor: string }) {
  const [art, setArt] = useState<{ viewBox: string; inner: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [edits, setEdits] = useState<KioskEdits>({});
  const [history, setHistory] = useState<KioskEdits[]>([]);
  const [sel, setSel] = useState<Sel>(null);
  /** Canvas height in px (zoom) and whether the canvas takes the full width. */
  const [zoom, setZoom] = useState(640);
  const [wide, setWide] = useState(false);
  /** Objects picked with Shift-click, ready to group. */
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<KioskDownload | "save" | null>(null);
  const userId = useSessionUser();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ sel: NonNullable<Sel>; x: number; y: number; start: KioskEdits } | null>(null);

  useEffect(() => {
    let live = true;
    loadArtSvg(L.id).then((s) => live && setArt(splitArtSvg(s))).catch((e) => live && setErr(String(e.message ?? e)));
    return () => { live = false; };
  }, [L.id]);

  // Load: the shared saved copy wins; otherwise this device's unsaved draft.
  const loaded = useRef(false);
  useEffect(() => {
    let live = true;
    loaded.current = false;
    const local = readLocalDraft(L.id);
    (async () => {
      const { data } = userId
        ? await supabase.from("kiosk_layer_edits").select("edits, updated_at").eq("booth_id", L.id).maybeSingle()
        : { data: null };
      if (!live) return;
      const remote = data?.edits as KioskEdits | undefined;
      const remoteAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
      if (local && local.at > remoteAt) setEdits(local.edits);
      else if (remote) setEdits(remote);
      loaded.current = true;
    })();
    return () => { live = false; };
  }, [L.id, userId]);

  // Autosave: every change is kept on this device at once, and saved to the
  // shared kiosk a moment after you stop editing.
  useEffect(() => {
    if (!loaded.current) return;
    writeLocalDraft(L.id, edits);
    if (!userId) { setStatus("Kept on this device. Sign in to save for everyone."); return; }
    setStatus("Saving…");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("kiosk_layer_edits").upsert({ booth_id: L.id, edits: edits as never, updated_by: userId });
      if (error) setStatus(`Kept on this device only — not saved for everyone: ${error.message}`);
      else { clearLocalDraft(L.id); setStatus("All changes saved."); window.dispatchEvent(new CustomEvent("kiosk-edits-saved", { detail: L.id })); }
    }, 1200);
    return () => clearTimeout(t);
  }, [edits, L.id, userId]);

  const placed = useMemo(() => layoutKiosk(L, edits), [L, edits]);
  const ground = kioskGround(L, edits);
  const symId = `kart-${L.id}`;

  const commit = (next: KioskEdits) => { setHistory((h) => [...h.slice(-49), edits]); setEdits(next); };
  const patchBlock = (id: string, p: object, push = true) => {
    const next = { ...edits, blocks: { ...edits.blocks, [id]: { ...edits.blocks?.[id], ...p } } };
    push ? commit(next) : setEdits(next);
  };
  const patchPart = (id: string, p: object, push = true) => {
    const next = { ...edits, parts: { ...edits.parts, [id]: { ...edits.parts?.[id], ...p } } };
    push ? commit(next) : setEdits(next);
  };
  const patchText = (id: string, p: object, push = true) => {
    const next = { ...edits, texts: { ...edits.texts, [id]: { ...edits.texts?.[id], ...p } } };
    push ? commit(next) : setEdits(next);
  };

  const toSvg = (e: React.PointerEvent) => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    return { x: (e.clientX - m.e) / m.a, y: (e.clientY - m.f) / m.d };
  };
  const pickPart = (id: string, add: boolean) => {
    const members = partGroup(edits, id, L);
    if (add) {
      setPicked((cur) => (cur.includes(id) ? cur.filter((x) => !members.includes(x)) : [...new Set([...cur, ...members])]));
    } else setPicked(members);
    setSel({ kind: "part", id });
  };
  const startDrag = (s: NonNullable<Sel>) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (s.kind === "part") {
      pickPart(s.id, e.shiftKey);
      if (e.shiftKey) return;
    } else setPicked([]);
    setSel(s);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e);
    drag.current = { sel: s, x: p.x, y: p.y, start: edits };
    setHistory((h) => [...h.slice(-49), edits]);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    const dx = p.x - d.x, dy = p.y - d.y;
    const key = d.sel.kind === "block" ? "blocks" : d.sel.kind === "part" ? "parts" : "texts";
    const map = d.start[key] as Record<string, { dx?: number; dy?: number }> | undefined;
    const cur = map?.[d.sel.id] as { dx?: number; dy?: number } | undefined;
    const v = { dx: (cur?.dx ?? 0) + dx, dy: (cur?.dy ?? 0) + dy };
    const ids = d.sel.kind === "part" ? partGroup(d.start, d.sel.id, L) : [d.sel.id];
    const moved = { ...map };
    for (const id of ids) moved[id] = { ...map?.[id], dx: (map?.[id]?.dx ?? 0) + dx, dy: (map?.[id]?.dy ?? 0) + dy };
    void v;
    const next = { ...d.start, [key]: moved };
    setEdits(next);
  };
  const endDrag = () => { drag.current = null; };

  const save = async () => {
    setBusy("save"); setStatus(null);
    const { error } = await supabase.from("kiosk_layer_edits").upsert({ booth_id: L.id, edits: edits as never, updated_by: userId ?? null });
    setBusy(null);
    if (!error) { clearLocalDraft(L.id); window.dispatchEvent(new CustomEvent("kiosk-edits-saved", { detail: L.id })); }
    setStatus(error ? `Not saved: ${error.message}` : "All changes saved.");
  };
  const dl = async (k: KioskDownload) => {
    setBusy(k); setStatus(null);
    try { await downloadKiosk(k, L, edits); } catch (e) { setStatus(`Download failed: ${(e as Error).message}`); }
    setBusy(null);
  };

  const B = KIOSK_BLEED;
  const selBlock = sel?.kind === "block" ? L.blocks.find((b) => b.id === sel.id) : null;
  const selPart = sel?.kind === "part" ? L.blocks.flatMap((b) => b.parts ?? []).find((q) => q.id === sel.id) : null;
  const selText = sel?.kind === "text" ? L.texts.find((t) => t.id === sel.id) : null;

  return (
    <div className={wide ? "grid gap-5" : "grid gap-5 lg:grid-cols-[minmax(0,300px)_1fr_minmax(0,280px)]"}>
      <style>{kioskFontFaceCss()}</style>
      {/* Canvas */}
      <div className={wide ? "order-1" : "order-1 lg:order-2"}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#03002C]">View</span>
          <button type="button" className={btn} aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(400, Math.round(z / 1.25)))} disabled={zoom <= 400}><Minus className="h-3.5 w-3.5" /></button>
          <span className="min-w-[3.5rem] text-center text-[12px] text-[#03002C]/80">{Math.round((zoom / 640) * 100)}%</span>
          <button type="button" className={btn} aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4000, Math.round(z * 1.25)))} disabled={zoom >= 4000}><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} onClick={() => { setZoom(640); setWide(false); }}>Fit</button>
          <button type="button" className={btn} onClick={() => { setWide((w) => !w); setZoom((z) => (wide ? 640 : Math.max(z, 1100))); }}>
            {wide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {wide ? "Smaller view" : "Big view"}
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto rounded-md border border-[#03002C]/12 bg-[#F2F4F9] p-3">
          {err ? <p className="text-sm text-[#E53D2E]">{err}</p> : null}
          {!art && !err ? <p className="text-sm text-[#03002C]/70">Loading the partner's artwork…</p> : null}
          {art ? (
            <svg
              ref={svgRef}
              viewBox={`${-B} ${-B} ${KIOSK_W + 2 * B} ${KIOSK_H + 2 * B}`}
              style={{ height: zoom }}
              className="mx-auto block w-auto touch-none select-none"
              role="img"
              aria-label={`${vendor} kiosk front, editable`}
              onPointerMove={onMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onPointerDown={() => { setSel(null); setPicked([]); }}
            >
              <defs>
                <linearGradient id={`kg-${L.id}`} x1="0" y1="0" x2="0" y2="1">
                  {ground.map((s) => <stop key={s.offset} offset={s.offset} stopColor={s.color} />)}
                </linearGradient>
                <g dangerouslySetInnerHTML={{ __html: `<symbol id="${symId}" viewBox="${art.viewBox}" overflow="visible">${art.inner}</symbol>` }} />
                {placed.map((p) => (
                  <clipPath key={p.block.id} id={`kc-${L.id}-${p.block.id}`}>
                    <path clipRule="evenodd" d={pieceBackdropPath(L, p, B / p.scale + 1, 0, 0)} />
                  </clipPath>
                ))}
                {placed.flatMap((p) => p.parts).map((q) => (
                  <clipPath key={q.part.id} id={`kc-${L.id}-${q.part.id}`}>
                    <rect x={q.src.x0} y={q.src.y0} width={q.src.x1 - q.src.x0} height={q.src.y1 - q.src.y0} />
                  </clipPath>
                ))}
              </defs>
              <rect x={-B} y={-B} width={KIOSK_W + 2 * B} height={KIOSK_H + 2 * B} fill={`url(#kg-${L.id})`} />
              {placed.map((p) => {
                const [, , vw, vh] = art.viewBox.split(/\s+/).map(Number);
                const on = sel?.kind === "block" && sel.id === p.block.id;
                return (
                  <g key={p.block.id} transform={`translate(${p.x} ${p.y}) scale(${p.scale})`} onPointerDown={startDrag({ kind: "block", id: p.block.id })} className="cursor-move">
                    <g clipPath={`url(#kc-${L.id}-${p.block.id})`}>
                      <use href={`#${symId}`} x={-L.originX} y={-(L.originY + p.clipTop)} width={vw} height={vh} />
                    </g>
                    {on ? <rect x={0} y={0} width={L.trimW} height={p.clipBottom - p.clipTop} fill="none" stroke="#003FC7" strokeWidth={12 / p.scale} strokeDasharray={`${40 / p.scale} ${20 / p.scale}`} /> : null}
                  </g>
                );
              })}
              {placed.flatMap((p) => p.parts).filter((q) => !q.hidden).map((q) => {
                const [, , vw, vh] = art.viewBox.split(/\s+/).map(Number);
                const on = picked.includes(q.part.id) || (sel?.kind === "part" && sel.id === q.part.id);
                return (
                  <g key={q.part.id} transform={`translate(${q.x - q.src.x0 * q.scale} ${q.y - q.src.y0 * q.scale}) scale(${q.scale})`} onPointerDown={startDrag({ kind: "part", id: q.part.id })} className="cursor-move">
                    <g clipPath={`url(#kc-${L.id}-${q.part.id})`}>
                      <use href={`#${symId}`} x={-L.originX} y={-L.originY} width={vw} height={vh} />
                    </g>
                    <rect x={q.src.x0} y={q.src.y0} width={q.src.x1 - q.src.x0} height={q.src.y1 - q.src.y0} fill="transparent" stroke={on ? "#003FC7" : "none"} strokeWidth={10 / q.scale} strokeDasharray={`${30 / q.scale} ${15 / q.scale}`} />
                  </g>
                );
              })}
              {placed.flatMap((p) => p.texts).map((t) => {
                const on = sel?.kind === "text" && sel.id === t.id;
                return (
                  <text
                    key={t.id}
                    x={t.kx}
                    y={t.ky}
                    fontSize={t.ksize}
                    fill={t.fill}
                    fontFamily={kioskFontFamily(t.font)}
                    textLength={t.edited ? undefined : t.kw}
                    lengthAdjust="spacing"
                    xmlSpace="preserve"
                    className="cursor-move"
                    stroke={on ? "#003FC7" : undefined}
                    strokeWidth={on ? 3 : undefined}
                    paintOrder="stroke"
                    onPointerDown={startDrag({ kind: "text", id: t.id })}
                  >
                    {t.text}
                  </text>
                );
              })}
              <g data-export-ignore="true" pointerEvents="none">
                <rect x={KIOSK_TV.x} y={KIOSK_TV.y} width={KIOSK_TV.w} height={KIOSK_TV.h} fill="#03002C" fillOpacity={0.55} stroke="#FFFFFF" strokeDasharray="30 18" strokeWidth={6} />
                <text x={KIOSK_TV.x + KIOSK_TV.w / 2} y={KIOSK_TV.y + KIOSK_TV.h / 2} textAnchor="middle" fontSize={90} fill="#FFFFFF" fontFamily="Geist, sans-serif">TV keep-clear (guide, not printed)</text>
                <rect x={0} y={0} width={KIOSK_W} height={KIOSK_H} fill="none" stroke="#EC008C" strokeWidth={6} />
              </g>
            </svg>
          ) : null}
        </div>
        <p className="mt-2 text-[12px] text-[#03002C]/70">Drag any object, piece or line of text to move it. Rebuilt from {L.source}. Draft until the San Francisco revision is published.</p>
      </div>

      {/* Layers */}
      <div className="order-2 lg:order-1">
        <h4 className="text-sm font-semibold text-[#03002C]">Layers</h4>
        <ul className="mt-2 max-h-[640px] space-y-1 overflow-auto pr-1">
          {L.blocks.map((b) => {
            const hidden = edits.blocks?.[b.id]?.hidden ?? b.screen;
            const texts = L.texts.filter((t) => { const m = (t.top + t.bottom) / 2; return m >= b.y0 && m < b.y1; });
            return (
              <li key={b.id} className="rounded-md border border-[#03002C]/10 bg-white">
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button type="button" className={`flex-1 truncate text-left text-[12px] font-semibold ${sel?.id === b.id ? "text-[#003FC7]" : "text-[#03002C]"}`} onClick={() => setSel({ kind: "block", id: b.id })}>
                    {b.screen ? "London screen area" : `Graphics piece ${Number(b.id.slice(1)) + 1}`}
                  </button>
                  <button type="button" aria-label={hidden ? "Show piece" : "Hide piece"} title={hidden ? "Show" : "Hide"} className="rounded p-1 hover:bg-[#F2F4F9]" onClick={() => patchBlock(b.id, { hidden: !hidden })}>
                    {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {b.parts?.length ? (
                  <ul className="border-t border-[#03002C]/8 px-2 py-1">
                    {b.parts.map((q, i) => {
                      const ph = edits.parts?.[q.id]?.hidden ?? false;
                      return (
                        <li key={q.id} className="flex items-center gap-1">
                          <button type="button" className={`flex-1 truncate py-0.5 text-left text-[11.5px] ${sel?.id === q.id ? "text-[#003FC7]" : "text-[#03002C]/80"}`} onClick={(e) => pickPart(q.id, e.shiftKey)}>
                            Object {i + 1}{(edits.groups ?? defaultPartGroups(L)).some((g) => g.includes(q.id)) ? " · grouped" : ""}
                          </button>
                          <button type="button" aria-label={ph ? "Show object" : "Hide object"} className="rounded p-1 hover:bg-[#F2F4F9]" onClick={() => patchPart(q.id, { hidden: !ph })}>
                            {ph ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {texts.length ? (
                  <ul className="border-t border-[#03002C]/8 px-2 py-1">
                    {texts.map((t) => {
                      const th = edits.texts?.[t.id]?.hidden ?? false;
                      return (
                        <li key={t.id} className="flex items-center gap-1">
                          <button type="button" className={`flex-1 truncate py-0.5 text-left text-[11.5px] ${sel?.id === t.id ? "text-[#003FC7]" : "text-[#03002C]/80"}`} onClick={() => setSel({ kind: "text", id: t.id })}>
                            “{edits.texts?.[t.id]?.text ?? t.text}”
                          </button>
                          <button type="button" aria-label={th ? "Show text" : "Hide text"} className="rounded p-1 hover:bg-[#F2F4F9]" onClick={() => patchText(t.id, { hidden: !th })}>
                            {th ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Inspector */}
      <div className="order-3 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={!history.length} onClick={() => { setEdits(history[history.length - 1]!); setHistory((h) => h.slice(0, -1)); }}><Undo2 className="h-3.5 w-3.5" />Undo</button>
          <button type="button" className={btn} onClick={() => commit({})}><RotateCcw className="h-3.5 w-3.5" />Reset to London</button>
          <button type="button" className={btn} disabled={!userId || busy === "save"} onClick={save} title={userId ? undefined : "Sign in to save"}><Save className="h-3.5 w-3.5" />Save</button>
        </div>

        {selText ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#03002C]">Text</h4>
            <label className="block text-[12px] text-[#03002C]/80">Words
              <textarea className="mt-1 w-full rounded-md border border-[#03002C]/15 p-2 text-[13px] text-[#03002C]" rows={2} value={edits.texts?.[selText.id]?.text ?? selText.text} onChange={(e) => patchText(selText.id, { text: e.target.value }, false)} onBlur={() => setHistory((h) => [...h, edits])} />
            </label>
            <label className="block text-[12px] text-[#03002C]/80">Size (London pt)
              <input type="number" min={6} className="mt-1 w-full rounded-md border border-[#03002C]/15 p-1.5 text-[13px]" value={Math.round(edits.texts?.[selText.id]?.size ?? selText.size)} onChange={(e) => patchText(selText.id, { size: Number(e.target.value) || selText.size })} />
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#03002C]/80">Colour
              <input type="color" value={edits.texts?.[selText.id]?.color ?? selText.color} onChange={(e) => patchText(selText.id, { color: e.target.value.toUpperCase() })} />
            </label>
            <p className="text-[11px] text-[#03002C]/65">Font: {selText.font}. Retyped text keeps the font; original letter spacing applies only to the unedited words.</p>
          </div>
        ) : null}

        {picked.length > 1 || (selPart && partGroup(edits, selPart.id, L).length > 1) ? (
          <div className="space-y-2 rounded-md border border-[#003FC7]/25 bg-[#F2F4F9] p-2">
            <h4 className="text-sm font-semibold text-[#03002C]">{picked.length} objects selected</h4>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={picked.length < 2 || (edits.groups ?? defaultPartGroups(L)).some((g) => g.length === picked.length && picked.every((x) => g.includes(x)))}
                onClick={() => commit({ ...edits, groups: [...(edits.groups ?? defaultPartGroups(L)).filter((g) => !g.some((x) => picked.includes(x))), picked] })}>Group</button>
              <button type="button" className={btn} disabled={!(edits.groups ?? defaultPartGroups(L)).some((g) => g.some((x) => picked.includes(x)))}
                onClick={() => { commit({ ...edits, groups: (edits.groups ?? defaultPartGroups(L)).filter((g) => !g.some((x) => picked.includes(x))) }); setPicked(sel ? [sel.id] : []); }}>Ungroup</button>
              <button type="button" className={btn} onClick={() => commit({ ...edits, parts: { ...edits.parts, ...Object.fromEntries(picked.map((id) => [id, { ...edits.parts?.[id], hidden: !(edits.parts?.[id]?.hidden ?? false) }])) } })}>Hide / show</button>
              <button type="button" className={btn} onClick={() => commit({ ...edits, parts: { ...edits.parts, ...Object.fromEntries(picked.map((id) => [id, { dx: 0, dy: 0, scale: 1, hidden: false }])) } })}>Put back</button>
            </div>
            <p className="text-[11px] text-[#03002C]/65">Shift-click objects on the kiosk or in the list to add them. A group moves, hides and resets together; each object keeps its own size.</p>
          </div>
        ) : null}

        {selPart ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#03002C]">Object</h4>
            <label className="block text-[12px] text-[#03002C]/80">Size {Math.round((edits.parts?.[selPart.id]?.scale ?? 1) * 100)}%
              <input type="range" min={30} max={200} className="mt-1 w-full" value={Math.round((edits.parts?.[selPart.id]?.scale ?? 1) * 100)} onChange={(e) => patchPart(selPart.id, { scale: Number(e.target.value) / 100 }, false)} />
            </label>
            <button type="button" className={btn} onClick={() => patchPart(selPart.id, { dx: 0, dy: 0, scale: 1, hidden: false })}>Put back</button>
            <p className="text-[11px] text-[#03002C]/65">A single logo, icon, QR code or shape group from the London file. It moves and scales on its own, keeping its original shapes, gradients and see-through effects. Nearby words are separate text lines.</p>
          </div>
        ) : null}

        {selBlock ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#03002C]">Graphics piece</h4>
            <label className="block text-[12px] text-[#03002C]/80">Size {Math.round((edits.blocks?.[selBlock.id]?.scale ?? 1) * 100)}%
              <input type="range" min={50} max={100} className="mt-1 w-full" value={Math.round((edits.blocks?.[selBlock.id]?.scale ?? 1) * 100)} onChange={(e) => patchBlock(selBlock.id, { scale: Number(e.target.value) / 100 }, false)} />
            </label>
            <p className="text-[11px] text-[#03002C]/65">Logos, icons and QR codes inside this piece move with it. Pieces never grow past the kiosk width.</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[#03002C]">Background</h4>
          <div className="flex gap-3 text-[12px] text-[#03002C]/80">
            <label className="flex items-center gap-1">Top <input type="color" value={ground[0]!.color} onChange={(e) => commit({ ...edits, ground: { top: e.target.value.toUpperCase(), bottom: ground[ground.length - 1]!.color } })} /></label>
            <label className="flex items-center gap-1">Bottom <input type="color" value={ground[ground.length - 1]!.color} onChange={(e) => commit({ ...edits, ground: { top: ground[0]!.color, bottom: e.target.value.toUpperCase() } })} /></label>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[#03002C]">Download (draft)</h4>
          <button type="button" className={`${btn} w-full justify-center bg-[#03002C] text-white hover:bg-[#03002C]/90`} disabled={!!busy} onClick={() => dl("zip")}><Download className="h-3.5 w-3.5" />{busy === "zip" ? "Building…" : "All files (.zip)"}</button>
          <div className="grid grid-cols-2 gap-2">
            {([["ai", "Illustrator .ai"], ["pdf", "PDF"], ["svg", "Layered .svg"], ["press", "Press, outlined"], ["png", "PNG proof"]] as const).map(([k, label]) => (
              <button key={k} type="button" className={btn} disabled={!!busy} onClick={() => dl(k)}>{busy === k ? "…" : label}</button>
            ))}
          </div>
          <p className="text-[11px] text-[#03002C]/65">Live files keep editable text. The .svg opens in Illustrator with Background, Graphics, Text and Cut layers; the PDF/.ai keeps live text but not named layers. The PNG is a proof, not a print master.</p>
        </div>
        {status ? <p role="status" className="text-[12px] text-[#03002C]">{status}</p> : null}
      </div>
    </div>
  );
}

/** Small preview of a live kiosk, rendered on demand. */
export function KioskLiveThumb({ layout, height = 150 }: { layout: LiveLayout; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail === layout.id) setRev((r) => r + 1); };
    window.addEventListener("kiosk-edits-saved", on);
    return () => window.removeEventListener("kiosk-edits-saved", on);
  }, [layout.id]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let url: string | null = null;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const { liveFrontSvg } = await import("@/lib/next-california-kiosk-live-export");
      const svg = await liveFrontSvg(layout, await loadKioskEdits(layout.id).catch(() => ({})));
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      setSrc(url);
    });
    io.observe(el);
    return () => { io.disconnect(); if (url) URL.revokeObjectURL(url); };
  }, [layout, rev]);
  return (
    <div ref={ref} style={{ height, width: height * (KIOSK_W / KIOSK_H) }} className="shrink-0 overflow-hidden rounded bg-[#E0E8F5]">
      {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : null}
    </div>
  );
}
