// Layer editor for a California kiosk rebuilt from the partner's live London
// file: every text line and graphic piece is a layer you can retype, move,
// resize, hide or show; the background ramp can be changed; edits save per
// kiosk. The TV keep-clear is drawn as a guide only (never exported).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignLeft, AlignRight,
  AlignStartHorizontal, AlignStartVertical, AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
  ArrowDown, ArrowUp, BringToFront, ClipboardPaste, Copy, CopyPlus, Download, Eye, EyeOff, Lock, Maximize2, Minimize2, Minus, Plus, Redo2, RotateCcw, Save, SendToBack, Trash2, Undo2, Unlock,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  KIOSK_BLEED,
  KIOSK_H,
  KIOSK_MARGIN,
  KIOSK_TV,
  KIOSK_W,
  kioskFontFaceCss,
  kioskFontFamily,
  kioskGround,
  layoutKiosk,
  partGroup,
  defaultPartGroups,
  pieceBackdropPath,
  partCentre,
  withCopies,
  splitArtSvg,
  textLineBoxes,
  type KioskDivider,
  type KioskEdits,
  type LiveLayout,
  type PlacedText,
  type TextAlign,
} from "@/lib/next-california-kiosk-live";
import { downloadKiosk, loadArtSvg, type KioskDownload } from "@/lib/next-california-kiosk-live-export";

type Sel = { kind: "block" | "text" | "part" | "divider"; id: string } | null;

/** Approved TransPerfect accent rules (brand v3.0): Blue 500, Aqua, Lavender, white, Blue 800. */
const ACCENTS = [
  { name: "Blue", color: "#003FC7" },
  { name: "Aqua", color: "#A1FBF9" },
  { name: "Lavender", color: "#C2A3FF" },
  { name: "White", color: "#FFFFFF" },
  { name: "Ink", color: "#03002C" },
] as const;

const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/15 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#03002C] hover:bg-[#F2F4F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] disabled:opacity-50";
const ibtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#03002C]/15 bg-white text-[#03002C] hover:bg-[#F2F4F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] aria-pressed:border-[#003FC7] aria-pressed:bg-[#E0E8F5] disabled:opacity-50";

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
  const [future, setFuture] = useState<KioskEdits[]>([]);
  const clip = useRef<NonNullable<Sel> | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  /** Canvas height in px (zoom) and whether the canvas takes the full width. */
  const [zoom, setZoom] = useState(640);
  const [wide, setWide] = useState(false);
  /** Objects picked with Shift-click, ready to group. */
  const [picked, setPicked] = useState<string[]>([]);
  /** Snap guide x (kiosk points) shown while dragging. */
  const [guide, setGuide] = useState<number | null>(null);
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
  // Nothing is loaded (and so nothing can be saved) until sign-in has
  // resolved, and the value we loaded is never written straight back — that
  // echo used to overwrite a saved kiosk with an empty one on reopen.
  const loaded = useRef(false);
  const loadedEdits = useRef<KioskEdits | null>(null);
  const editsNow = useRef(edits);
  editsNow.current = edits;
  useEffect(() => {
    let live = true;
    loaded.current = false;
    if (userId === undefined) return () => { live = false; };
    const local = readLocalDraft(L.id);
    (async () => {
      const { data, error } = userId
        ? await supabase.from("kiosk_layer_edits").select("edits, updated_at").eq("booth_id", L.id).maybeSingle()
        : { data: null, error: null };
      if (!live) return;
      if (error) { setStatus(`Couldn't load saved changes: ${error.message}. Editing is paused so nothing is overwritten.`); return; }
      const remote = data?.edits as KioskEdits | undefined;
      const remoteAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
      const next = local && local.at > remoteAt ? local.edits : remote ?? null;
      if (next) { loadedEdits.current = next; setEdits(next); }
      else loadedEdits.current = editsNow.current;
      loaded.current = true;
      // A newer local draft still needs sending to the shared copy.
      if (next && next === local?.edits && userId) setTimeout(() => { loadedEdits.current = null; setEdits((e) => ({ ...e })); }, 0);
    })();
    return () => { live = false; };
  }, [L.id, userId]);

  // Autosave: every change is kept on this device at once, and saved to the
  // shared kiosk a moment after you stop editing.
  useEffect(() => {
    if (!loaded.current || userId === undefined) return;
    if (loadedEdits.current === edits) return;
    writeLocalDraft(L.id, edits);
    if (!userId) { setStatus("Kept on this device. Sign in to save for everyone."); return; }
    setStatus("Saving…");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("kiosk_layer_edits").upsert({ booth_id: L.id, edits: edits as never, updated_by: userId, updated_at: new Date().toISOString() });
      if (error) setStatus(`Kept on this device only — not saved for everyone: ${error.message}`);
      else { clearLocalDraft(L.id); setStatus("All changes saved."); window.dispatchEvent(new CustomEvent("kiosk-edits-saved", { detail: L.id })); }
    }, 1200);
    return () => clearTimeout(t);
  }, [edits, L.id, userId]);

  const placed = useMemo(() => layoutKiosk(L, edits), [L, edits]);
  const ground = kioskGround(L, edits);
  const symId = `kart-${L.id}`;

  const commit = (next: KioskEdits) => { setHistory((h) => [...h.slice(-49), edits]); setFuture([]); setEdits(next); };
  /** The layout with the user's duplicates, for lists and lookups. */
  const LX = useMemo(() => withCopies(L, edits), [L, edits]);
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
    if ((edits.locked ?? []).includes(s.id)) return;
    setFuture([]);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e);
    drag.current = { sel: s, x: p.x, y: p.y, start: edits };
    setHistory((h) => [...h.slice(-49), edits]);
  };

  /** Move a selection (and its group) by dx/dy kiosk points. */
  const shift = (s: NonNullable<Sel>, dx: number, dy: number, base: KioskEdits = edits): KioskEdits => {
    if (s.kind === "divider")
      return { ...base, dividers: (base.dividers ?? []).map((d) => (d.id === s.id ? { ...d, x: d.x + dx, y: d.y + dy } : d)) };
    const key = s.kind === "block" ? "blocks" : s.kind === "part" ? "parts" : "texts";
    const map = { ...(base[key] as Record<string, { dx?: number; dy?: number }> | undefined) };
    const ids = s.kind === "part" ? partGroup(base, s.id, L) : [s.id];
    for (const id of ids) map[id] = { ...map[id], dx: (map[id]?.dx ?? 0) + dx, dy: (map[id]?.dy ?? 0) + dy };
    return { ...base, [key]: map };
  };

  const measureCtx = useMemo(() => (typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")), []);
  const measure = (t: PlacedText) => (s: string) => {
    if (!measureCtx) return [...s].length * t.ksize * 0.55;
    measureCtx.font = `${t.ksize}px ${kioskFontFamily(t.font)}`;
    return measureCtx.measureText(s).width;
  };
  /** Bounds of a selection on the kiosk (kiosk points). */
  const selBounds = (s: NonNullable<Sel>, base: KioskEdits = edits) => {
    const pl = layoutKiosk(L, base);
    if (s.kind === "divider") {
      const d = base.dividers?.find((x) => x.id === s.id);
      return d ? { x0: d.x, x1: d.x + d.w, y0: d.y, y1: d.y + d.h } : null;
    }
    if (s.kind === "block") {
      const p = pl.find((x) => x.block.id === s.id);
      return p ? { x0: p.x, x1: p.x + L.trimW * p.scale, y0: p.y, y1: p.y + (p.clipBottom - p.clipTop) * p.scale } : null;
    }
    if (s.kind === "text") {
      const t = pl.flatMap((p) => p.texts).find((x) => x.id === s.id);
      if (!t) return null;
      const bx = t.fixed ? [{ x: t.kx, w: t.kw, y: t.ky }] : textLineBoxes(t, measure(t));
      return { x0: Math.min(...bx.map((b) => b.x)), x1: Math.max(...bx.map((b) => b.x + b.w)), y0: t.ky - t.ksize * 0.8, y1: bx[bx.length - 1]!.y + t.ksize * 0.2 };
    }
    const ids = partGroup(base, s.id, L);
    const qs = pl.flatMap((p) => p.parts).filter((q) => ids.includes(q.part.id));
    if (!qs.length) return null;
    return {
      x0: Math.min(...qs.map((q) => q.x)), x1: Math.max(...qs.map((q) => q.x + (q.src.x1 - q.src.x0) * q.scale)),
      y0: Math.min(...qs.map((q) => q.y)), y1: Math.max(...qs.map((q) => q.y + (q.src.y1 - q.src.y0) * q.scale)),
    };
  };

  /** Snap a moved selection's edges/centre to the kiosk margins and centre line. */
  const snap = (s: NonNullable<Sel>, next: KioskEdits) => {
    const b = selBounds(s, next);
    if (!b) return { next, g: null as number | null };
    const tol = 18;
    const cx = (b.x0 + b.x1) / 2;
    const tries: [number, number][] = [[KIOSK_W / 2 - cx, KIOSK_W / 2], [KIOSK_MARGIN - b.x0, KIOSK_MARGIN], [KIOSK_W - KIOSK_MARGIN - b.x1, KIOSK_W - KIOSK_MARGIN]];
    const hit = tries.find(([d]) => Math.abs(d) <= tol);
    return hit ? { next: shift(s, hit[0], 0, next), g: hit[1] } : { next, g: null };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    const moved = shift(d.sel, p.x - d.x, p.y - d.y, d.start);
    const r = e.altKey ? { next: moved, g: null } : snap(d.sel, moved);
    setGuide(r.g);
    setEdits(r.next);
  };
  const endDrag = () => { drag.current = null; setGuide(null); };

  /** Put the selection against the left margin, the centre line or the right margin. */
  const alignKiosk = (where: TextAlign, base: KioskEdits = edits) => {
    if (!sel || (base.locked ?? []).includes(sel.id)) return;
    let b0 = base;
    if (sel.kind === "text") b0 = { ...base, texts: { ...base.texts, [sel.id]: { ...base.texts?.[sel.id], align: where } } };
    const b = selBounds(sel, b0);
    if (!b) return;
    const d = where === "left" ? KIOSK_MARGIN - b.x0 : where === "center" ? KIOSK_W / 2 - (b.x0 + b.x1) / 2 : KIOSK_W - KIOSK_MARGIN - b.x1;
    commit(shift(sel, d, 0, b0));
  };

  /** Align or spread the Shift-picked objects relative to each other. */
  const alignPicked = (mode: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom" | "hspread" | "vspread") => {
    const qs = placed.flatMap((p) => p.parts).filter((q) => picked.includes(q.part.id))
      .map((q) => ({ id: q.part.id, x0: q.x, y0: q.y, w: (q.src.x1 - q.src.x0) * q.scale, h: (q.src.y1 - q.src.y0) * q.scale }));
    if (qs.length < 2) return;
    const U = { x0: Math.min(...qs.map((q) => q.x0)), x1: Math.max(...qs.map((q) => q.x0 + q.w)), y0: Math.min(...qs.map((q) => q.y0)), y1: Math.max(...qs.map((q) => q.y0 + q.h)) };
    const mv: Record<string, [number, number]> = {};
    const spread = (axis: "x" | "y") => {
      const s = [...qs].sort((a, b) => (axis === "x" ? a.x0 - b.x0 : a.y0 - b.y0));
      const span = axis === "x" ? U.x1 - U.x0 : U.y1 - U.y0;
      const gap = (span - s.reduce((n, q) => n + (axis === "x" ? q.w : q.h), 0)) / (s.length - 1);
      let at = axis === "x" ? U.x0 : U.y0;
      for (const q of s) { mv[q.id] = axis === "x" ? [at - q.x0, 0] : [0, at - q.y0]; at += (axis === "x" ? q.w : q.h) + gap; }
    };
    if (mode === "hspread") spread("x");
    else if (mode === "vspread") spread("y");
    else for (const q of qs)
      mv[q.id] = mode === "left" ? [U.x0 - q.x0, 0] : mode === "right" ? [U.x1 - q.x0 - q.w, 0] : mode === "hcenter" ? [(U.x0 + U.x1) / 2 - q.x0 - q.w / 2, 0]
        : mode === "top" ? [0, U.y0 - q.y0] : mode === "bottom" ? [0, U.y1 - q.y0 - q.h] : [0, (U.y0 + U.y1) / 2 - q.y0 - q.h / 2];
    const parts = { ...edits.parts };
    for (const [id, [dx, dy]] of Object.entries(mv)) parts[id] = { ...parts[id], dx: (parts[id]?.dx ?? 0) + dx, dy: (parts[id]?.dy ?? 0) + dy };
    commit({ ...edits, parts });
  };

  const addDivider = (preset: "short" | "full" | "under") => {
    let x = KIOSK_MARGIN, y = KIOSK_TV.y + KIOSK_TV.h + 144, w = 540;
    if (preset === "full") w = KIOSK_W - 2 * KIOSK_MARGIN;
    if (preset === "under" && sel) {
      const b = selBounds(sel);
      if (b) { x = b.x0; y = b.y1 + 48; w = Math.max(144, Math.min(b.x1 - b.x0, 900)); }
    }
    const id = `div-${Date.now().toString(36)}`;
    commit({ ...edits, dividers: [...(edits.dividers ?? []), { id, x, y, w, h: 18, color: ACCENTS[0]!.color, round: false }] });
    setSel({ kind: "divider", id }); setPicked([]);
  };
  const patchDivider = (id: string, p: Partial<KioskDivider>, push = true) => {
    const next = { ...edits, dividers: (edits.dividers ?? []).map((d) => (d.id === id ? { ...d, ...p } : d)) };
    push ? commit(next) : setEdits(next);
  };

  // ---- everyday tools: redo, lock, duplicate, copy/paste, delete, stacking ----
  const undo = () => {
    if (!history.length) return;
    setFuture((f) => [edits, ...f].slice(0, 50));
    setEdits(history[history.length - 1]!); setHistory((h) => h.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h.slice(-49), edits]);
    setEdits(future[0]!); setFuture((f) => f.slice(1));
  };
  const isLocked = (id: string) => (edits.locked ?? []).includes(id);
  const toggleLock = (id: string) => {
    const ids = sel?.kind === "part" ? partGroup(edits, id, L) : [id];
    const on = isLocked(id);
    commit({ ...edits, locked: on ? (edits.locked ?? []).filter((x) => !ids.includes(x)) : [...new Set([...(edits.locked ?? []), ...ids])] });
  };
  const newId = (p: string) => `${p}-c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const duplicate = (s: NonNullable<Sel> | null = sel) => {
    if (!s || s.kind === "block") return;
    const off = 72;
    if (s.kind === "divider") {
      const d = edits.dividers?.find((x) => x.id === s.id);
      if (!d) return;
      const id = newId("div");
      commit({ ...edits, dividers: [...(edits.dividers ?? []), { ...d, id, x: d.x + off, y: d.y + off }] });
      setSel({ kind: "divider", id }); return;
    }
    const root = (id: string) => edits.copies?.find((c) => c.id === id)?.of ?? id;
    const ids = s.kind === "part" ? partGroup(edits, s.id, L) : [s.id];
    const key = s.kind === "part" ? "parts" : "texts";
    const map = { ...(edits[key] as Record<string, { dx?: number; dy?: number }> | undefined) };
    const copies = [...(edits.copies ?? [])];
    const made: string[] = [];
    const topZ = Math.max(0, ...Object.values(edits.z ?? {})) + 1;
    const z = { ...edits.z };
    for (const id of ids) {
      const nid = newId(root(id));
      copies.push({ id: nid, of: root(id), kind: s.kind });
      map[nid] = { ...map[id], dx: (map[id]?.dx ?? 0) + off, dy: (map[id]?.dy ?? 0) + off };
      if (s.kind === "part") z[nid] = topZ;
      made.push(nid);
    }
    const groups = made.length > 1 ? [...(edits.groups ?? defaultPartGroups(L)), made] : edits.groups;
    commit({ ...edits, copies, [key]: map, z, ...(groups ? { groups } : {}) });
    if (s.kind === "part") { setPicked(made); setSel({ kind: "part", id: made[0]! }); } else setSel({ kind: "text", id: made[0]! });
  };
  const removeSel = () => {
    if (!sel || sel.kind === "block") return;
    if (sel.kind === "divider") { commit({ ...edits, dividers: (edits.dividers ?? []).filter((d) => d.id !== sel.id) }); setSel(null); return; }
    const ids = sel.kind === "part" ? partGroup(edits, sel.id, L) : [sel.id];
    const key = sel.kind === "part" ? "parts" : "texts";
    const map = { ...(edits[key] as Record<string, object> | undefined) };
    // Copies are removed; London originals are hidden (Reset or the eye brings them back).
    for (const id of ids) if (isCopy(id)) delete map[id]; else map[id] = { ...map[id], hidden: true };
    commit({ ...edits, [key]: map, copies: (edits.copies ?? []).filter((c) => !ids.includes(c.id)), groups: edits.groups?.map((g) => g.filter((x) => !(ids.includes(x) && isCopy(x)))).filter((g) => g.length > 1) });
    setSel(null); setPicked([]);
  };
  /** Stacking: objects within their piece, dividers among dividers. */
  const arrange = (dir: "front" | "forward" | "backward" | "back") => {
    if (!sel) return;
    if (sel.kind === "divider") {
      const arr = [...(edits.dividers ?? [])];
      const i = arr.findIndex((d) => d.id === sel.id);
      if (i < 0) return;
      const [d] = arr.splice(i, 1);
      const j = dir === "front" ? arr.length : dir === "back" ? 0 : Math.max(0, Math.min(arr.length, i + (dir === "forward" ? 1 : -1)));
      arr.splice(j, 0, d!);
      commit({ ...edits, dividers: arr }); return;
    }
    if (sel.kind !== "part") return;
    const ids = partGroup(edits, sel.id, L);
    const zs = Object.values(edits.z ?? {});
    const cur = edits.z?.[sel.id] ?? 0;
    const v = dir === "front" ? Math.max(0, ...zs) + 1 : dir === "back" ? Math.min(0, ...zs) - 1 : cur + (dir === "forward" ? 1 : -1);
    commit({ ...edits, z: { ...edits.z, ...Object.fromEntries(ids.map((id) => [id, v])) } });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input,textarea,select")) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k === "y") { e.preventDefault(); redo(); return; }
    if (mod && k === "v" && clip.current) { e.preventDefault(); duplicate(clip.current); return; }
    if (!sel) return;
    if (mod && k === "c") { clip.current = sel; setStatus("Copied — press Ctrl/⌘ V to paste."); return; }
    if (mod && k === "d") { e.preventDefault(); duplicate(); return; }
    if (e.key === "]") { e.preventDefault(); arrange(e.shiftKey ? "front" : "forward"); return; }
    if (e.key === "[") { e.preventDefault(); arrange(e.shiftKey ? "back" : "backward"); return; }
    const step = e.shiftKey ? 36 : 3;
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (m[e.key]) { e.preventDefault(); if (!isLocked(sel.id)) commit(shift(sel, m[e.key]![0], m[e.key]![1])); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSel(); }
  };

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
  const selPart = sel?.kind === "part" ? LX.blocks.flatMap((b) => b.parts ?? []).find((q) => q.id === sel.id) : null;
  const selText = sel?.kind === "text" ? LX.texts.find((t) => t.id === sel.id) : null;
  const isCopy = (id: string) => (edits.copies ?? []).some((c) => c.id === id);
  /** Current opacity / rotation of the selection (text, object or divider). */
  const selFx = (() => {
    if (!sel || sel.kind === "block") return null;
    if (sel.kind === "divider") { const d = edits.dividers?.find((x) => x.id === sel.id); return d ? { opacity: d.opacity ?? 1, rot: d.rot ?? 0 } : null; }
    const e = (sel.kind === "text" ? edits.texts : edits.parts)?.[sel.id];
    return { opacity: e?.opacity ?? 1, rot: e?.rot ?? 0 };
  })();
  const setFx = (p: { opacity?: number; rot?: number }, push = true) => {
    if (!sel || sel.kind === "block") return;
    if (sel.kind === "divider") return patchDivider(sel.id, p, push);
    if (sel.kind === "text") return patchText(sel.id, p, push);
    // Objects: apply to the whole group.
    const ids = partGroup(edits, sel.id, L);
    const next = { ...edits, parts: { ...edits.parts, ...Object.fromEntries(ids.map((id) => [id, { ...edits.parts?.[id], ...p }])) } };
    push ? commit(next) : setEdits(next);
  };
  const selPlaced = selText ? placed.flatMap((p) => p.texts).find((t) => t.id === selText.id) ?? null : null;
  const selDivider = sel?.kind === "divider" ? edits.dividers?.find((d) => d.id === sel.id) ?? null : null;

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
        <div tabIndex={0} onKeyDown={onKey} aria-label="Kiosk canvas. Arrow keys nudge the selection." className="max-h-[80vh] overflow-auto rounded-md border border-[#03002C]/12 bg-[#F2F4F9] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
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
                const c = partCentre(q);
                return (
                  <g key={q.part.id} opacity={q.opacity < 1 ? q.opacity : undefined} transform={q.rot ? `rotate(${q.rot} ${c.x} ${c.y})` : undefined}>
                    <g transform={`translate(${q.x - q.src.x0 * q.scale} ${q.y - q.src.y0 * q.scale}) scale(${q.scale})`} onPointerDown={startDrag({ kind: "part", id: q.part.id })} className={isLocked(q.part.id) ? "cursor-default" : "cursor-move"}>
                      <g clipPath={`url(#kc-${L.id}-${q.part.id})`}>
                        <use href={`#${symId}`} x={-L.originX} y={-L.originY} width={vw} height={vh} />
                      </g>
                      <rect x={q.src.x0} y={q.src.y0} width={q.src.x1 - q.src.x0} height={q.src.y1 - q.src.y0} fill="transparent" stroke={on ? "#003FC7" : "none"} strokeWidth={10 / q.scale} strokeDasharray={`${30 / q.scale} ${15 / q.scale}`} />
                    </g>
                  </g>
                );
              })}
              {(edits.dividers ?? []).filter((d) => !d.hidden).map((d) => {
                const on = sel?.kind === "divider" && sel.id === d.id;
                return (
                  <g key={d.id} onPointerDown={startDrag({ kind: "divider", id: d.id })} className={isLocked(d.id) ? "cursor-default" : "cursor-move"}
                    opacity={(d.opacity ?? 1) < 1 ? d.opacity : undefined} transform={d.rot ? `rotate(${d.rot} ${d.x + d.w / 2} ${d.y + d.h / 2})` : undefined}>
                    <rect x={d.x} y={d.y - 20} width={d.w} height={d.h + 40} fill="transparent" />
                    <rect x={d.x} y={d.y} width={d.w} height={d.h} rx={d.round ? d.h / 2 : 0} fill={d.color} />
                    {on ? <rect x={d.x - 8} y={d.y - 8} width={d.w + 16} height={d.h + 16} fill="none" stroke="#003FC7" strokeWidth={6} strokeDasharray="24 12" /> : null}
                  </g>
                );
              })}
              {placed.flatMap((p) => p.texts).map((t) => {
                const on = sel?.kind === "text" && sel.id === t.id;
                return (
                  <text
                    key={t.id}
                    fontSize={t.ksize}
                    fill={t.fill}
                    fontFamily={kioskFontFamily(t.font)}
                    textAnchor={t.align === "center" ? "middle" : t.align === "right" ? "end" : "start"}
                    letterSpacing={t.trackPt || undefined}
                    textLength={t.fixed ? t.kw : undefined}
                    lengthAdjust="spacing"
                    xmlSpace="preserve"
                    opacity={t.opacity < 1 ? t.opacity : undefined}
                    transform={t.rot ? `rotate(${t.rot} ${t.ax} ${t.ky})` : undefined}
                    className={isLocked(t.id) ? "cursor-default" : "cursor-move"}
                    stroke={on ? "#003FC7" : undefined}
                    strokeWidth={on ? 3 : undefined}
                    paintOrder="stroke"
                    onPointerDown={startDrag({ kind: "text", id: t.id })}
                  >
                    {t.lines.map((s, i) => (
                      <tspan key={i} x={t.ax} y={t.ky + i * t.lead * t.ksize}>{s || " "}</tspan>
                    ))}
                  </text>
                );
              })}
              {guide !== null ? (
                <line data-export-ignore="true" pointerEvents="none" x1={guide} x2={guide} y1={0} y2={KIOSK_H} stroke="#EC388A" strokeWidth={4} strokeDasharray="18 12" />
              ) : null}
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
      <div className={wide ? "order-2" : "order-2 lg:order-1"}>
        <h4 className="text-sm font-semibold text-[#03002C]">Layers</h4>
        <ul className="mt-2 max-h-[640px] space-y-1 overflow-auto pr-1">
          {LX.blocks.map((b) => {
            const hidden = edits.blocks?.[b.id]?.hidden ?? b.screen;
            const texts = LX.texts.filter((t) => { const m = (t.top + t.bottom) / 2; return m >= b.y0 && m < b.y1; });
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
                            {isCopy(q.id) ? "Copy of object" : `Object ${i + 1}`}{(edits.groups ?? defaultPartGroups(L)).some((g) => g.includes(q.id)) ? " · grouped" : ""}{isLocked(q.id) ? " · locked" : ""}
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
        {edits.dividers?.length ? (
          <>
            <h4 className="mt-3 text-sm font-semibold text-[#03002C]">Accent dividers</h4>
            <ul className="mt-1 space-y-1">
              {edits.dividers.map((d, i) => (
                <li key={d.id} className="flex items-center gap-1 rounded-md border border-[#03002C]/10 bg-white px-2 py-1">
                  <span aria-hidden className="h-2 w-6 rounded-sm border border-[#03002C]/20" style={{ background: d.color }} />
                  <button type="button" className={`flex-1 truncate text-left text-[12px] ${sel?.id === d.id ? "text-[#003FC7]" : "text-[#03002C]"}`} onClick={() => { setSel({ kind: "divider", id: d.id }); setPicked([]); }}>Divider {i + 1}</button>
                  <button type="button" aria-label={d.hidden ? "Show divider" : "Hide divider"} className="rounded p-1 hover:bg-[#F2F4F9]" onClick={() => patchDivider(d.id, { hidden: !d.hidden })}>
                    {d.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {/* Inspector */}
      <div className="order-3 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={!history.length} onClick={undo} title="Undo (Ctrl/⌘ Z)"><Undo2 className="h-3.5 w-3.5" />Undo</button>
          <button type="button" className={btn} disabled={!future.length} onClick={redo} title="Redo (Ctrl/⌘ Shift Z)"><Redo2 className="h-3.5 w-3.5" />Redo</button>
          <button type="button" className={btn} onClick={() => commit({})}><RotateCcw className="h-3.5 w-3.5" />Reset to London</button>
          <button type="button" className={btn} disabled={!userId || busy === "save"} onClick={save} title={userId ? undefined : "Sign in to save"}><Save className="h-3.5 w-3.5" />Save</button>
        </div>

        {sel && sel.kind !== "block" && selFx ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#03002C]">Arrange</h4>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={btn} onClick={() => duplicate()} title="Duplicate (Ctrl/⌘ D)"><CopyPlus className="h-3.5 w-3.5" />Duplicate</button>
              <button type="button" className={btn} onClick={() => { clip.current = sel; setStatus("Copied — press Ctrl/⌘ V to paste."); }} title="Copy (Ctrl/⌘ C)"><Copy className="h-3.5 w-3.5" />Copy</button>
              <button type="button" className={btn} disabled={!clip.current} onClick={() => clip.current && duplicate(clip.current)} title="Paste (Ctrl/⌘ V)"><ClipboardPaste className="h-3.5 w-3.5" />Paste</button>
              <button type="button" className={btn} aria-pressed={isLocked(sel.id)} onClick={() => toggleLock(sel.id)}>{isLocked(sel.id) ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}{isLocked(sel.id) ? "Locked" : "Lock"}</button>
              <button type="button" className={btn} onClick={removeSel} title="Delete (Del)"><Trash2 className="h-3.5 w-3.5" />{sel.kind === "divider" || isCopy(sel.id) ? "Delete" : "Remove"}</button>
            </div>
            {sel.kind !== "text" ? (
              <div className="flex gap-1" role="group" aria-label="Stacking order">
                <button type="button" className={ibtn} aria-label="Bring to front" title="Bring to front (Shift ])" onClick={() => arrange("front")}><BringToFront className="h-4 w-4" /></button>
                <button type="button" className={ibtn} aria-label="Bring forward" title="Bring forward (])" onClick={() => arrange("forward")}><ArrowUp className="h-4 w-4" /></button>
                <button type="button" className={ibtn} aria-label="Send backward" title="Send backward ([)" onClick={() => arrange("backward")}><ArrowDown className="h-4 w-4" /></button>
                <button type="button" className={ibtn} aria-label="Send to back" title="Send to back (Shift [)" onClick={() => arrange("back")}><SendToBack className="h-4 w-4" /></button>
              </div>
            ) : null}
            <label className="block text-[12px] text-[#03002C]/80">See-through {Math.round(selFx.opacity * 100)}%
              <input type="range" min={5} max={100} className="mt-1 w-full" value={Math.round(selFx.opacity * 100)} onChange={(e) => setFx({ opacity: Number(e.target.value) / 100 }, false)} onPointerUp={() => setHistory((h) => [...h, edits])} />
            </label>
            <label className="block text-[12px] text-[#03002C]/80">Rotate {Math.round(selFx.rot)}°
              <input type="range" min={-180} max={180} className="mt-1 w-full" value={Math.round(selFx.rot)} onChange={(e) => setFx({ rot: Number(e.target.value) }, false)} onPointerUp={() => setHistory((h) => [...h, edits])} />
            </label>
            <div className="flex gap-1">
              {[-90, 0, 90].map((r) => <button key={r} type="button" className={btn} onClick={() => setFx({ rot: r })}>{r === 0 ? "Straight" : `${r > 0 ? "+" : ""}${r}°`}</button>)}
            </div>
            {isLocked(sel.id) ? <p className="text-[11px] text-[#03002C]/65">Locked: it can't be dragged, nudged or aligned until you unlock it.</p> : null}
            {sel.kind !== "text" && sel.kind !== "divider" ? <p className="text-[11px] text-[#03002C]/65">Stacking changes order among the objects in the same piece. Text always sits on top.</p> : null}
          </div>
        ) : null}

        {sel ? (
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-[#03002C]">Align on kiosk</h4>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Align on kiosk">
              <button type="button" className={ibtn} aria-label="Left margin" title="Left margin (2 in)" onClick={() => alignKiosk("left")}><AlignStartVertical className="h-4 w-4" /></button>
              <button type="button" className={ibtn} aria-label="Centre of kiosk" title="Centre of kiosk" onClick={() => alignKiosk("center")}><AlignCenterVertical className="h-4 w-4" /></button>
              <button type="button" className={ibtn} aria-label="Right margin" title="Right margin (2 in)" onClick={() => alignKiosk("right")}><AlignEndVertical className="h-4 w-4" /></button>
            </div>
            <p className="text-[11px] text-[#03002C]/65">Dragging snaps to the margins and centre line (hold Alt to move freely). Arrow keys nudge; Shift + arrow moves ½ in.</p>
          </div>
        ) : null}

        {selText && selPlaced ? (
          <div className="space-y-2.5">
            <h4 className="text-sm font-semibold text-[#03002C]">Text</h4>
            <label className="block text-[12px] text-[#03002C]/80">Words <span className="text-[#03002C]/60">(Enter starts a new line)</span>
              <textarea className="mt-1 w-full rounded-md border border-[#03002C]/15 p-2 text-[13px] text-[#03002C]" rows={3} value={edits.texts?.[selText.id]?.text ?? selText.text} onChange={(e) => patchText(selText.id, { text: e.target.value }, false)} onBlur={() => setHistory((h) => [...h, edits])} />
            </label>
            <div className="space-y-1">
              <span className="text-[12px] text-[#03002C]/80">Line alignment</span>
              <div className="flex gap-1" role="group" aria-label="Line alignment">
                {([["left", AlignLeft, "Align lines left"], ["center", AlignCenter, "Centre lines"], ["right", AlignRight, "Align lines right"]] as const).map(([a, Icon, label]) => (
                  <button key={a} type="button" className={ibtn} aria-label={label} title={label} aria-pressed={selPlaced.align === a} onClick={() => patchText(selText.id, { align: a })}><Icon className="h-4 w-4" /></button>
                ))}
              </div>
            </div>
            <label className="block text-[12px] text-[#03002C]/80">Size {Math.round(edits.texts?.[selText.id]?.size ?? selText.size)} pt
              <div className="mt-1 flex items-center gap-2">
                <input type="range" min={6} max={Math.max(400, Math.round(selText.size * 3))} className="flex-1" value={Math.round(edits.texts?.[selText.id]?.size ?? selText.size)} onChange={(e) => patchText(selText.id, { size: Number(e.target.value) }, false)} />
                <input type="number" min={6} aria-label="Size in points" className="w-16 rounded-md border border-[#03002C]/15 p-1 text-[13px]" value={Math.round(edits.texts?.[selText.id]?.size ?? selText.size)} onChange={(e) => patchText(selText.id, { size: Number(e.target.value) || selText.size })} />
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => {
                const b = selBounds({ kind: "text", id: selText.id });
                if (!b) return;
                const cur = edits.texts?.[selText.id]?.size ?? selText.size;
                const size = Math.max(6, Math.floor(cur * ((KIOSK_W - 2 * KIOSK_MARGIN) / Math.max(1, b.x1 - b.x0))));
                alignKiosk("center", { ...edits, texts: { ...edits.texts, [selText.id]: { ...edits.texts?.[selText.id], size } } });
              }}>Fit to kiosk width</button>
              <button type="button" className={btn} onClick={() => patchText(selText.id, { size: undefined, lead: undefined, track: undefined, align: undefined })}>Original sizing</button>
            </div>
            <label className="block text-[12px] text-[#03002C]/80">Line spacing {selPlaced.lead.toFixed(2)}×
              <input type="range" min={80} max={200} className="mt-1 w-full" value={Math.round(selPlaced.lead * 100)} onChange={(e) => patchText(selText.id, { lead: Number(e.target.value) / 100 }, false)} />
            </label>
            <label className="block text-[12px] text-[#03002C]/80">Letter spacing {edits.texts?.[selText.id]?.track ?? 0}
              <input type="range" min={-50} max={300} step={5} className="mt-1 w-full" value={edits.texts?.[selText.id]?.track ?? 0} onChange={(e) => patchText(selText.id, { track: Number(e.target.value) || undefined }, false)} />
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#03002C]/80">Colour
              <input type="color" value={edits.texts?.[selText.id]?.color ?? selText.color} onChange={(e) => patchText(selText.id, { color: e.target.value.toUpperCase() })} />
            </label>
            {(() => {
              const me = selBounds({ kind: "text", id: selText.id });
              if (!me) return null;
              const hits = placed.flatMap((p) => p.texts).filter((o) => {
                if (o.id === selText.id) return false;
                const b = selBounds({ kind: "text", id: o.id });
                return !!b && b.x0 < me.x1 && b.x1 > me.x0 && b.y0 < me.y1 && b.y1 > me.y0;
              });
              return hits.length ? (
                <p role="alert" className="rounded-md border border-[#E53D2E]/40 bg-[#E53D2E]/5 p-2 text-[12px] text-[#03002C]">
                  Overlaps {hits.slice(0, 2).map((h) => `“${h.lines[0]}”`).join(", ")}{hits.length > 2 ? ` and ${hits.length - 2} more` : ""}. Move this text or the line it touches, or reduce the size.
                </p>
              ) : null;
            })()}
            <p className="text-[11px] text-[#03002C]/65">Font: {selText.font}. Unedited lines keep the London letter spacing; changing words, size, lines or spacing uses the font's own spacing.</p>
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
            {picked.length > 1 ? (
              <div className="flex flex-wrap gap-1" role="group" aria-label="Align objects to each other">
                {([
                  ["left", AlignStartVertical, "Align left edges"], ["hcenter", AlignCenterVertical, "Align centres"], ["right", AlignEndVertical, "Align right edges"],
                  ["top", AlignStartHorizontal, "Align tops"], ["vmiddle", AlignCenterHorizontal, "Align middles"], ["bottom", AlignEndHorizontal, "Align bottoms"],
                  ["hspread", AlignHorizontalSpaceAround, "Spread evenly across"], ["vspread", AlignVerticalSpaceAround, "Spread evenly down"],
                ] as const).map(([m, Icon, label]) => (
                  <button key={m} type="button" className={ibtn} aria-label={label} title={label} disabled={(m === "hspread" || m === "vspread") && picked.length < 3} onClick={() => alignPicked(m)}><Icon className="h-4 w-4" /></button>
                ))}
              </div>
            ) : null}
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

        {selDivider ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[#03002C]">Accent divider</h4>
            <label className="block text-[12px] text-[#03002C]/80">Length {Math.round(selDivider.w / 72)} in
              <input type="range" min={36} max={KIOSK_W - 2 * KIOSK_MARGIN} className="mt-1 w-full" value={selDivider.w} onChange={(e) => patchDivider(selDivider.id, { w: Number(e.target.value) }, false)} />
            </label>
            <label className="block text-[12px] text-[#03002C]/80">Thickness {(selDivider.h / 72).toFixed(2)} in
              <input type="range" min={3} max={72} className="mt-1 w-full" value={selDivider.h} onChange={(e) => patchDivider(selDivider.id, { h: Number(e.target.value) }, false)} />
            </label>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Divider colour">
              {ACCENTS.map((a) => (
                <button key={a.color} type="button" aria-label={a.name} title={a.name} aria-pressed={selDivider.color === a.color}
                  className="h-7 w-7 rounded-md border border-[#03002C]/25 aria-pressed:ring-2 aria-pressed:ring-[#003FC7] aria-pressed:ring-offset-1"
                  style={{ background: a.color }} onClick={() => patchDivider(selDivider.id, { color: a.color })} />
              ))}
              <input type="color" aria-label="Custom colour" value={selDivider.color} onChange={(e) => patchDivider(selDivider.id, { color: e.target.value.toUpperCase() })} />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-[#03002C]/80">
              <input type="checkbox" checked={!!selDivider.round} onChange={(e) => patchDivider(selDivider.id, { round: e.target.checked })} /> Rounded ends
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => patchDivider(selDivider.id, { hidden: !selDivider.hidden })}>{selDivider.hidden ? "Show" : "Hide"}</button>
              <button type="button" className={btn} onClick={() => { commit({ ...edits, dividers: (edits.dividers ?? []).filter((d) => d.id !== selDivider.id) }); setSel(null); }}><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[#03002C]">Add accent divider</h4>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => addDivider("short")}>Short rule</button>
            <button type="button" className={btn} onClick={() => addDivider("full")}>Full width</button>
            <button type="button" className={btn} disabled={!sel || sel.kind === "divider"} onClick={() => addDivider("under")}>Under selection</button>
          </div>
          <p className="text-[11px] text-[#03002C]/65">Accent rules use the approved blue, aqua and lavender. They export as live vector shapes on their own Accents layer.</p>
        </div>

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
