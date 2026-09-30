// Layer editor for a California kiosk rebuilt from the partner's live London
// file: every text line and graphic piece is a layer you can retype, move,
// resize, hide or show; the background ramp can be changed; edits save per
// kiosk. The TV keep-clear is drawn as a guide only (never exported).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignLeft, AlignRight,
  AlignStartHorizontal, AlignStartVertical, AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
  ArrowDown, ArrowUp, BringToFront, ClipboardPaste, Copy, CopyPlus, Download, Eye, EyeOff, Lock, Maximize2, Minimize2, Minus, Plus, Redo2, RotateCcw, Save, SendToBack, Trash2, Type, Undo2, Unlock,
  MousePointer2, RectangleHorizontal, ZoomIn, ZoomOut, Ruler as RulerIcon, Columns3, Shapes, Group, Ungroup, CheckCircle2, AlertTriangle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  KIOSK_BLEED,
  KIOSK_H,
  KIOSK_MARGIN as KIOSK_MARGIN_FRONT,
  KIOSK_RETURN_W,
  KIOSK_TV,
  kioskHasTv as kioskHasTvFront,
  KIOSK_W as KIOSK_W_FRONT,
  kioskEditKey,
  kioskEditKeyParts,
  kioskFaceLayout,
  kioskFaceW,
  kioskFaceH,
  kioskMarginX,
  type KioskFace,
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
  nativeSymbols,
  partSource,
  KIOSK_LIVE_LAYOUTS,
  textLineBoxes,
  badgedPartIds,
  type KioskDivider,
  kioskMissingFonts,
  type KioskEdits,
  type LiveLayout,
  type PlacedText,
  type TextAlign,
  cmykScreen,
} from "@/lib/next-california-kiosk-live";
import { downloadKiosk, loadArtSvg, type KioskDownload } from "@/lib/next-california-kiosk-live-export";
import { kioskCmykMaster } from "@/lib/next-california-kiosk-cmyk-masters";

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

/**
 * Saved changes only apply to the layout they were made on. Changes made on
 * the older London-based kiosk would land in the wrong places on a kiosk read
 * from the designer's CMYK file, so they are set aside (kept, not applied).
 */
function forLayout(L: LiveLayout, e: KioskEdits | null | undefined): KioskEdits | null {
  if (!e) return null;
  const want = L.native?.version;
  if ((e.layoutVersion ?? undefined) === want) return e;
  return want ? { layoutVersion: want, parked: e } : null;
}

/** Saved edits for a kiosk (shared copy, or this device's newer draft). `id` may be a strip key (`<kiosk>--left`). */
async function loadKioskEdits(id: string): Promise<KioskEdits> {
  const kp = kioskEditKeyParts(id);
  const base = KIOSK_LIVE_LAYOUTS[kp.id];
  const LF = base && kp.face ? kioskFaceLayout(base, kp.face) : base;
  const local = readLocalDraft(id);
  const { data } = await supabase.from("kiosk_layer_edits").select("edits, updated_at").eq("booth_id", id).maybeSingle();
  const remoteAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
  if (local && local.at > remoteAt) return local.edits;
  return forLayout(LF ?? ({} as LiveLayout), data?.edits as KioskEdits | undefined) ?? {};
}

const FACE_LABEL: Record<"front" | KioskFace, string> = { front: "Kiosk front", left: "Left strip", right: "Right strip" };

/**
 * The kiosk editor: the front and, on kiosks read from the designer's CMYK
 * file, both side strips — each strip is edited with exactly the same tools.
 */
export function KioskLayerEditor({ layout, vendor, fill = false, embedded = false }: { layout: LiveLayout; vendor: string; fill?: boolean; embedded?: boolean }) {
  const [face, setFace] = useState<"front" | KioskFace>("front");
  const hasFaces = !!layout.native?.faces;
  const FL = face === "front" ? layout : kioskFaceLayout(layout, face) ?? layout;
  return <KioskFaceEditor key={face} layout={FL} front={layout} face={face} onFace={hasFaces ? setFace : undefined} vendor={vendor} fill={fill} embedded={embedded} />;
}

function KioskFaceEditor({ layout: L, front, face, onFace, vendor, fill = false, embedded = false }: { layout: LiveLayout; front: LiveLayout; face: "front" | KioskFace; onFace?: (f: "front" | KioskFace) => void; vendor: string; fill?: boolean; embedded?: boolean }) {
  // Face geometry: the front is 45 in wide, a side strip 4 in.
  const KIOSK_W = kioskFaceW(L);
  const KIOSK_H = kioskFaceH(L);
  const KIOSK_MARGIN = L.face || L.sign ? kioskMarginX(L) : KIOSK_MARGIN_FRONT;
  // Signs: "Fit" keeps wide signs on screen (zoom is the canvas height in px).
  const signFit = L.sign ? Math.max(120, Math.min(640, Math.round((1100 * KIOSK_H) / KIOSK_W))) : 640;
  const minZoom = L.sign ? Math.min(300, Math.round(signFit / 2)) : 300;
  const kioskHasTv = (id: string) => !L.face && kioskHasTvFront(id);
  const EK = kioskEditKey(L);
  /** Saved changes of the other faces, for the side previews and full downloads. */
  const [others, setOthers] = useState<Partial<Record<"front" | KioskFace, KioskEdits>>>({});
  useEffect(() => {
    if (!front.native?.faces) return;
    let live = true;
    const load = () => Promise.all((["front", "left", "right"] as const).filter((f) => f !== face).map(async (f) => [f, await loadKioskEdits(f === "front" ? front.id : `${front.id}--${f}`).catch(() => ({}))] as const))
      .then((rs) => live && setOthers(Object.fromEntries(rs)));
    load();
    const on = (e: Event) => { const d = (e as CustomEvent).detail as string; if (d !== EK && kioskEditKeyParts(d).id === front.id) load(); };
    window.addEventListener("kiosk-edits-saved", on);
    return () => { live = false; window.removeEventListener("kiosk-edits-saved", on); };
  }, [front, face, EK]);
  const [art, setArt] = useState<{ viewBox: string; inner: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [edits, setEdits] = useState<KioskEdits>({});
  const [history, setHistory] = useState<KioskEdits[]>([]);
  const [future, setFuture] = useState<KioskEdits[]>([]);
  const clip = useRef<NonNullable<Sel> | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  /** Canvas height in px (zoom) and whether the canvas takes the full width. */
  const [zoom, setZoom] = useState(signFit);
  // "Fit" is smaller on phones so the whole front and both side strips fit the width.
  const [fitZoom, setFitZoom] = useState(signFit);
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768 || L.sign) return;
    const z = Math.max(300, Math.min(640, Math.round((window.innerWidth - 130) * 1.6)));
    setFitZoom(z); setZoom(z);
  }, []);
  const [wide, setWide] = useState(false);
  /** Objects picked with Shift-click, ready to group. */
  const [picked, setPicked] = useState<string[]>([]);
  /** Texts picked with Shift/Ctrl/Cmd-click (multi-select). */
  const [pickedT, setPickedT] = useState<string[]>([]);
  const multiRef = useRef<{ parts: string[]; texts: string[] } | null>(null);
  /** Snap guide x (kiosk points) shown while dragging. */
  const [guide, setGuide] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<KioskDownload | "save" | null>(null);
  const userId = useSessionUser();
  /** Only admins, brand leads and brand reviewers may save a kiosk for everyone (matches the database rule). */
  const [canSave, setCanSave] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) { setCanSave(userId === null ? false : null); return; }
    let live = true;
    Promise.all((["admin", "brand_lead", "brand_reviewer"] as const).map((r) => supabase.rpc("has_role", { _user_id: userId, _role: r })))
      .then((rs) => live && setCanSave(rs.some((x) => x.data === true)))
      .catch(() => live && setCanSave(false));
    return () => { live = false; };
  }, [userId]);
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
    const local = readLocalDraft(EK);
    (async () => {
      const { data, error } = userId
        ? await supabase.from("kiosk_layer_edits").select("edits, updated_at").eq("booth_id", EK).maybeSingle()
        : { data: null, error: null };
      if (!live) return;
      if (error) { setStatus(`Couldn't load saved changes: ${error.message}. Editing is paused so nothing is overwritten.`); return; }
      const remote = forLayout(L, data?.edits as KioskEdits | undefined) ?? undefined;
      const remoteAt = data?.updated_at ? Date.parse(data.updated_at) : 0;
      const next = local && local.at > remoteAt ? forLayout(L, local.edits) : remote ?? null;
      if (next) { loadedEdits.current = next; setEdits(next); }
      else loadedEdits.current = editsNow.current;
      loaded.current = true;
      // A newer local draft still needs sending to the shared copy.
      if (next && next === local?.edits && userId) setTimeout(() => { loadedEdits.current = null; setEdits((e) => ({ ...e })); }, 0);
    })();
    return () => { live = false; };
  }, [EK, userId]);

  // Autosave: every change is kept on this device at once, and saved to the
  // shared kiosk a moment after you stop editing.
  useEffect(() => {
    if (!loaded.current || userId === undefined) return;
    if (loadedEdits.current === edits) return;
    writeLocalDraft(EK, L.native ? { ...edits, layoutVersion: L.native.version } : edits);
    if (!userId) { setStatus("Kept on this device. Sign in to save for everyone."); return; }
    if (canSave === null) return;
    if (!canSave) { setStatus("Kept in this browser only — your role can't save kiosks for everyone."); return; }
    setStatus("Saving…");
    const t = setTimeout(async () => {
      const toSave: KioskEdits = L.native ? { ...edits, layoutVersion: L.native.version } : edits;
      const { error } = await supabase.from("kiosk_layer_edits").upsert({ booth_id: EK, edits: toSave as never, updated_by: userId, updated_at: new Date().toISOString() });
      if (error) setStatus(`Kept on this device only — not saved for everyone: ${error.message}`);
      else { clearLocalDraft(EK); setStatus("All changes saved."); window.dispatchEvent(new CustomEvent("kiosk-edits-saved", { detail: EK })); }
    }, 1200);
    return () => clearTimeout(t);
  }, [edits, EK, userId, canSave]);

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
  const isAdd = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => e.shiftKey || e.metaKey || e.ctrlKey;
  const pickPart = (id: string, add: boolean) => {
    const members = partGroup(edits, id, L);
    if (add) {
      setPicked((cur) => (cur.includes(id) ? cur.filter((x) => !members.includes(x)) : [...new Set([...cur, ...members])]));
    } else { setPicked(members); setPickedT([]); }
    setSel({ kind: "part", id });
  };
  const pickText = (id: string, add: boolean) => {
    if (add) {
      // Carry the current single text into the multi-selection.
      setPickedT((cur) => {
        const base = cur.length === 0 && sel?.kind === "text" && sel.id !== id ? [sel.id] : cur;
        return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
      });
    } else { setPickedT([id]); setPicked([]); }
    setSel({ kind: "text", id });
  };
  /** Everything currently multi-selected (parts with their groups, and texts). */
  const multiSet = () => ({ parts: picked, texts: pickedT });
  const inMulti = (s: NonNullable<Sel>, m: { parts: string[]; texts: string[] }) =>
    m.parts.length + m.texts.length > 1 && (s.kind === "part" ? m.parts.includes(s.id) : s.kind === "text" ? m.texts.includes(s.id) : false);
  const startDrag = (s: NonNullable<Sel>) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const add = isAdd(e);
    const keep = !add && inMulti(s, multiSet());
    if (s.kind === "part") {
      if (!keep) pickPart(s.id, add);
      if (add) return;
    } else if (s.kind === "text") {
      if (!keep) pickText(s.id, add);
      if (add) return;
    } else { setPicked([]); setPickedT([]); }
    setSel(s);
    if ((edits.locked ?? []).includes(s.id)) return;
    setFuture([]);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e);
    multiRef.current = keep ? multiSet() : null;
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
  /** Move the selection, or every multi-selected object together (locked ones stay put). */
  const move = (s: NonNullable<Sel>, dx: number, dy: number, base: KioskEdits, m: { parts: string[]; texts: string[] } | null): KioskEdits => {
    if (!m || !inMulti(s, m)) return shift(s, dx, dy, base);
    const locked = base.locked ?? [];
    const parts = { ...base.parts } as Record<string, { dx?: number; dy?: number }>;
    const texts = { ...base.texts } as Record<string, { dx?: number; dy?: number }>;
    const pids = new Set(m.parts.flatMap((id) => partGroup(base, id, L)));
    for (const id of pids) if (!locked.includes(id)) parts[id] = { ...parts[id], dx: (parts[id]?.dx ?? 0) + dx, dy: (parts[id]?.dy ?? 0) + dy };
    for (const id of m.texts) if (!locked.includes(id)) texts[id] = { ...texts[id], dx: (texts[id]?.dx ?? 0) + dx, dy: (texts[id]?.dy ?? 0) + dy };
    return { ...base, parts, texts } as KioskEdits;
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
    const moved = move(d.sel, p.x - d.x, p.y - d.y, d.start, multiRef.current);
    const r = multiRef.current || e.altKey ? { next: moved, g: null } : snap(d.sel, moved);
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
    let x = KIOSK_MARGIN, y = KIOSK_TV.y + KIOSK_TV.h + 144, w = Math.min(540, KIOSK_W - 2 * KIOSK_MARGIN);
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
  /**
   * Partner badges as type: hide the London picture and put an editable text
   * line in its box. Nothing is invented — the words start empty for retyping.
   */
  const badgeOf = (id: string) => (edits.badges ?? []).find((b) => b.of === id) ?? null;
  const replaceWithText = (partId: string) => {
    if (badgeOf(partId)) return;
    const id = `badge-${partId}`;
    commit({ ...edits, badges: [...(edits.badges ?? []), { of: partId, id, text: "Partner name" }] });
    setSel({ kind: "text", id }); setPicked([]);
    setStatus("Badge is now text — retype the words in the Text panel.");
  };
  const restorePicture = (partId: string) => {
    const b = badgeOf(partId);
    if (!b) return;
    const texts = { ...edits.texts }; delete texts[b.id];
    commit({ ...edits, badges: (edits.badges ?? []).filter((x) => x.of !== partId), texts });
    setSel({ kind: "part", id: partId });
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
    if (m[e.key]) { e.preventDefault(); if (!isLocked(sel.id)) commit(move(sel, m[e.key]![0], m[e.key]![1], edits, multiSet())); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSel(); }
  };

  const save = async () => {
    setBusy("save"); setStatus(null);
    const { error } = await supabase.from("kiosk_layer_edits").upsert({ booth_id: EK, edits: edits as never, updated_by: userId ?? null });
    setBusy(null);
    if (!error) { clearLocalDraft(EK); window.dispatchEvent(new CustomEvent("kiosk-edits-saved", { detail: EK })); }
    setStatus(error ? `Not saved: ${error.message}` : "All changes saved.");
  };
  const dl = async (k: KioskDownload) => {
    setBusy(k); setStatus(null);
    try {
      const all = { ...others, [face]: edits };
      await downloadKiosk(k, front, all.front ?? {}, { left: all.left, right: all.right }, face === "front" ? undefined : face);
    } catch (e) { setStatus(`Download failed: ${(e as Error).message}`); }
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

  // ---- workspace view state ----
  const [unit, setUnit] = useState<"in" | "mm">("in");
  const [guides, setGuides] = useState({ bleed: true, safe: true, tv: true, rulers: true });
  const [showSides, setShowSides] = useState(true);
  const [alignTarget, setAlignTarget] = useState<"trim" | "safe" | "tv">("trim");
  const [tab, setTab] = useState<"design" | "checks" | "export">("design");
  // Phone layout: layers and the inspector open as bottom sheets.
  const [mPanel, setMPanel] = useState<null | "layers" | "design" | "checks" | "export">(null);
  useEffect(() => {
    if (!wide) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setWide(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [wide]);

  const toU = (pt: number) => (unit === "in" ? pt / 72 : (pt / 72) * 25.4);
  const fromU = (v: number) => (unit === "in" ? v * 72 : (v / 25.4) * 72);
  const fmtU = (pt: number) => (unit === "in" ? toU(pt).toFixed(2) : toU(pt).toFixed(1));

  /** Live print checks over every visible object. */
  const checks = useMemo(() => {
    type Hit = { sel: NonNullable<Sel>; label: string; issue: string; level: "error" | "warn" };
    const out: Hit[] = [];
    const tv = KIOSK_TV;
    const hasTv = kioskHasTv(L.id);
    const test = (sel: NonNullable<Sel>, label: string, b: { x0: number; x1: number; y0: number; y1: number }, isText: boolean) => {
      if (hasTv && b.x0 < tv.x + tv.w && b.x1 > tv.x && b.y0 < tv.y + tv.h && b.y1 > tv.y) out.push({ sel, label, issue: "Sits over the TV area — it will be hidden by the screen", level: "error" });
      if (isText && (b.x0 < 0 || b.x1 > KIOSK_W || b.y0 < 0 || b.y1 > KIOSK_H)) out.push({ sel, label, issue: "Crosses the trim edge — words will be cut off", level: "error" });
      else if (isText && (b.x0 < KIOSK_MARGIN || b.x1 > KIOSK_W - KIOSK_MARGIN || b.y0 < KIOSK_MARGIN || b.y1 > KIOSK_H - KIOSK_MARGIN)) out.push({ sel, label, issue: "Outside the 2 in safe margin", level: "warn" });
      else if (!isText && (b.x1 < 0 || b.x0 > KIOSK_W || b.y1 < 0 || b.y0 > KIOSK_H)) out.push({ sel, label, issue: "Entirely off the kiosk — it won't print", level: "warn" });
    };
    for (const t of placed.flatMap((p) => p.texts)) {
      const bx = t.fixed ? [{ x: t.kx, w: t.kw, y: t.ky }] : textLineBoxes(t, measure(t));
      test({ kind: "text", id: t.id }, `“${t.lines[0] ?? ""}”`, { x0: Math.min(...bx.map((b) => b.x)), x1: Math.max(...bx.map((b) => b.x + b.w)), y0: t.ky - t.ksize * 0.8, y1: bx[bx.length - 1]!.y + t.ksize * 0.2 }, true);
    }
    for (const q of placed.flatMap((p) => p.parts).filter((q) => !q.hidden))
      test({ kind: "part", id: q.part.id }, "Graphic object", { x0: q.x, y0: q.y, x1: q.x + (q.src.x1 - q.src.x0) * q.scale, y1: q.y + (q.src.y1 - q.src.y0) * q.scale }, false);
    for (const d of (edits.dividers ?? []).filter((d) => !d.hidden))
      test({ kind: "divider", id: d.id }, "Accent rule", { x0: d.x, x1: d.x + d.w, y0: d.y, y1: d.y + d.h }, false);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, edits.dividers]);
  const errors = checks.filter((c) => c.level === "error").length;

  const target = alignTarget === "tv" && kioskHasTv(L.id) ? { x0: KIOSK_TV.x, x1: KIOSK_TV.x + KIOSK_TV.w, y0: KIOSK_TV.y, y1: KIOSK_TV.y + KIOSK_TV.h }
    : alignTarget === "safe" ? { x0: KIOSK_MARGIN, x1: KIOSK_W - KIOSK_MARGIN, y0: KIOSK_MARGIN, y1: KIOSK_H - KIOSK_MARGIN }
    : { x0: 0, x1: KIOSK_W, y0: 0, y1: KIOSK_H };
  const alignTo = (m: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom") => {
    if (!sel || isLocked(sel.id)) return;
    let base = edits;
    if (sel.kind === "text" && (m === "left" || m === "hcenter" || m === "right"))
      base = { ...edits, texts: { ...edits.texts, [sel.id]: { ...edits.texts?.[sel.id], align: m === "hcenter" ? "center" : m } } };
    const b = selBounds(sel, base);
    if (!b) return;
    const R = target;
    const dx = m === "left" ? R.x0 - b.x0 : m === "right" ? R.x1 - b.x1 : m === "hcenter" ? (R.x0 + R.x1) / 2 - (b.x0 + b.x1) / 2 : 0;
    const dy = m === "top" ? R.y0 - b.y0 : m === "bottom" ? R.y1 - b.y1 : m === "vmiddle" ? (R.y0 + R.y1) / 2 - (b.y0 + b.y1) / 2 : 0;
    commit(shift(sel, dx, dy, base));
  };

  const bounds = sel ? selBounds(sel) : null;
  const setPos = (axis: "x" | "y", pt: number) => {
    if (!sel || !bounds || isLocked(sel.id)) return;
    commit(shift(sel, axis === "x" ? pt - bounds.x0 : 0, axis === "y" ? pt - bounds.y0 : 0));
  };
  const setSize = (axis: "w" | "h", pt: number) => {
    if (!sel || !bounds || isLocked(sel.id) || pt <= 0) return;
    const cur = axis === "w" ? bounds.x1 - bounds.x0 : bounds.y1 - bounds.y0;
    const f = pt / Math.max(1, cur);
    if (sel.kind === "divider") return patchDivider(sel.id, axis === "w" ? { w: pt } : { h: pt });
    if (sel.kind === "text") { const t = LX.texts.find((x) => x.id === sel.id); if (t) patchText(sel.id, { size: Math.max(6, (edits.texts?.[sel.id]?.size ?? t.size) * f) }); return; }
    if (sel.kind === "block") return patchBlock(sel.id, { scale: Math.min(1, Math.max(0.5, (edits.blocks?.[sel.id]?.scale ?? 1) * f)) });
    const ids = partGroup(edits, sel.id, L);
    commit({ ...edits, parts: { ...edits.parts, ...Object.fromEntries(ids.map((id) => [id, { ...edits.parts?.[id], scale: Math.max(0.1, (edits.parts?.[id]?.scale ?? 1) * f) }])) } });
  };

  // Rulers live inside the stage SVG, in a gutter left of and above the bleed.
  const totalH = (KIOSK_H + 2 * B) / (1 - 22 / zoom);
  const k = zoom / totalH;
  const G = guides.rulers ? 22 / k : 0;
  const rs = 1 / k; // one screen px in kiosk units
  const vbX = -B - G, vbY = -B - G, vbW = KIOSK_W + 2 * B + G, vbH = KIOSK_H + 2 * B + G;
  const stepIn = zoom < 900 ? 6 : 3;
  const ticksX = Array.from({ length: Math.floor(KIOSK_W / 72 / (L.face ? 1 : stepIn)) + 1 }, (_, i) => i * (L.face ? 1 : stepIn));
  const ticksY = Array.from({ length: Math.floor(KIOSK_H / 72 / stepIn) + 1 }, (_, i) => i * stepIn);

  const layerRow = (active: boolean) =>
    `flex-1 truncate py-1 text-left text-[11.5px] ${active ? "text-white" : "text-white/70 hover:text-white"}`;
  const eyeBtn = "rounded-sm p-1 text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";

  return (
    <div
      className={
        (embedded && !wide ? "absolute inset-0 rounded-none " : wide || fill ? "fixed inset-0 z-[70] h-screen rounded-none " : "relative h-[86vh] min-h-[720px] rounded-md ") +
        "flex overflow-hidden border border-white/10 bg-[#0B0A2A] text-white/85 [color-scheme:dark]"
      }
    >
      <style>{kioskFontFaceCss()}</style>

      {/* Tool strip */}
      <nav aria-label="Tools" className="hidden w-12 md:flex shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-[#070620] py-3">
        <button type="button" className={dibtn} aria-pressed title="Select and move (V)" aria-label="Select and move"><MousePointer2 className="h-4 w-4" /></button>
        <button type="button" className={dibtn} title="Add accent rule" aria-label="Add accent rule" onClick={() => addDivider("short")}><RectangleHorizontal className="h-4 w-4" /></button>
        <span className="my-1 h-px w-6 bg-white/10" />
        <button type="button" className={dibtn} title="Zoom in" aria-label="Zoom in" disabled={zoom >= 4000} onClick={() => setZoom((z) => Math.min(4000, Math.round(z * 1.25)))}><ZoomIn className="h-4 w-4" /></button>
        <button type="button" className={dibtn} title="Zoom out" aria-label="Zoom out" disabled={zoom <= minZoom} onClick={() => setZoom((z) => Math.max(minZoom, Math.round(z / 1.25)))}><ZoomOut className="h-4 w-4" /></button>
        <button type="button" className={dibtn} title="Rulers" aria-label="Rulers" aria-pressed={guides.rulers} onClick={() => setGuides((g) => ({ ...g, rulers: !g.rulers }))}><RulerIcon className="h-4 w-4" /></button>
        {L.sign ? null : <button type="button" className={dibtn} title="Show side strips" aria-label="Show side strips" aria-pressed={showSides} onClick={() => setShowSides((s) => !s)}><Columns3 className="h-4 w-4" /></button>}
        <div className="mt-auto" />
        <button type="button" className={dibtn} title={wide ? "Exit full screen (Esc)" : "Full screen"} aria-label={wide ? "Exit full screen" : "Full screen"} onClick={() => setWide((w) => !w)}>{wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
      </nav>

      {/* Layers */}
      <aside aria-label="Layers" className={(mPanel === "layers" ? "fixed inset-x-0 bottom-14 z-[80] flex max-h-[60vh] border-t shadow-2xl md:hidden " : "hidden ") + "w-full shrink-0 flex-col border-white/10 bg-[#0B0A2A] lg:static lg:z-auto lg:flex lg:max-h-none lg:w-60 lg:border-r lg:border-t-0 lg:shadow-none"}>
        <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Layers</span>
          <span className="font-mono text-[10.5px] text-white/45">{LX.texts.length + LX.blocks.reduce((n, b) => n + (b.parts?.length ?? 0), 0)} objects</span>
        </div>
        <ul className="flex-1 space-y-1 overflow-auto p-2">
          {LX.blocks.map((b) => {
            const hidden = edits.blocks?.[b.id]?.hidden ?? b.screen;
            const texts = LX.texts.filter((t) => { const m = (t.top + t.bottom) / 2; return m >= b.y0 && m < b.y1; });
            return (
              <li key={b.id} className="rounded-sm border border-white/[0.06] bg-white/[0.02]">
                <div className={`flex items-center gap-1 px-2 ${sel?.id === b.id ? "bg-[#003FC7]/25" : ""}`}>
                  <button type="button" className={`${layerRow(sel?.id === b.id)} font-semibold`} onClick={() => setSel({ kind: "block", id: b.id })}>
                    {b.screen ? "London screen area" : L.face ? `${L.face === "left" ? "Left" : "Right"} strip artwork` : `Piece ${Number(b.id.slice(1)) + 1}`}
                  </button>
                  <button type="button" aria-label={hidden ? "Show piece" : "Hide piece"} title={hidden ? "Show" : "Hide"} className={eyeBtn} onClick={() => patchBlock(b.id, { hidden: !hidden })}>
                    {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {b.parts?.length ? (
                  <ul className="border-t border-white/[0.06] py-0.5">
                    {b.parts.map((q, i) => {
                      const ph = edits.parts?.[q.id]?.hidden ?? false;
                      const on = sel?.id === q.id || picked.includes(q.id);
                      return (
                        <li key={q.id} className={`flex items-center gap-0.5 pl-4 pr-1 ${on ? "bg-[#003FC7]/25" : ""}`}>
                          <Shapes className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
                          <button type="button" className={`${layerRow(on)} pl-1.5`} onClick={(e) => pickPart(q.id, isAdd(e))}>
                            {isCopy(q.id) ? "Copy of object" : `Object ${i + 1}`}{badgedPartIds(edits).has(q.id) ? " · text" : ""}{(edits.groups ?? defaultPartGroups(L)).some((g) => g.includes(q.id)) ? " · grp" : ""}
                          </button>
                          <button type="button" aria-label={isLocked(q.id) ? "Unlock object" : "Lock object"} className={eyeBtn} onClick={() => { setSel({ kind: "part", id: q.id }); commit({ ...edits, locked: isLocked(q.id) ? (edits.locked ?? []).filter((x) => x !== q.id) : [...(edits.locked ?? []), q.id] }); }}>
                            {isLocked(q.id) ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-40" />}
                          </button>
                          <button type="button" aria-label={ph ? "Show object" : "Hide object"} className={eyeBtn} onClick={() => patchPart(q.id, { hidden: !ph })}>
                            {ph ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {texts.length ? (
                  <ul className="border-t border-white/[0.06] py-0.5">
                    {texts.map((t) => {
                      const th = edits.texts?.[t.id]?.hidden ?? false;
                      const on = sel?.id === t.id || pickedT.includes(t.id);
                      return (
                        <li key={t.id} className={`flex items-center gap-0.5 pl-4 pr-1 ${on ? "bg-[#003FC7]/25" : ""}`}>
                          <Type className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
                          <button type="button" className={`${layerRow(on)} pl-1.5`} onClick={(e) => pickText(t.id, isAdd(e))}>
                            {edits.texts?.[t.id]?.text ?? t.text}
                          </button>
                          <button type="button" aria-label={isLocked(t.id) ? "Unlock text" : "Lock text"} className={eyeBtn} onClick={() => commit({ ...edits, locked: isLocked(t.id) ? (edits.locked ?? []).filter((x) => x !== t.id) : [...(edits.locked ?? []), t.id] })}>
                            {isLocked(t.id) ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-40" />}
                          </button>
                          <button type="button" aria-label={th ? "Show text" : "Hide text"} className={eyeBtn} onClick={() => patchText(t.id, { hidden: !th })}>
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
          {edits.dividers?.length ? (
            <li className="rounded-sm border border-white/[0.06] bg-white/[0.02]">
              <p className="px-2 py-1 text-[11.5px] font-semibold text-white/70">Accent rules</p>
              <ul className="border-t border-white/[0.06] py-0.5">
                {edits.dividers.map((d, i) => (
                  <li key={d.id} className={`flex items-center gap-1 pl-4 pr-1 ${sel?.id === d.id ? "bg-[#003FC7]/25" : ""}`}>
                    <span aria-hidden className="h-1.5 w-4 rounded-[1px]" style={{ background: d.color }} />
                    <button type="button" className={layerRow(sel?.id === d.id)} onClick={() => { setSel({ kind: "divider", id: d.id }); setPicked([]); }}>Rule {i + 1}</button>
                    <button type="button" aria-label={d.hidden ? "Show rule" : "Hide rule"} className={eyeBtn} onClick={() => patchDivider(d.id, { hidden: !d.hidden })}>
                      {d.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
        </ul>
        <p className="border-t border-white/10 px-3 py-2 text-[10.5px] leading-snug text-white/50">Shift-click to multi-select. Rebuilt from {L.source}.</p>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0B0A2A] px-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{vendor} · {FACE_LABEL[face]}</span>
            {onFace ? (
              <div className="flex shrink-0 rounded-sm border border-white/10 bg-black/40 p-0.5" role="group" aria-label="Edit which face">
                {(["left", "front", "right"] as const).map((f) => (
                  <button key={f} type="button" aria-pressed={face === f} onClick={() => onFace(f)} className="rounded-[2px] px-2.5 py-1 text-[10.5px] font-medium text-white/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1FBF9] aria-pressed:bg-white/15 aria-pressed:text-white">{f === "front" ? "Front" : f === "left" ? "Left strip" : "Right strip"}</button>
                ))}
              </div>
            ) : null}
            <span className="rounded-sm border border-white/10 bg-black/30 px-1.5 py-0.5 shrink-0 font-mono text-[10px] text-white/60">rdraft</span>
            {canSave === false ? <span className="shrink-0 whitespace-nowrap rounded-sm border border-[#FFEB66]/40 bg-[#FFEB66]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FFEB66]" title="Changes stay in this browser. Admins, brand leads and brand reviewers can save kiosks for everyone.">Not shared</span> : null}
            {status ? <span role="status" className="hidden truncate text-[11px] text-white/60 xl:inline">{status}</span> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className={dibtn} disabled={!history.length} onClick={undo} title="Undo (Ctrl/⌘ Z)" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
            <button type="button" className={dibtn} disabled={!future.length} onClick={redo} title="Redo (Ctrl/⌘ Shift Z)" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
            <span className="mx-1 h-4 w-px bg-white/10" />
            <div className="flex rounded-sm border border-white/10 bg-black/40 p-0.5" role="group" aria-label="View size">
              {(L.sign ? [["Fit", fitZoom], ["Large", fitZoom * 2], ["Detail", fitZoom * 4]] as const : [["Fit", fitZoom], ["Large", 1100], ["Detail", 2200]] as const).map(([l, z]) => (
                <button key={l} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)} className="rounded-[2px] px-2.5 py-1 text-[10.5px] font-medium text-white/55 hover:text-white aria-pressed:bg-white/15 aria-pressed:text-white">{l}</button>
              ))}
            </div>
            <span className="hidden w-11 text-right font-mono sm:inline text-[10.5px] text-white/60">{Math.round((zoom / fitZoom) * 100)}%</span>
          </div>
        </header>

        {/* Stage */}
        <div tabIndex={0} onKeyDown={onKey} aria-label="Kiosk canvas. Arrow keys nudge the selection." className="relative flex-1 overflow-auto bg-[#05041A] p-3 md:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#003FC7]">
          {err ? <p className="text-sm text-[#FF9B70]">{err}</p> : null}
          {!art && !err ? <p className="text-sm text-white/60">Loading the partner's artwork…</p> : null}
          {art ? (
            <div className="mx-auto flex w-max items-start gap-4">
              <svg
                ref={svgRef}
                viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                style={{ height: zoom + G * k, width: ((zoom + G * k) * vbW) / vbH }}
                className="block w-auto touch-none select-none shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                role="img"
                aria-label={`${vendor} ${FACE_LABEL[face].toLowerCase()}, editable`}
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                onPointerDown={() => { setSel(null); setPicked([]); setPickedT([]); }}
              >
                <defs>
                  <linearGradient id={`kg-${L.id}`} x1="0" y1="0" x2="0" y2="1">
                    {ground.map((s) => <stop key={s.offset} offset={s.offset} stopColor={s.color} />)}
                  </linearGradient>
                  <g dangerouslySetInnerHTML={{ __html: L.native ? nativeSymbols(art.inner, symId) : `<symbol id="${symId}" viewBox="${art.viewBox}" overflow="visible">${art.inner}</symbol>` }} />
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
                {guides.rulers ? (
                  <g data-export-ignore="true" pointerEvents="none" fontFamily="Geist Mono, monospace" fontSize={9.5 * rs}>
                    <rect x={vbX} y={vbY} width={vbW} height={G} fill="#0B0A2A" />
                    <rect x={vbX} y={vbY} width={G} height={vbH} fill="#0B0A2A" />
                    {ticksX.map((i) => (
                      <g key={`rx${i}`}>
                        <line x1={i * 72} x2={i * 72} y1={-B - G * 0.45} y2={-B} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={rs} />
                        <text x={i * 72 + 3 * rs} y={-B - G * 0.5} fill="#FFFFFF" fillOpacity={0.6}>{unit === "in" ? i : Math.round(i * 25.4)}</text>
                      </g>
                    ))}
                    {ticksY.map((i) => (
                      <g key={`ry${i}`}>
                        <line y1={i * 72} y2={i * 72} x1={-B - G * 0.45} x2={-B} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={rs} />
                        <text x={-B - G + 3 * rs} y={i * 72 + 11 * rs} fill="#FFFFFF" fillOpacity={0.6}>{unit === "in" ? i : Math.round(i * 25.4)}</text>
                      </g>
                    ))}
                    {bounds ? (
                      <>
                        <rect x={bounds.x0} y={-B - G} width={bounds.x1 - bounds.x0} height={G} fill="#003FC7" fillOpacity={0.45} />
                        <rect y={bounds.y0} x={-B - G} height={bounds.y1 - bounds.y0} width={G} fill="#003FC7" fillOpacity={0.45} />
                      </>
                    ) : null}
                  </g>
                ) : null}
                {L.native && !edits.ground ? (
                  <>{/* Paper is white: unprinted areas of the designer file show as white, not transparent. */}<rect x={-B} y={-B} width={KIOSK_W + 2 * B} height={KIOSK_H + 2 * B} fill="#FFFFFF" pointerEvents="none" /><use href={`#${symId}-${L.native.bgSym ?? "bg"}`} x={-L.originX} y={-L.originY} width={L.mediaW} height={L.mediaH} pointerEvents="none" /></>
                ) : (
                  <rect x={-B} y={-B} width={KIOSK_W + 2 * B} height={KIOSK_H + 2 * B} fill={`url(#kg-${L.id})`} />
                )}
                {L.native ? null : placed.map((p) => {
                  const [, , vw, vh] = art.viewBox.split(/\s+/).map(Number);
                  const on = sel?.kind === "block" && sel.id === p.block.id;
                  return (
                    <g key={p.block.id} transform={`translate(${p.x} ${p.y}) scale(${p.scale})`} onPointerDown={startDrag({ kind: "block", id: p.block.id })} className="cursor-move">
                      <g clipPath={`url(#kc-${L.id}-${p.block.id})`}>
                        <use href={`#${symId}`} x={-L.originX} y={-(L.originY + p.clipTop)} width={vw} height={vh} />
                      </g>
                      {on ? <rect x={0} y={0} width={L.trimW} height={p.clipBottom - p.clipTop} fill="none" stroke="#003FC7" strokeWidth={2 * rs / p.scale} /> : null}
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
                        {L.native ? (
                          <use href={`#${symId}-${partSource(edits, q.part.id)}`} x={-L.originX} y={-L.originY} width={L.mediaW} height={L.mediaH} />
                        ) : (
                          <g clipPath={`url(#kc-${L.id}-${q.part.id})`}>
                            <use href={`#${symId}`} x={-L.originX} y={-L.originY} width={vw} height={vh} />
                          </g>
                        )}
                        <rect x={q.src.x0} y={q.src.y0} width={q.src.x1 - q.src.x0} height={q.src.y1 - q.src.y0} fill="transparent" stroke={on ? "#003FC7" : "none"} strokeWidth={2 * rs / q.scale} />
                      </g>
                    </g>
                  );
                })}
                {(edits.dividers ?? []).filter((d) => !d.hidden).map((d) => (
                  <g key={d.id} onPointerDown={startDrag({ kind: "divider", id: d.id })} className={isLocked(d.id) ? "cursor-default" : "cursor-move"}
                    opacity={(d.opacity ?? 1) < 1 ? d.opacity : undefined} transform={d.rot ? `rotate(${d.rot} ${d.x + d.w / 2} ${d.y + d.h / 2})` : undefined}>
                    <rect x={d.x} y={d.y - 20} width={d.w} height={d.h + 40} fill="transparent" />
                    <rect x={d.x} y={d.y} width={d.w} height={d.h} rx={d.round ? d.h / 2 : 0} fill={d.color} />
                  </g>
                ))}
                {placed.flatMap((p) => p.texts).map((t) => (
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
                    onPointerDown={startDrag({ kind: "text", id: t.id })}
                  >
                    {t.lines.map((s, i) => (
                      <tspan key={i} x={t.ax} y={t.ky + i * t.lead * t.ksize}>{s || " "}</tspan>
                    ))}
                  </text>
                ))}
                {pickedT.length + picked.length > 1 ? pickedT.map((id) => {
                  const b = selBounds({ kind: "text", id });
                  return b ? <rect key={`pt-${id}`} data-export-ignore="true" pointerEvents="none" x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill="none" stroke="#003FC7" strokeWidth={2 * rs} /> : null;
                }) : null}
                {/* Selection frame with corner handles (visual) and live size tag. */}
                {bounds && sel?.kind !== "block" ? (
                  <g data-export-ignore="true" pointerEvents="none">
                    <rect x={bounds.x0} y={bounds.y0} width={bounds.x1 - bounds.x0} height={bounds.y1 - bounds.y0} fill="none" stroke="#003FC7" strokeWidth={1.5 * rs} />
                    {[[bounds.x0, bounds.y0], [bounds.x1, bounds.y0], [bounds.x0, bounds.y1], [bounds.x1, bounds.y1]].map(([x, y], i) => (
                      <rect key={i} x={x! - 3.5 * rs} y={y! - 3.5 * rs} width={7 * rs} height={7 * rs} fill="#FFFFFF" stroke="#003FC7" strokeWidth={1.5 * rs} />
                    ))}
                    <g transform={`translate(${(bounds.x0 + bounds.x1) / 2} ${bounds.y1 + 8 * rs})`}>
                      <rect x={-46 * rs} y={0} width={92 * rs} height={17 * rs} rx={2 * rs} fill="#003FC7" />
                      <text x={0} y={12 * rs} textAnchor="middle" fontSize={10 * rs} fill="#FFFFFF" fontFamily="Geist Mono, monospace">{fmtU(bounds.x1 - bounds.x0)} × {fmtU(bounds.y1 - bounds.y0)}</text>
                    </g>
                  </g>
                ) : null}
                {guide !== null ? (
                  <line data-export-ignore="true" pointerEvents="none" x1={guide} x2={guide} y1={0} y2={KIOSK_H} stroke="#EC388A" strokeWidth={1.5 * rs} strokeDasharray={`${6 * rs} ${4 * rs}`} />
                ) : null}
                <g data-export-ignore="true" pointerEvents="none">
                  {guides.tv && kioskHasTv(L.id) ? (
                    <>
                      <rect x={KIOSK_TV.x} y={KIOSK_TV.y} width={KIOSK_TV.w} height={KIOSK_TV.h} fill="#03002C" fillOpacity={0.55} stroke="#FFEB66" strokeDasharray={`${8 * rs} ${5 * rs}`} strokeWidth={1.5 * rs} />
                      <text x={KIOSK_TV.x + KIOSK_TV.w / 2} y={KIOSK_TV.y + KIOSK_TV.h / 2} textAnchor="middle" fontSize={12 * rs} fill="#FFEB66" fontFamily="Geist Mono, monospace">TV KEEP-CLEAR · NOT PRINTED</text>
                    </>
                  ) : null}
                  {guides.safe ? <rect x={KIOSK_MARGIN} y={KIOSK_MARGIN} width={KIOSK_W - 2 * KIOSK_MARGIN} height={KIOSK_H - 2 * KIOSK_MARGIN} fill="none" stroke="#A1FBF9" strokeOpacity={0.8} strokeDasharray={`${4 * rs} ${4 * rs}`} strokeWidth={rs} /> : null}
                  {guides.bleed ? <rect x={-B} y={-B} width={KIOSK_W + 2 * B} height={KIOSK_H + 2 * B} fill="none" stroke="#E53D2E" strokeWidth={rs} /> : null}
                  <rect x={0} y={0} width={KIOSK_W} height={KIOSK_H} fill="none" stroke="#EC008C" strokeWidth={1.5 * rs} />
                </g>
              </svg>
              {/* Left strip is placed AFTER the front in the DOM (shown first via CSS order):
                  its art uses blend filters whose feImage refs point into the front's
                  symbol defs, and Chrome paints forward feImage references black. */}
              {showSides && !L.face && !L.sign ? (["left", "right"] as const).map((sd) => (
                <div key={sd} className={sd === "left" ? "order-first" : "order-last"}>
                  <ReturnStrip ground={ground} nativeSym={L.native ? `${symId}-${sd}` : undefined} symId={symId} id={`${L.id}-${sd[0]}`} height={zoom}
                    label={`${sd === "left" ? "Left" : "Right"} return · 4 × 96 in`} offsetTop={G * k}
                    faceL={onFace ? kioskFaceLayout(front, sd) : null} faceEdits={others[sd]} onOpen={onFace ? () => onFace(sd) : undefined} />
                </div>
              )) : null}
            </div>
          ) : null}
        </div>

        <footer className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-[#070620] px-3 font-mono text-[10px] text-white/55">
          <span>{bounds ? `X ${fmtU(bounds.x0)}  Y ${fmtU(bounds.y0)}  W ${fmtU(bounds.x1 - bounds.x0)}  H ${fmtU(bounds.y1 - bounds.y0)} ${unit}` : "Nothing selected"}</span>
          <button type="button" onClick={() => setTab("checks")} className={errors ? "text-[#FF9B70] hover:underline" : "text-white/55 hover:underline"}>
            {errors ? `${errors} print issue${errors === 1 ? "" : "s"}` : checks.length ? `${checks.length} note${checks.length === 1 ? "" : "s"}` : "Print checks clear"}
          </button>
        </footer>
        {/* Phone panel bar */}
        <nav aria-label="Panels" className="grid h-14 shrink-0 grid-cols-4 border-t border-white/10 bg-[#070620] md:hidden">
          {([["layers", "Layers"], ["design", "Design"], ["checks", `Checks${checks.length ? ` · ${checks.length}` : ""}`], ["export", "Export"]] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mPanel === id}
              onClick={() => { setMPanel((m) => (m === id ? null : id)); if (id !== "layers") setTab(id); }}
              className="text-[12px] font-semibold text-white/60 aria-pressed:bg-white/10 aria-pressed:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#003FC7]">{label}</button>
          ))}
        </nav>
      </div>

      {/* Inspector */}
      <aside aria-label="Properties" className={(mPanel && mPanel !== "layers" ? "fixed inset-x-0 bottom-14 z-[80] flex max-h-[60vh] border-t shadow-2xl " : "hidden ") + "w-full shrink-0 flex-col border-white/10 bg-[#0B0A2A] md:static md:z-auto md:flex md:max-h-none md:w-[300px] md:border-l md:border-t-0 md:shadow-none"}>
        <div role="tablist" aria-label="Inspector" className="flex h-11 shrink-0 items-end gap-4 border-b border-white/10 px-3">
          {([["design", "Design"], ["checks", `Checks${checks.length ? ` · ${checks.length}` : ""}`], ["export", "Export"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className="-mb-px border-b-2 border-transparent pb-2.5 text-[11.5px] font-semibold text-white/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] aria-selected:border-[#003FC7] aria-selected:text-white">{label}</button>
          ))}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-3">
          {tab === "design" ? (
            <>
              {sel && bounds ? (
                <Sec title="Transform" aside={
                  <div className="flex rounded-sm border border-white/10 p-0.5" role="group" aria-label="Units">
                    {(["in", "mm"] as const).map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)} className="rounded-[2px] px-1.5 font-mono text-[10px] text-white/55 aria-pressed:bg-white/15 aria-pressed:text-white">{u}</button>)}
                  </div>
                }>
                  <div className="grid grid-cols-2 gap-2">
                    <NumField label="X" value={toU(bounds.x0)} digits={unit === "in" ? 2 : 1} onCommit={(v) => setPos("x", fromU(v))} disabled={isLocked(sel.id)} />
                    <NumField label="Y" value={toU(bounds.y0)} digits={unit === "in" ? 2 : 1} onCommit={(v) => setPos("y", fromU(v))} disabled={isLocked(sel.id)} />
                    <NumField label="W" value={toU(bounds.x1 - bounds.x0)} digits={unit === "in" ? 2 : 1} onCommit={(v) => setSize("w", fromU(v))} disabled={isLocked(sel.id)} />
                    <NumField label="H" value={toU(bounds.y1 - bounds.y0)} digits={unit === "in" ? 2 : 1} onCommit={(v) => setSize("h", fromU(v))} disabled={isLocked(sel.id) || sel.kind !== "divider"} />
                    {selFx ? <NumField label="Rotate °" value={selFx.rot} digits={0} onCommit={(v) => setFx({ rot: Math.max(-180, Math.min(180, v)) })} disabled={isLocked(sel.id)} /> : null}
                    {selFx ? <NumField label="Opacity %" value={selFx.opacity * 100} digits={0} onCommit={(v) => setFx({ opacity: Math.max(5, Math.min(100, v)) / 100 })} /> : null}
                  </div>
                  <p className="text-[10.5px] text-white/50">Measured from the trim's top-left corner. W scales in proportion; H is editable on rules. Arrow keys nudge, Shift + arrow moves ½ in.</p>
                </Sec>
              ) : (
                <p className="rounded-sm border border-dashed border-white/15 p-3 text-[12px] text-white/60">Select an object on the kiosk or in Layers to edit its position, type and appearance.</p>
              )}

              {sel ? (
                <Sec title="Align" aside={
                  <select aria-label="Align to" value={alignTarget} onChange={(e) => setAlignTarget(e.target.value as typeof alignTarget)} className="rounded-sm border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10.5px] text-white">
                    <option value="trim">To trim</option><option value="safe">To safe margin</option>{kioskHasTv(L.id) ? <option value="tv">To TV area</option> : null}
                  </select>
                }>
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Align selection">
                    {([
                      ["left", AlignStartVertical, "Align left"], ["hcenter", AlignCenterVertical, "Align horizontal centres"], ["right", AlignEndVertical, "Align right"],
                      ["top", AlignStartHorizontal, "Align top"], ["vmiddle", AlignCenterHorizontal, "Align vertical middles"], ["bottom", AlignEndHorizontal, "Align bottom"],
                    ] as const).map(([m, Icon, label]) => (
                      <button key={m} type="button" className={dibtn} aria-label={label} title={label} disabled={isLocked(sel.id)} onClick={() => (picked.length > 1 ? alignPicked(m) : alignTo(m))}><Icon className="h-4 w-4" /></button>
                    ))}
                    <span className="mx-0.5 w-px bg-white/10" />
                    <button type="button" className={dibtn} aria-label="Distribute horizontally" title="Distribute horizontally (3+ objects)" disabled={picked.length < 3} onClick={() => alignPicked("hspread")}><AlignHorizontalSpaceAround className="h-4 w-4" /></button>
                    <button type="button" className={dibtn} aria-label="Distribute vertically" title="Distribute vertically (3+ objects)" disabled={picked.length < 3} onClick={() => alignPicked("vspread")}><AlignVerticalSpaceAround className="h-4 w-4" /></button>
                  </div>
                  <p className="text-[10.5px] text-white/50">{picked.length > 1 ? `Aligning ${picked.length} objects to each other.` : "Dragging snaps to the margins and centre line; hold Alt to move freely."}</p>
                </Sec>
              ) : null}

              {sel && sel.kind !== "block" && selFx ? (
                <Sec title="Arrange">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className={dibtn} aria-label="Duplicate" title="Duplicate (Ctrl/⌘ D)" onClick={() => duplicate()}><CopyPlus className="h-4 w-4" /></button>
                    <button type="button" className={dibtn} aria-label="Copy" title="Copy (Ctrl/⌘ C)" onClick={() => { clip.current = sel; setStatus("Copied — press Ctrl/⌘ V to paste."); }}><Copy className="h-4 w-4" /></button>
                    <button type="button" className={dibtn} aria-label="Paste" title="Paste (Ctrl/⌘ V)" disabled={!clip.current} onClick={() => clip.current && duplicate(clip.current)}><ClipboardPaste className="h-4 w-4" /></button>
                    <button type="button" className={dibtn} aria-label={isLocked(sel.id) ? "Unlock" : "Lock"} title={isLocked(sel.id) ? "Unlock" : "Lock"} aria-pressed={isLocked(sel.id)} onClick={() => toggleLock(sel.id)}>{isLocked(sel.id) ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</button>
                    <button type="button" className={dibtn} aria-label="Delete" title="Delete (Del)" onClick={removeSel}><Trash2 className="h-4 w-4" /></button>
                    {sel.kind !== "text" ? (
                      <>
                        <span className="mx-0.5 w-px bg-white/10" />
                        <button type="button" className={dibtn} aria-label="Bring to front" title="Bring to front (Shift ])" onClick={() => arrange("front")}><BringToFront className="h-4 w-4" /></button>
                        <button type="button" className={dibtn} aria-label="Bring forward" title="Bring forward (])" onClick={() => arrange("forward")}><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" className={dibtn} aria-label="Send backward" title="Send backward ([)" onClick={() => arrange("backward")}><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" className={dibtn} aria-label="Send to back" title="Send to back (Shift [)" onClick={() => arrange("back")}><SendToBack className="h-4 w-4" /></button>
                      </>
                    ) : null}
                  </div>
                  {isLocked(sel.id) ? <p className="text-[10.5px] text-white/50">Locked: it can't be dragged, nudged or aligned until you unlock it.</p> : null}
                </Sec>
              ) : null}

              {picked.length > 1 || (selPart && partGroup(edits, selPart.id, L).length > 1) ? (
                <Sec title={`${picked.length} objects selected`}>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={dbtn} disabled={picked.length < 2 || (edits.groups ?? defaultPartGroups(L)).some((g) => g.length === picked.length && picked.every((x) => g.includes(x)))}
                      onClick={() => commit({ ...edits, groups: [...(edits.groups ?? defaultPartGroups(L)).filter((g) => !g.some((x) => picked.includes(x))), picked] })}><Group className="h-3.5 w-3.5" />Group</button>
                    <button type="button" className={dbtn} disabled={!(edits.groups ?? defaultPartGroups(L)).some((g) => g.some((x) => picked.includes(x)))}
                      onClick={() => { commit({ ...edits, groups: (edits.groups ?? defaultPartGroups(L)).filter((g) => !g.some((x) => picked.includes(x))) }); setPicked(sel ? [sel.id] : []); }}><Ungroup className="h-3.5 w-3.5" />Ungroup</button>
                    <button type="button" className={dbtn} onClick={() => commit({ ...edits, parts: { ...edits.parts, ...Object.fromEntries(picked.map((id) => [id, { ...edits.parts?.[id], hidden: !(edits.parts?.[id]?.hidden ?? false) }])) } })}>Hide / show</button>
                    <button type="button" className={dbtn} onClick={() => commit({ ...edits, parts: { ...edits.parts, ...Object.fromEntries(picked.map((id) => [id, { dx: 0, dy: 0, scale: 1, hidden: false }])) } })}>Put back</button>
                  </div>
                </Sec>
              ) : null}

              {selText && selPlaced ? (
                <Sec title="Type">
                  <label className="block text-[10.5px] text-white/55">Words <span className="text-white/40">(Enter starts a new line)</span>
                    <textarea className={`${field} mt-1 font-sans text-[13px]`} rows={3} value={edits.texts?.[selText.id]?.text ?? selText.text} onChange={(e) => patchText(selText.id, { text: e.target.value }, false)} onBlur={() => setHistory((h) => [...h, edits])} />
                  </label>
                  <div className="flex items-center justify-between rounded-sm border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                    <span className="text-white/85">{selText.font}</span>
                    <span className="text-[10px] text-white/45">as supplied</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="Size pt" value={edits.texts?.[selText.id]?.size ?? selText.size} digits={0} onCommit={(v) => patchText(selText.id, { size: Math.max(6, v) })} />
                    <NumField label="Leading ×" value={selPlaced.lead} digits={2} onCommit={(v) => patchText(selText.id, { lead: Math.max(0.8, Math.min(2, v)) })} />
                    <NumField label="Tracking" value={edits.texts?.[selText.id]?.track ?? selText.track ?? 0} digits={0} onCommit={(v) => patchText(selText.id, { track: Math.max(-50, Math.min(300, v)) || undefined })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1" role="group" aria-label="Paragraph alignment">
                      {([["left", AlignLeft, "Align lines left"], ["center", AlignCenter, "Centre lines"], ["right", AlignRight, "Align lines right"]] as const).map(([a, Icon, label]) => (
                        <button key={a} type="button" className={dibtn} aria-label={label} title={label} aria-pressed={selPlaced.align === a} onClick={() => patchText(selText.id, { align: a })}><Icon className="h-4 w-4" /></button>
                      ))}
                    </div>
                    <label className="ml-auto flex items-center gap-1.5 text-[10.5px] text-white/55">Colour
                      <input type="color" className="h-7 w-9 cursor-pointer rounded-sm border border-white/10 bg-transparent" value={edits.texts?.[selText.id]?.color ?? selText.color} onChange={(e) => patchText(selText.id, { color: e.target.value.toUpperCase(), cmyk: undefined })} />
                    </label>
                  </div>
                  {L.native ? (
                    <div>
                      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Print colour, CMYK percent">
                        {(["C", "M", "Y", "K"] as const).map((ch, i) => (
                          <NumField key={ch} label={`${ch} %`} value={Math.round(((selPlaced.cmyk ?? [0, 0, 0, 0])[i] ?? 0) * 1000) / 10} digits={1}
                            onCommit={(v) => {
                              const c = [...(selPlaced.cmyk ?? [0, 0, 0, 0])];
                              c[i] = Math.max(0, Math.min(100, v)) / 100;
                              patchText(selText.id, { cmyk: c, color: cmykPreview(c) });
                            }} />
                        ))}
                      </div>
                      <p className="mt-1 text-[10.5px] text-white/50">{selPlaced.cmyk ? `Prints as C${pc(selPlaced.cmyk[0])} M${pc(selPlaced.cmyk[1])} Y${pc(selPlaced.cmyk[2])} K${pc(selPlaced.cmyk[3])} — screen colour is approximate.` : "Picked on screen: prints as RGB until you set CMYK here."}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={dbtn} onClick={() => {
                      const b = selBounds({ kind: "text", id: selText.id });
                      if (!b) return;
                      const cur = edits.texts?.[selText.id]?.size ?? selText.size;
                      const size = Math.max(6, Math.floor(cur * ((KIOSK_W - 2 * KIOSK_MARGIN) / Math.max(1, b.x1 - b.x0))));
                      alignKiosk("center", { ...edits, texts: { ...edits.texts, [selText.id]: { ...edits.texts?.[selText.id], size } } });
                    }}>Fit to safe width</button>
                    <button type="button" className={dbtn} onClick={() => patchText(selText.id, { size: undefined, lead: undefined, track: undefined, align: undefined, cmyk: undefined, color: undefined })}>Original sizing</button>
                  </div>
                  {(() => {
                    const me = selBounds({ kind: "text", id: selText.id });
                    if (!me) return null;
                    const hits = placed.flatMap((p) => p.texts).filter((o) => {
                      if (o.id === selText.id) return false;
                      const b = selBounds({ kind: "text", id: o.id });
                      return !!b && b.x0 < me.x1 && b.x1 > me.x0 && b.y0 < me.y1 && b.y1 > me.y0;
                    });
                    return hits.length ? (
                      <p role="alert" className="rounded-sm border border-[#FF9B70]/40 bg-[#FF9B70]/10 p-2 text-[11.5px] text-white">
                        Overlaps {hits.slice(0, 2).map((h) => `“${h.lines[0]}”`).join(", ")}{hits.length > 2 ? ` and ${hits.length - 2} more` : ""}.
                      </p>
                    ) : null;
                  })()}
                </Sec>
              ) : null}

              {selPart ? (
                <Sec title="Object">
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={dbtn} onClick={() => patchPart(selPart.id, { dx: 0, dy: 0, scale: 1, hidden: false })}>Put back</button>
                    {badgeOf(selPart.id)
                      ? <button type="button" className={dbtn} onClick={() => restorePicture(selPart.id)}>Put the picture back</button>
                      : <button type="button" className={dbtn} onClick={() => replaceWithText(selPart.id)}><Type className="h-3.5 w-3.5" />Replace with text</button>}
                  </div>
                  {L.native ? (() => {
                    const ck = edits.parts?.[selPart.id]?.cmyk;
                    return (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[10.5px] text-white/55">
                          <span>Recolour (one print ink)</span>
                          {ck ? <button type="button" className="underline" onClick={() => patchPart(selPart.id, { cmyk: undefined })}>Original colours</button> : null}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Object print colour, CMYK percent">
                          {(["C", "M", "Y", "K"] as const).map((ch, i) => (
                            <NumField key={ch} label={`${ch} %`} value={Math.round(((ck ?? [0, 0, 0, 0])[i] ?? 0) * 1000) / 10} digits={1}
                              onCommit={(v) => {
                                const c = [...(ck ?? [0, 0, 0, 0])];
                                c[i] = Math.max(0, Math.min(100, v)) / 100;
                                patchPart(selPart.id, { cmyk: c });
                              }} />
                          ))}
                        </div>
                        <p className="mt-1 text-[10.5px] text-white/50">{ck ? `Prints as one flat ink C${pc(ck[0])} M${pc(ck[1])} Y${pc(ck[2])} K${pc(ck[3])}; its own gradients and blends are replaced. Screen colour is approximate.` : "Prints in the designer's own colours. Type a value to recolour this object."}</p>
                      </div>
                    );
                  })() : null}
                  <p className="text-[10.5px] text-white/50">A logo, icon, QR code or shape group from the London file, with its own shapes, gradients and effects.</p>
                </Sec>
              ) : null}

              {selBlock ? (
                <Sec title="Graphics piece">
                  <p className="text-[10.5px] text-white/50">Logos, icons and QR codes inside this piece move with it. Pieces scale between 50 % and 100 %, never past the kiosk width.</p>
                </Sec>
              ) : null}

              {selDivider ? (
                <Sec title="Accent rule">
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rule colour">
                    {ACCENTS.map((a) => (
                      <button key={a.color} type="button" aria-label={a.name} title={a.name} aria-pressed={selDivider.color === a.color}
                        className="h-6 w-6 rounded-sm border border-white/20 aria-pressed:ring-2 aria-pressed:ring-[#003FC7] aria-pressed:ring-offset-1 aria-pressed:ring-offset-[#0B0A2A]"
                        style={{ background: a.color }} onClick={() => patchDivider(selDivider.id, { color: a.color })} />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-[11.5px] text-white/70">
                    <input type="checkbox" className="accent-[#003FC7]" checked={!!selDivider.round} onChange={(e) => patchDivider(selDivider.id, { round: e.target.checked })} /> Rounded ends
                  </label>
                </Sec>
              ) : null}

              <Sec title="Add">
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={dbtn} onClick={() => addDivider("short")}>Short rule</button>
                  <button type="button" className={dbtn} onClick={() => addDivider("full")}>Full-width rule</button>
                  <button type="button" className={dbtn} disabled={!sel || sel.kind === "divider"} onClick={() => addDivider("under")}>Rule under selection</button>
                </div>
              </Sec>

              <Sec title="Background">
                <div className="flex gap-3 text-[10.5px] text-white/55">
                  <label className="flex items-center gap-1.5">Top <input type="color" className="h-7 w-9 rounded-sm border border-white/10 bg-transparent" value={ground[0]!.color} onChange={(e) => commit({ ...edits, ground: { top: e.target.value.toUpperCase(), bottom: ground[ground.length - 1]!.color } })} /></label>
                  <label className="flex items-center gap-1.5">Bottom <input type="color" className="h-7 w-9 rounded-sm border border-white/10 bg-transparent" value={ground[ground.length - 1]!.color} onChange={(e) => commit({ ...edits, ground: { top: ground[0]!.color, bottom: e.target.value.toUpperCase() } })} /></label>
                </div>
                <p className="text-[10.5px] text-white/50">The side strips carry the same background ramp.</p>
              </Sec>

              <Sec title="Guides">
                <div className="grid grid-cols-2 gap-1.5">
                  {([["bleed", "Bleed"], ["safe", "Safe margin"], ["tv", "TV keep-clear"], ["rulers", "Rulers"]] as const).filter(([g]) => g !== "tv" || kioskHasTv(L.id)).map(([g, label]) => (
                    <label key={g} className="flex items-center justify-between rounded-sm border border-white/10 bg-black/20 px-2 py-1.5 text-[11.5px] text-white/75">
                      {label}
                      <input type="checkbox" className="accent-[#003FC7]" checked={guides[g]} onChange={(e) => setGuides((s) => ({ ...s, [g]: e.target.checked }))} />
                    </label>
                  ))}
                </div>
                <p className="text-[10.5px] text-white/50">Guides never print.</p>
              </Sec>
            </>
          ) : null}

          {tab === "checks" ? (
            <Sec title="Live print checks">
              {checks.length === 0 ? (
                <p className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/20 p-2.5 text-[12px] text-white/80"><CheckCircle2 className="h-4 w-4 text-[#A6FA87]" aria-hidden />{kioskHasTv(L.id) ? "Nothing over the TV area, past the trim" : L.sign ? "Nothing past the trim" : "No TV on this kiosk. Nothing past the trim"} or outside the safe margin.</p>
              ) : (
                <ul className="space-y-1.5">
                  {checks.map((c, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => { setSel(c.sel); setPicked(c.sel.kind === "part" ? [c.sel.id] : []); setTab("design"); }}
                        className="flex w-full items-start gap-2 rounded-sm border border-white/10 bg-black/20 p-2 text-left hover:border-[#003FC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
                        <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${c.level === "error" ? "text-[#FF9B70]" : "text-[#FFEB66]"}`} aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-white">{c.label}</span>
                          <span className="block text-[11px] text-white/60">{c.issue}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10.5px] text-white/50">Checks run as you edit. Click an item to select it. Artwork pieces are allowed to run into the bleed; text is not.</p>
            </Sec>
          ) : null}

          {tab === "export" ? (<>
            {(() => {
              const cm = kioskCmykMaster(L.id);
              if (!cm) return null;
              return (
                <Sec title="Designer CMYK master">
                  {cm.proofUrl ? <img src={cm.proofUrl} alt={`CMYK master proof for ${L.id}`} className="mx-auto h-40 w-auto rounded-sm border border-white/15" /> : null}
                  <div className="grid grid-cols-2 gap-1.5">
                    <a className={`${dbtn} justify-center`} href={cm.aiUrl} download={`${L.id}-cmyk-master.ai`}>CMYK .ai</a>
                    <a className={`${dbtn} justify-center`} href={cm.pdfUrl} download={`${L.id}-cmyk-master.pdf`}>CMYK PDF</a>
                  </div>
                  <p className="text-[10.5px] text-white/60">Your Illustrator file, exactly as supplied ({cm.received}) — {cm.profile}, ⅛ in bleed. Not converted or rebuilt. Editor changes below are not in this file.</p>
                </Sec>
              );
            })()}
            <Sec title="Download · draft">
              <button type="button" className={`${dbtn} w-full justify-center border-[#003FC7] bg-[#003FC7] text-white hover:bg-[#003FC7]/85`} disabled={!!busy} onClick={() => dl("zip")}><Download className="h-3.5 w-3.5" />{busy === "zip" ? "Building…" : "All files (.zip)"}</button>
              <div className="grid grid-cols-2 gap-1.5">
                {([["ai", "Illustrator .ai"], ["pdf", "PDF"], ["svg", "Layered .svg"], ["press", "Press, outlined"], ["png", "PNG proof"], ["returns", "Side strips .ai"]] as const).filter(([kk]) => !(L.sign && kk === "returns")).map(([kk, label]) => (
                  <button key={kk} type="button" className={`${dbtn} justify-center`} disabled={!!busy} onClick={() => dl(kk)}>{busy === kk ? "…" : label}</button>
                ))}
              </div>
              {errors ? <p role="alert" className="rounded-sm border border-[#FF9B70]/40 bg-[#FF9B70]/10 p-2 text-[11.5px] text-white">{errors} print issue{errors === 1 ? "" : "s"} still open — see Checks before sending to press.</p> : null}
              {kioskMissingFonts(L).map((m) => (
                <p key={m.font} role="note" className="rounded-sm border border-[#FF9B70]/40 bg-[#FF9B70]/10 p-2 text-[11.5px] text-white">
                  Font not on file: {m.font.replace(/-/g, " ")}. {m.lines} line{m.lines === 1 ? " is" : "s are"} set in Geist instead, in every file. Supply the font to match London exactly.
                </p>
              ))}
              <p className="text-[10.5px] text-white/50">Live files keep editable text and named layers. The PNG is a proof, not a print master. {L.sign ? "Files are marked draft templates." : "Files stay marked draft until the San Francisco revision is published."}</p>
            </Sec>
          </>) : null}
        </div>

        <div className="flex shrink-0 gap-1.5 border-t border-white/10 p-3">
          <button type="button" className={`${dbtn} flex-1 justify-center`} onClick={() => commit({})}><RotateCcw className="h-3.5 w-3.5" />{L.sign ? "Reset to supplied" : "Reset to London"}</button>
          <button type="button" className={`${dbtn} flex-1 justify-center border-[#003FC7] bg-[#003FC7] text-white hover:bg-[#003FC7]/85`} disabled={!userId || !canSave || busy === "save"} onClick={save} title={!userId ? "Sign in to save" : !canSave ? "Your role can't save kiosks for everyone" : undefined}><Save className="h-3.5 w-3.5" />Save</button>
        </div>
        {status ? <p role="status" className="border-t border-white/10 px-3 py-1.5 text-[11px] text-white/60 xl:hidden">{status}</p> : null}
      </aside>
    </div>
  );
}

const dbtn =
  "inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] font-medium text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40";
const dibtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-sm border border-transparent text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] aria-pressed:border-[#003FC7]/60 aria-pressed:bg-[#003FC7]/35 aria-pressed:text-white disabled:cursor-not-allowed disabled:opacity-35";
const field =
  "w-full rounded-sm border border-white/10 bg-black/30 px-2 py-1 font-mono text-[12px] text-white outline-none focus:border-[#003FC7] disabled:opacity-40";

function Sec({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/55">{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Number box that commits on Enter or blur, like a desktop inspector field. */
function NumField({ label, value, digits, onCommit, disabled }: { label: string; value: number; digits: number; onCommit: (v: number) => void; disabled?: boolean }) {
  const shown = Number.isFinite(value) ? value.toFixed(digits) : "";
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  const done = () => { const v = Number(draft); if (Number.isFinite(v) && draft.trim() !== "" && v.toFixed(digits) !== shown) onCommit(v); else setDraft(shown); };
  return (
    <label className="block rounded-sm border border-white/10 bg-black/30 px-2 py-1 focus-within:border-[#003FC7]">
      <span className="block text-[9.5px] uppercase tracking-[0.08em] text-white/45">{label}</span>
      <input type="number" step={digits ? 1 / 10 ** digits : 1} disabled={disabled} value={draft}
        onChange={(e) => setDraft(e.target.value)} onBlur={done}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(shown); (e.target as HTMLInputElement).blur(); } }}
        className="w-full bg-transparent font-mono text-[12px] text-white outline-none disabled:opacity-40" />
    </label>
  );
}

const pc = (v: number | undefined) => Math.round((v ?? 0) * 100);
/** Approximate on-screen view of a CMYK build (display only; the CMYK numbers print). */
function cmykPreview(c: number[]) {
  return cmykScreen(c);
}

/** An object recoloured to one flat CMYK ink (screen view; the CMYK numbers print). */
function Inked({ cmyk, fid, children }: { cmyk?: number[]; fid: string; children: React.ReactNode }) {
  if (!cmyk) return <>{children}</>;
  return (
    <>
      <filter id={fid} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feFlood floodColor={cmykScreen(cmyk)} />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
      <g filter={`url(#${fid})`}>{children}</g>
    </>
  );
}

/** A return strip shown beside the front: the background ramp, or the designer's own strip art (with its saved changes). */
function ReturnStrip({ ground, id, height, label, offsetTop, nativeSym, symId, faceL, faceEdits, onOpen }: { ground: { offset: number; color: string }[]; id: string; height: number; label: string; offsetTop: number; nativeSym?: string; symId?: string; faceL?: LiveLayout | null; faceEdits?: KioskEdits; onOpen?: () => void }) {
  const w = height * (KIOSK_RETURN_W / KIOSK_H);
  const full = { x: -KIOSK_BLEED, y: -KIOSK_BLEED, width: KIOSK_RETURN_W + 2 * KIOSK_BLEED, height: KIOSK_H + 2 * KIOSK_BLEED };
  const fe = faceEdits ?? {};
  const fg = faceL && fe.ground ? kioskGround(faceL, fe) : ground;
  const art = faceL && symId ? (
    <>
      {fe.ground ? <rect {...full} fill={`url(#kr-${id})`} /> : <><rect {...full} fill="#FFFFFF" /><use href={`#${symId}-${faceL.native?.bgSym ?? "bg"}`} {...full} /></>}
      {layoutKiosk(faceL, fe).flatMap((p) => p.parts).filter((q) => !q.hidden).map((q) => {
        const c = partCentre(q);
        return (
          <g key={q.part.id} opacity={q.opacity < 1 ? q.opacity : undefined} transform={q.rot ? `rotate(${q.rot} ${c.x} ${c.y})` : undefined}>
            <g transform={`translate(${q.x - q.src.x0 * q.scale} ${q.y - q.src.y0 * q.scale}) scale(${q.scale})`}>
              <Inked cmyk={q.cmyk} fid={`rcs-${id}-${q.part.id}`}><use href={`#${symId}-${partSource(fe, q.part.id)}`} x={-faceL.originX} y={-faceL.originY} width={faceL.mediaW} height={faceL.mediaH} /></Inked>
            </g>
          </g>
        );
      })}
      {(fe.dividers ?? []).filter((d) => !d.hidden).map((d) => <rect key={d.id} x={d.x} y={d.y} width={d.w} height={d.h} rx={d.round ? d.h / 2 : 0} fill={d.color} opacity={d.opacity} />)}
    </>
  ) : nativeSym ? (
    <>
      {/* White paper under the strip art. */}
      <rect {...full} fill="#FFFFFF" /><use href={`#${nativeSym}-bg`} {...full} />
      <use href={`#${nativeSym}-content`} {...full} />
    </>
  ) : (
    <rect width={KIOSK_RETURN_W} height={KIOSK_H} fill={`url(#kr-${id})`} />
  );
  const svg = (
    <svg viewBox={`0 0 ${KIOSK_RETURN_W} ${KIOSK_H}`} style={{ height, width: w }} className="block shadow-[0_24px_60px_rgba(0,0,0,0.6)]" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`kr-${id}`} x1="0" y1="0" x2="0" y2="1">{fg.map((s) => <stop key={s.offset} offset={s.offset} stopColor={s.color} />)}</linearGradient>
      </defs>
      {art}
    </svg>
  );
  return (
    <figure className="m-0 flex flex-col items-center" style={{ paddingTop: offsetTop }}>
      {onOpen ? (
        <button type="button" onClick={onOpen} title={`Edit the ${label.split(" ·")[0]!.toLowerCase()}`} aria-label={`Edit the ${label.split(" ·")[0]!.toLowerCase()}`} className="block rounded-sm outline-offset-2 hover:outline hover:outline-1 hover:outline-[#A1FBF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A1FBF9]">{svg}</button>
      ) : svg}
      <figcaption className="mt-2 w-16 text-center font-mono text-[9.5px] leading-tight text-white/50">{label}{onOpen ? <span className="mt-0.5 block text-[#A1FBF9]">Click to edit</span> : null}</figcaption>
    </figure>
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
    <div ref={ref} style={{ height, width: height * (kioskFaceW(layout) / kioskFaceH(layout)) }} className="shrink-0 overflow-hidden rounded bg-secondary">
      {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : null}
    </div>
  );
}
