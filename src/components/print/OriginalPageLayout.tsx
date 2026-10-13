// "Original layout" — a curated piece drawn page for page like the designer's
// file. The artwork is split into separate pieces (icons, cards, logos,
// photos, bands — see scripts/lifesci-original-pieces.py) stacked in the
// designer's paint order over a ground, and every text run sits on top as
// real, editable text. In an editor (PrintLogoListContext active) an
// "Arrange" mode lets every piece and text box be moved, resized, recoloured,
// restacked or hidden; outside arrange mode text is edited in place as before.
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";

import { usePrintLogoList } from "@/components/print/PrintLogoList";
import {
  CSS_DPI,
  isOriginalLayout,
  suppliedPiece,
  withPieces,
  type OriginalLayout,
  type OriginalPiece,
  type OriginalText,
  BULLET,
  packRuns,
  withParagraphs,
} from "@/lib/print-library/original-layout";
import { canvaSvgString } from "@/lib/icon-export";
import { iconByName } from "@/lib/icon-library";
import { brandIconSet, flatIcons } from "@/lib/brand-icon-sets";

export { isOriginalLayout };

const FAMILY: Record<string, string> = {
  geist: '"Geist", "Geist Variable", ui-sans-serif, system-ui, sans-serif',
  poppins: '"Poppins", ui-sans-serif, system-ui, sans-serif',
};

type Sel = { page: number; kind: "piece" | "text"; id: string } | null;

function PieceView({ k }: { k: OriginalPiece }) {
  const base: CSSProperties = {
    position: "absolute",
    left: k.x * CSS_DPI,
    top: k.y * CSS_DPI,
    width: k.w * CSS_DPI,
    height: k.h * CSS_DPI,
    opacity: k.opacity ?? 1,
    pointerEvents: "none",
  };
  if (k.tint && !k.raster)
    return (
      <div
        data-original-piece={k.id}
        style={{
          ...base,
          background: k.tint,
          WebkitMaskImage: `url("${k.src}")`,
          maskImage: `url("${k.src}")`,
          WebkitMaskSize: k.icon ? "contain" : "100% 100%",
          maskSize: k.icon ? "contain" : "100% 100%",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      />
    );
  return (
    <img
      data-original-piece={k.id}
      src={k.src}
      alt=""
      draggable={false}
      crossOrigin="anonymous"
      style={{ ...base, objectFit: k.icon ? "contain" : "fill" }}
    />
  );
}

const APPROVED_INKS: { label: string; hex: string }[] = [
  { label: "Ink", hex: "#03002C" },
  { label: "Blue", hex: "#003FC7" },
  { label: "White", hex: "#FFFFFF" },
  { label: "Aqua", hex: "#A1FBF9" },
  { label: "Lavender", hex: "#C2A3FF" },
  { label: "Dark gray", hex: "#666666" },
];

type Run = { text: string; color: string; weight: number };

function toHex(c: string): string {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return c.toUpperCase();
  return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Read an edited block back into styled runs, one `\n` per paragraph. */
function readRuns(root: HTMLElement): Run[] {
  const out: Run[] = [];
  const push = (text: string, el: Element) => {
    const cs = getComputedStyle(el);
    out.push({ text, color: toHex(cs.color), weight: Number(cs.fontWeight) || 400 });
  };
  const blocks = Array.from(root.childNodes);
  blocks.forEach((block, bi) => {
    if (bi > 0 && (block as HTMLElement).tagName === "DIV") push("\n", root);
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        if (n.textContent) push(n.textContent.replace(/\u00a0/g, " "), n.parentElement ?? root);
      } else if ((n as HTMLElement).tagName === "BR") {
        if (n.nextSibling || n.parentNode === root) push("\n", root);
      } else n.childNodes.forEach(walk);
    };
    walk(block);
  });
  const packed = packRuns(out);
  // Trim a trailing paragraph break left by the editor.
  const last = packed[packed.length - 1];
  if (last) last.text = last.text.replace(/\n+$/, "");
  return packRuns(packed);
}

function paragraphsOf(t: OriginalText): Run[][] {
  const runs: Run[] = t.runs?.length ? t.runs : [{ text: t.text, color: t.color, weight: t.weight }];
  const paras: Run[][] = [[]];
  for (const r of runs) {
    r.text.split("\n").forEach((piece, i) => {
      if (i > 0) paras.push([]);
      if (piece) paras[paras.length - 1].push({ ...r, text: piece });
    });
  }
  return paras;
}

function TextView({ t, editable, onCommit, onFocusText }: {
  t: OriginalText;
  editable: boolean;
  onCommit: (runs: Run[]) => void;
  onFocusText: (id: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paras = paragraphsOf(t);
  // Re-mount the editable DOM only when the saved copy changes.
  const key = JSON.stringify(t.runs ?? t.text) + t.color + t.weight;
  const hang = t.list ? 0.62 : 0;
  return (
    <div
      key={key}
      ref={ref}
      data-original-text={t.id}
      contentEditable={editable || undefined}
      suppressContentEditableWarning
      spellCheck={editable || undefined}
      onFocus={() => onFocusText(t.id)}
      onBlur={() => {
        const el = ref.current;
        if (!el) return;
        const next = readRuns(el);
        const before = paras.map((p) => p.map((r) => r.text).join("")).join("\n");
        const after = next.map((r) => r.text).join("");
        const styleChanged = JSON.stringify(next) !== JSON.stringify(packRuns(paras.flatMap((p, i) => (i ? [{ text: "\n", color: t.color, weight: t.weight }, ...p] : p))));
        if (after !== before || styleChanged) onCommit(next);
      }}
      onKeyDown={(e) => {
        // New list item keeps its bullet.
        if (t.list && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          document.execCommand("insertParagraph");
          document.execCommand("insertText", false, `${BULLET} `);
        }
      }}
      style={
        {
          position: "absolute",
          left: t.x * CSS_DPI,
          top: t.y * CSS_DPI,
          width: t.w * CSS_DPI,
          fontFamily: FAMILY[t.family] ?? FAMILY.geist,
          fontSize: (t.size * CSS_DPI) / 72,
          fontWeight: t.weight,
          color: t.color,
          lineHeight: t.lead,
          textAlign: t.align,
          whiteSpace: "pre-wrap",
          letterSpacing: t.track ? `${t.track}em` : 0,
          margin: 0,
          outline: "none",
          cursor: editable ? "text" : undefined,
        } as CSSProperties
      }
    >
      {paras.map((p, pi) => (
        <div key={pi} style={hang ? { paddingLeft: `${hang}em`, textIndent: `-${hang}em` } : undefined}>
          {p.length ? p.map((r, ri) => (
            <span key={ri} style={{ color: r.color, fontWeight: r.weight }}>
              {r.text}
            </span>
          )) : <br />}
        </div>
      ))}
    </div>
  );
}

/** Lucide glyph as a self-contained SVG data URL (recolourable via tint). */
function iconSrc(name: string): string | null {
  const svg = canvaSvgString(name, { color: "#03002C", strokeWidth: 1.75 });
  return svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : null;
}

function IconSwap({ onPick }: { onPick: (name: string) => void }) {
  const [q, setQ] = useState("");
  const icons = useMemo(() => {
    const all = [...flatIcons(brandIconSet("transperfect-life-sciences")), ...flatIcons(brandIconSet("transperfect-master"))];
    const seen = new Set<string>();
    const uniq = all.filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)));
    const s = q.trim().toLowerCase();
    return (s ? uniq.filter((i) => [i.name, i.label, ...(i.keywords ?? [])].some((k) => k.toLowerCase().includes(s))) : uniq).slice(0, 60);
  }, [q]);
  return (
    <div className="flex w-full flex-col gap-1.5 border-t border-black/10 pt-1.5">
      <label className="flex items-center gap-1.5">
        Replace with approved icon
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons…"
          className="h-7 w-44 rounded border border-black/15 bg-white px-2"
        />
      </label>
      <div className="flex max-h-28 flex-wrap gap-1 overflow-auto">
        {icons.map((i) => {
          const Icon = iconByName(i.name);
          return Icon ? (
            <button key={i.name} type="button" className={btn} title={i.label} aria-label={`Use ${i.label} icon`} onClick={() => onPick(i.name)}>
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          ) : null;
        })}
      </div>
    </div>
  );
}

const btn =
  "rounded border border-black/15 bg-white px-2 py-1 text-[11px] font-medium text-[#03002C] hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003FC7] disabled:opacity-40";

export function OriginalPageLayout({ layout: rawLayout, pageIndex }: { layout: OriginalLayout; pageIndex?: number }) {
  const edit = usePrintLogoList();
  const editable = !!edit?.active;
  const layout = useMemo(() => withParagraphs(withPieces(rawLayout)), [rawLayout]);
  const w = layout.widthIn * CSS_DPI;
  const h = layout.heightIn * CSS_DPI;
  const first = typeof pageIndex === "number" ? pageIndex : 0;
  const pages = typeof pageIndex === "number" ? layout.pages.slice(pageIndex, pageIndex + 1) : layout.pages;
  const gap = 24;
  const total = pages.length * h + (pages.length - 1) * gap;
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [arrange, setArrange] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const [typing, setTyping] = useState<{ page: number; id: string } | null>(null);
  const drag = useRef<{ mode: "move" | "size"; sx: number; sy: number; orig: { x: number; y: number; w: number; h: number } } | null>(null);

  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const fit = () => {
      const cw = el.clientWidth;
      if (cw > 0) setScale(Math.round((cw / w) * 1000) / 1000);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  const commit = (next: OriginalLayout) => edit?.onChange("original", next);
  const patchItem = (page: number, kind: "piece" | "text", id: string, patch: Partial<OriginalPiece & OriginalText>) => {
    const next: OriginalLayout = {
      ...layout,
      pages: layout.pages.map((p, pi) => {
        if (pi !== page) return p;
        if (kind === "piece") return { ...p, pieces: (p.pieces ?? []).map((k) => (k.id === id ? { ...k, ...patch } : k)) };
        return { ...p, texts: p.texts.map((t) => (t.id === id ? ({ ...t, ...patch } as OriginalText) : t)) };
      }),
    };
    commit(next);
  };
  const itemOf = (s: NonNullable<Sel>) => {
    const p = layout.pages[s.page];
    return s.kind === "piece" ? p?.pieces?.find((k) => k.id === s.id) : p?.texts.find((t) => t.id === s.id);
  };
  const selected = sel ? itemOf(sel) : undefined;

  const onDown = (e: RPointerEvent, s: NonNullable<Sel>, mode: "move" | "size") => {
    e.preventDefault();
    e.stopPropagation();
    setSel(s);
    const it = itemOf(s);
    if (!it) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, orig: { x: it.x, y: it.y, w: it.w, h: it.h } };
  };
  const onMove = (e: RPointerEvent, s: NonNullable<Sel>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale / CSS_DPI;
    const dy = (e.clientY - d.sy) / scale / CSS_DPI;
    const r = (n: number) => Math.round(n * 10000) / 10000;
    if (d.mode === "move") patchItem(s.page, s.kind, s.id, { x: r(d.orig.x + dx), y: r(d.orig.y + dy) });
    else if (s.kind === "text") patchItem(s.page, s.kind, s.id, { w: r(Math.max(0.2, d.orig.w + dx)) });
    else {
      // Pieces keep their proportions unless Shift is held.
      const nw = Math.max(0.05, d.orig.w + dx);
      const nh = e.shiftKey ? Math.max(0.05, d.orig.h + dy) : (nw * d.orig.h) / d.orig.w;
      patchItem(s.page, s.kind, s.id, { w: r(nw), h: r(nh) });
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  const nudge = (dx: number, dy: number) => {
    if (!sel || !selected) return;
    patchItem(sel.page, sel.kind, sel.id, { x: selected.x + dx, y: selected.y + dy });
  };
  const restack = (dir: 1 | -1) => {
    if (!sel || sel.kind !== "piece") return;
    const p = layout.pages[sel.page];
    const list = [...(p.pieces ?? [])];
    const i = list.findIndex((k) => k.id === sel.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    commit({ ...layout, pages: layout.pages.map((pp, pi) => (pi === sel.page ? { ...pp, pieces: list } : pp)) });
  };
  const reset = () => {
    if (!sel || sel.kind !== "piece") return;
    const p = layout.pages[sel.page];
    const orig = suppliedPiece(p.ground, sel.id);
    if (orig) patchItem(sel.page, "piece", sel.id, { ...orig, hidden: false, tint: undefined, opacity: undefined, icon: undefined });
  };
  const hiddenCount = pages.reduce(
    (n, p) => n + (p.pieces ?? []).filter((k) => k.hidden).length + p.texts.filter((t) => t.hidden).length,
    0,
  );
  const showAll = () =>
    commit({
      ...layout,
      pages: layout.pages.map((p) => ({
        ...p,
        pieces: p.pieces?.map((k) => ({ ...k, hidden: false })),
        texts: p.texts.map((t) => ({ ...t, hidden: false })),
      })),
    });

  return (
    <div>
      {editable ? (
        <div
          data-export-ignore="true"
          className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-black/10 bg-[#F2F2F2] p-2 text-[11px] text-[#03002C]"
        >
          <button
            type="button"
            className={`${btn} ${arrange ? "!border-[#003FC7] !bg-[#003FC7] !text-white" : ""}`}
            aria-pressed={arrange}
            onClick={() => {
              setArrange((a) => !a);
              setSel(null);
            }}
          >
            {arrange ? "Done arranging" : "Arrange pieces"}
          </button>
          {arrange ? (
            <span className="text-black/60">
              Click any piece or text box, drag to move, drag the corner to resize (Shift: free stretch). Arrow keys nudge.
            </span>
          ) : (
            <span className="text-black/60">Click text to retype it. Use Arrange pieces to move, resize, recolour or hide any part of the artwork.</span>
          )}
          {hiddenCount ? (
            <button type="button" className={btn} onClick={showAll}>
              Show {hiddenCount} hidden
            </button>
          ) : null}
          {!arrange ? (
            <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-black/10 pt-1.5" onMouseDown={(e) => e.preventDefault()}>
              <strong className="mr-1">{typing ? "Selected text" : "Select words in any paragraph to style them"}</strong>
              <button type="button" className={btn} disabled={!typing} onClick={() => document.execCommand("bold")}>
                Bold
              </button>
              {APPROVED_INKS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  disabled={!typing}
                  className={btn}
                  title={c.label}
                  aria-label={`Colour ${c.label}`}
                  onClick={() => {
                    document.execCommand("styleWithCSS", false, "true");
                    document.execCommand("foreColor", false, c.hex);
                  }}
                >
                  <span className="inline-block h-3 w-3 rounded-sm border border-black/20 align-middle" style={{ background: c.hex }} />
                </button>
              ))}
              <span className="text-black/50">Enter starts a new paragraph (or bullet); lines wrap on their own.</span>
            </div>
          ) : null}
          {arrange && sel && selected ? (
            <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-black/10 pt-1.5">
              <strong className="mr-1">
                {sel.kind === "piece" ? (selected as OriginalPiece).label : "Text"} ·{" "}
                {selected.w.toFixed(2)} × {selected.h.toFixed(2)} in
              </strong>
              <button type="button" className={btn} onClick={() => patchItem(sel.page, sel.kind, sel.id, { hidden: !selected.hidden })}>
                {selected.hidden ? "Show" : "Hide"}
              </button>
              {sel.kind === "piece" ? (
                <>
                  <button type="button" className={btn} onClick={() => restack(1)}>
                    Bring forward
                  </button>
                  <button type="button" className={btn} onClick={() => restack(-1)}>
                    Send back
                  </button>
                  {!(selected as OriginalPiece).raster ? (
                    <label className="flex items-center gap-1">
                      Recolour
                      <input
                        type="color"
                        aria-label="Recolour piece"
                        value={(selected as OriginalPiece).tint ?? "#003FC7"}
                        onChange={(e) => patchItem(sel.page, "piece", sel.id, { tint: e.target.value })}
                      />
                      {(selected as OriginalPiece).tint ? (
                        <button type="button" className={btn} onClick={() => patchItem(sel.page, "piece", sel.id, { tint: undefined })}>
                          Original colours
                        </button>
                      ) : null}
                    </label>
                  ) : null}
                  <label className="flex items-center gap-1">
                    Opacity
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      aria-label="Piece opacity"
                      value={(selected as OriginalPiece).opacity ?? 1}
                      onChange={(e) => patchItem(sel.page, "piece", sel.id, { opacity: Number(e.target.value) })}
                    />
                  </label>
                  <button type="button" className={btn} onClick={reset}>
                    Reset piece
                  </button>
                  {!(selected as OriginalPiece).raster ? (
                    <IconSwap
                      onPick={(name) => {
                        const src = iconSrc(name);
                        if (src) patchItem(sel.page, "piece", sel.id, { src, icon: name, tint: (selected as OriginalPiece).tint ?? "#003FC7" });
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <label className="flex items-center gap-1">
                  Colour
                  <input
                    type="color"
                    aria-label="Text colour"
                    value={(selected as OriginalText).color}
                    onChange={(e) => patchItem(sel.page, "text", sel.id, { color: e.target.value, runs: undefined })}
                  />
                </label>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <div ref={outer} style={{ width: "100%", height: total * scale, overflow: "hidden" }}>
        <div data-original-layout style={{ display: "grid", gap, width: w, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {pages.map((p, i) => {
            const pi = first + i;
            const order = (p.pieces ?? []).map((k, idx) => ({ k, idx })).sort((a, b) => (a.k.z ?? 0) - (b.k.z ?? 0) || a.idx - b.idx);
            return (
              <div
                key={pi}
                data-print-page
                style={{ position: "relative", width: w, height: h, overflow: "hidden", background: "#FFFFFF" }}
                onPointerDown={() => arrange && setSel(null)}
                onKeyDown={(e) => {
                  if (!arrange || !sel) return;
                  const step = e.shiftKey ? 0.1 : 0.01;
                  const map: Record<string, [number, number]> = {
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                  };
                  if (map[e.key]) {
                    e.preventDefault();
                    nudge(...map[e.key]);
                  }
                }}
              >
                <img
                  src={p.ground}
                  alt=""
                  draggable={false}
                  crossOrigin="anonymous"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }}
                />
                {order.map(({ k }) => (k.hidden ? null : <PieceView key={k.id} k={k} />))}
                {p.texts.map((t) =>
                  t.hidden ? null : (
                    <TextView
                      key={t.id}
                      t={t}
                      editable={editable && !arrange}
                      onFocusText={(id) => setTyping(id ? { page: pi, id } : null)}
                      onCommit={(runs) =>
                        patchItem(pi, "text", t.id, {
                          runs,
                          text: runs.map((r) => r.text).join(""),
                          paragraphs: true,
                          list: runs.map((r) => r.text).join("").trimStart().startsWith(BULLET) || undefined,
                        })
                      }
                    />
                  ),
                )}
                {arrange ? (
                  <div data-export-ignore="true" style={{ position: "absolute", inset: 0 }}>
                    {[
                      ...order.map(({ k }) => ({ kind: "piece" as const, it: k as OriginalPiece | OriginalText })),
                      ...p.texts.map((t) => ({ kind: "text" as const, it: t as OriginalPiece | OriginalText })),
                    ].map(({ kind, it }) => {
                      const s = { page: pi, kind, id: it.id };
                      const on = sel?.page === pi && sel.kind === kind && sel.id === it.id;
                      const hh = kind === "text" ? Math.max(it.h, ((it as OriginalText).size / 72) * 1.2) : it.h;
                      return (
                        <div
                          key={`${kind}-${it.id}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${kind === "piece" ? (it as OriginalPiece).label : "Text"} ${it.id}${it.hidden ? " (hidden)" : ""}`}
                          onPointerDown={(e) => onDown(e, s, "move")}
                          onPointerMove={(e) => onMove(e, s)}
                          onPointerUp={onUp}
                          onFocus={() => setSel(s)}
                          style={{
                            position: "absolute",
                            left: it.x * CSS_DPI,
                            top: it.y * CSS_DPI,
                            width: it.w * CSS_DPI,
                            height: hh * CSS_DPI,
                            cursor: "move",
                            outline: on ? "2px solid #003FC7" : it.hidden ? "1px dashed rgba(229,61,46,.6)" : "1px dashed rgba(0,63,199,.25)",
                            outlineOffset: 0,
                            background: on ? "rgba(0,63,199,.06)" : "transparent",
                            zIndex: on ? 5 : kind === "text" ? 2 : 1,
                          }}
                        >
                          {on ? (
                            <div
                              aria-label="Resize"
                              onPointerDown={(e) => onDown(e, s, "size")}
                              onPointerMove={(e) => onMove(e, s)}
                              onPointerUp={onUp}
                              style={{
                                position: "absolute",
                                right: -7,
                                bottom: -7,
                                width: 14,
                                height: 14,
                                background: "#003FC7",
                                border: "2px solid #fff",
                                borderRadius: 2,
                                cursor: "nwse-resize",
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
