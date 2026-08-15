import { useEffect, useMemo, useRef, useState } from "react";
import { expandPath, readPath } from "@/lib/qa";

/**
 * LiveEditOverlay
 *
 * Turns the rendered slide preview into a click-to-edit surface.
 * When `enabled`, walks the slide DOM and, for each editable field whose
 * current value uniquely appears as an element's text, tags that element
 * with contentEditable + a data-path. Edits commit on blur or Enter via
 * onChange(concretePath, newValue).
 *
 * Even when disabled, we still tag elements with `data-live-path` so that
 * per-field styling overrides (e.g. text color) painted via an injected
 * <style> block keep applying in preview / share / present.
 *
 * When enabled AND a tagged element has focus, we surface a floating color
 * palette so users can recolor a single string without diving into brand
 * settings. Pass `inkOverrides` (path → hex) plus `onSetInkColor` /
 * `onClearInkColor` to make the picker actionable.
 */

const COLOR_SWATCHES: { label: string; hex: string }[] = [
  { label: "Ink", hex: "#03002C" },
  { label: "Slate", hex: "#334155" },
  { label: "White", hex: "#FFFFFF" },
  { label: "Blue", hex: "#003FC7" },
  { label: "Aqua", hex: "#A1FBF9" },
  { label: "Lavender", hex: "#C2A3FF" },
  { label: "Yellow", hex: "#FFEB66" },
  { label: "Green", hex: "#A6FA87" },
  { label: "Peach", hex: "#FF9B70" },
  { label: "Pink", hex: "#EC388A" },
  { label: "Red", hex: "#E53D2E" },
];

/**
 * Scope key for a concrete content path.
 * "modules[2].title" → "modules[2]" (the section it belongs to)
 * "stats[0].label"   → "stats[0]"
 * "content.title"    → "content"
 * "title"            → "title"
 */
export function inkScopeOf(path: string): string {
  const arr = path.match(/^(.*\[\d+\])/);
  if (arr?.[1]) return arr[1];
  const dot = path.indexOf(".");
  return dot > 0 ? path.slice(0, dot) : path;
}

export const INK_ALL_SCOPE = "*";

type InkTarget = "block" | "section" | "all";

/* ---------------- inline formatting (markdown-lite) ----------------
 * Values are stored as plain strings with `**bold**` / `*italic*`
 * markers so nothing about the data model or the renderers changes.
 * The overlay renders those markers as real <strong>/<em> and
 * serialises them back on commit. */

const MARKER_RE = /(\*\*|__|\*|_)/;

export function stripInlineMarkers(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/gs, "$1")
    .replace(/(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/gs, "$1");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function inlineMarkersToHtml(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
    .replace(/__(.+?)__/gs, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/gs, "<em>$1</em>")
    .replace(/(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/gs, "<em>$1</em>");
}

/** Serialise an edited element back to marker text. */
export function domToInlineMarkers(root: HTMLElement): string {
  const out: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.nodeValue ?? "");
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    const style = node.style;
    const bold =
      tag === "strong" ||
      tag === "b" ||
      style.fontWeight === "bold" ||
      Number(style.fontWeight) >= 600;
    const italic = tag === "em" || tag === "i" || style.fontStyle === "italic";
    if (tag === "br") {
      out.push("\n");
      return;
    }
    if (bold) out.push("**");
    if (italic) out.push("*");
    node.childNodes.forEach(walk);
    if (italic) out.push("*");
    if (bold) out.push("**");
    if (tag === "div" || tag === "p") out.push("\n");
  };
  root.childNodes.forEach(walk);
  return out.join("");
}

/** Wrap the current selection inside `el` with a marker pair. */
function wrapSelection(el: HTMLElement, marker: "**" | "*") {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) return;
  const text = range.toString();
  const stripped = stripInlineMarkers(text);
  const frag = document
    .createRange()
    .createContextualFragment(inlineMarkersToHtml(`${marker}${stripped}${marker}`));
  range.deleteContents();
  range.insertNode(frag);
  sel.removeAllRanges();
}

export function LiveEditOverlay({
  enabled,
  slideId,
  content,
  editableFields,
  onChange,
  inkOverrides,
  onSetInkColor,
  onClearInkColor,
  inkScopeOverrides,
  onSetInkScopeColor,
  onClearInkScopeColor,
  children,
}: {
  enabled: boolean;
  slideId: string;
  content: Record<string, unknown>;
  editableFields: string[];
  onChange: (concretePath: string, value: unknown) => void;
  inkOverrides?: Record<string, string>;
  onSetInkColor?: (concretePath: string, color: string) => void;
  onClearInkColor?: (concretePath: string) => void;
  /** Scope-level colors: key is a scope from inkScopeOf(), or "*" for all text. */
  inkScopeOverrides?: Record<string, string>;
  onSetInkScopeColor?: (scope: string, color: string) => void;
  onClearInkScopeColor?: (scope: string) => void;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [boundCount, setBoundCount] = useState(0);
  // Bumped whenever we commit an edit so we can force a retag pass without
  // relying on React re-render timing.
  const [tick, setTick] = useState(0);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [inkTarget, setInkTarget] = useState<InkTarget>("block");

  // Precompute path → value map for the tag pass; unique-by-value only.
  // Values are matched both with their raw markers (first paint, where the
  // renderer prints `**bold**` literally) and stripped (after we've swapped
  // the markers for real <strong>/<em>).
  const uniqueByValue = useMemo(() => {
    const entries: { path: string; value: string; raw: string }[] = [];
    for (const pattern of editableFields) {
      for (const cp of expandPath(pattern, content)) {
        const raw = readPath(content, cp);
        if (typeof raw !== "string") continue;
        // Match on collapsed text so values containing hard returns still
        // resolve against the DOM's rendered text.
        const v = raw.replace(/\s+/g, " ").trim();
        if (!v) continue;
        entries.push({ path: cp, value: v, raw });
        const stripped = stripInlineMarkers(v).replace(/\s+/g, " ").trim();
        if (stripped && stripped !== v) entries.push({ path: cp, value: stripped, raw });
      }
    }
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
    const map = new Map<string, { path: string; raw: string }>();
    for (const e of entries) {
      if ((counts.get(e.value) ?? 0) !== 1) continue;
      map.set(e.value, { path: e.path, raw: e.raw });
    }
    return map;
  }, [content, editableFields]);

  // Tag the DOM. We always tag (even when disabled) so ink overrides paint,
  // but only wire contentEditable when `enabled`.
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    root.querySelectorAll<HTMLElement>("[data-live-path]").forEach((el) => {
      el.removeAttribute("data-live-path");
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
      el.classList.remove("live-edit-target");
    });

    if (uniqueByValue.size === 0) {
      setBoundCount(0);
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const claimedPaths = new Set<string>();
    const claimedEls = new Set<Element>();
    const toFormat: { el: HTMLElement; raw: string }[] = [];
    let node: Node | null = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !parent.closest("input,textarea,button,select,[data-slide-chrome]")) {
        // Walk up from the text node: renderers often split a single field
        // across inline children (e.g. an emphasised last word inside a
        // heading), so the value only matches on an ancestor's textContent.
        let el: HTMLElement | null = parent;
        let depth = 0;
        while (el && el !== root && depth < 4) {
          if (!claimedEls.has(el)) {
            const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim();
            const hit = uniqueByValue.get(txt);
            if (hit && !claimedPaths.has(hit.path)) {
              el.setAttribute("data-live-path", hit.path);
              if (enabled) {
                el.setAttribute("contenteditable", "true");
                el.setAttribute("spellcheck", "true");
                el.classList.add("live-edit-target");
              }
              // Render markers as real bold / italic (edit mode and read-only).
              if (MARKER_RE.test(hit.raw) && el.children.length === 0) {
                toFormat.push({ el, raw: hit.raw });
              }
              claimedPaths.add(hit.path);
              claimedEls.add(el);
              break;
            }
          }
          el = el.parentElement;
          depth += 1;
        }
      }
      node = walker.nextNode();
    }

    for (const f of toFormat) {
      if (document.activeElement === f.el) continue;
      f.el.innerHTML = inlineMarkersToHtml(f.raw);
    }

    setBoundCount(claimedPaths.size);
  }, [enabled, slideId, uniqueByValue, tick]);

  // Commit handlers via event delegation.
  useEffect(() => {
    const root = wrapRef.current;
    if (!root || !enabled) return;

    function commit(target: HTMLElement) {
      const path = target.getAttribute("data-live-path");
      if (!path) return;
      // Serialise bold/italic back to markers; preserve hard returns and
      // only collapse runs of spaces/tabs.
      const next = domToInlineMarkers(target)
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t\u00a0]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map((l) => l.trim())
        .join("\n")
        .trim();
      const prev = String(readPath(content, path) ?? "").trim();
      if (next === prev) return;
      onChange(path, next);
      setTick((t) => t + 1);
    }

    function onFocusIn(e: FocusEvent) {
      const t = e.target as HTMLElement | null;
      const p = t?.getAttribute?.("data-live-path");
      if (p) setActivePath(p);
    }
    function onFocusOut(e: FocusEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.hasAttribute?.("data-live-path")) commit(t);
      // Delay clearing so click on palette lands first.
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (
          !active?.closest?.("[data-live-color-picker]") &&
          !active?.hasAttribute?.("data-live-path")
        ) {
          setActivePath(null);
        }
      }, 120);
    }
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t?.hasAttribute?.("data-live-path")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        e.stopPropagation();
        wrapSelection(t, "**");
        commit(t);
        return;
      }
      if (mod && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        e.stopPropagation();
        wrapSelection(t, "*");
        commit(t);
        return;
      }
      if (e.key === "Enter" && mod) {
        // Cmd/Ctrl+Enter commits; plain Enter inserts a hard return.
        e.preventDefault();
        t.blur();
      } else if (e.key === "Enter") {
        e.stopPropagation();
      } else if (e.key === "Escape") {
        e.preventDefault();
        const path = t.getAttribute("data-live-path")!;
        t.innerHTML = inlineMarkersToHtml(String(readPath(content, path) ?? ""));
        t.blur();
      }
    }
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t?.hasAttribute?.("data-live-path")) return;
      // Keep pastes plain — no foreign markup in the slide DOM.
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, text);
    }

    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-live-path]")) e.stopPropagation();
    }

    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("focusout", onFocusOut, true);
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("paste", onPaste, true);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("focusout", onFocusOut, true);
      root.removeEventListener("keydown", onKeyDown, true);
      root.removeEventListener("paste", onPaste, true);
      root.removeEventListener("click", onClick, true);
    };
  }, [enabled, content, onChange]);

  // Build the scoped stylesheet for ink overrides. Scope rules are emitted
  // first so a per-field override always wins over its section / all-text
  // colour (equal specificity → last rule wins).
  const overrideCss = useMemo(() => {
    const rules: string[] = [];
    const isHex = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h);
    for (const [scope, hex] of Object.entries(inkScopeOverrides ?? {})) {
      if (!isHex(hex)) continue;
      if (scope === INK_ALL_SCOPE) {
        rules.push(`[data-live-path], [data-live-path] * { color: ${hex} !important; }`);
        continue;
      }
      const q = scope.replace(/"/g, '\\"');
      rules.push(
        `[data-live-path="${q}"], [data-live-path^="${q}."], [data-live-path^="${q}."] *, [data-live-path="${q}"] * { color: ${hex} !important; }`,
      );
    }
    for (const [path, hex] of Object.entries(inkOverrides ?? {})) {
      if (!isHex(hex)) continue;
      // Attribute-escape any unusual characters — paths use [ ] . which are
      // legal in CSS attribute-value selectors when quoted.
      const q = path.replace(/"/g, '\\"');
      rules.push(
        `[data-live-path="${q}"], [data-live-path="${q}"] * { color: ${hex} !important; }`,
      );
    }
    return rules.join("\n");
  }, [inkOverrides, inkScopeOverrides]);

  const canPickColor =
    enabled && !!activePath && (onSetInkColor || onClearInkColor || onSetInkScopeColor);
  const activeScope = activePath ? inkScopeOf(activePath) : null;
  const scopeSupported = !!(onSetInkScopeColor || onClearInkScopeColor);
  const target: InkTarget = scopeSupported ? inkTarget : "block";
  const targetKey =
    target === "block" ? activePath : target === "section" ? activeScope : INK_ALL_SCOPE;
  const activeHex =
    target === "block"
      ? activePath
        ? inkOverrides?.[activePath]
        : undefined
      : targetKey
        ? inkScopeOverrides?.[targetKey]
        : undefined;

  function applyColor(hex: string) {
    if (!targetKey) return;
    if (target === "block") onSetInkColor?.(targetKey, hex);
    else onSetInkScopeColor?.(targetKey, hex);
  }
  function clearColor() {
    if (!targetKey) return;
    if (target === "block") onClearInkColor?.(targetKey);
    else onClearInkScopeColor?.(targetKey);
  }

  function applyFormat(marker: "**" | "*") {
    const el = document.activeElement as HTMLElement | null;
    if (!el?.hasAttribute?.("data-live-path")) return;
    wrapSelection(el, marker);
    const path = el.getAttribute("data-live-path")!;
    const next = domToInlineMarkers(el)
      .replace(/[ \t\u00a0]+/g, " ")
      .trim();
    onChange(path, next);
    setTick((t) => t + 1);
  }

  return (
    <div
      ref={wrapRef}
      className={enabled ? "live-edit-active relative h-full w-full" : "relative h-full w-full"}
      data-live-bound={boundCount}
    >
      <style>{`[data-live-path]{white-space:pre-wrap;}\n${overrideCss}`}</style>
      {children}
      {canPickColor ? (
        <div
          data-live-color-picker
          data-ink-target={target}
          className="pointer-events-auto absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 px-2.5 py-2 shadow-lg backdrop-blur"
          onMouseDown={(e) => e.preventDefault()} // keep focus on the editable element
        >
          <div className="mb-1.5 flex items-center gap-1">
            <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-black/50">
              Style
            </span>
            <button
              type="button"
              data-testid="live-format-bold"
              title="Bold selection (⌘/Ctrl + B)"
              onClick={() => applyFormat("**")}
              className="h-6 w-6 rounded-md border border-black/10 text-[12px] font-bold text-black/80 hover:bg-black/5"
            >
              B
            </button>
            <button
              type="button"
              data-testid="live-format-italic"
              title="Italicize selection (⌘/Ctrl + I)"
              onClick={() => applyFormat("*")}
              className="h-6 w-6 rounded-md border border-black/10 text-[12px] italic text-black/80 hover:bg-black/5"
            >
              I
            </button>
          </div>
          {scopeSupported ? (
            <div className="mb-1.5 flex items-center gap-1">
              <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-black/50">
                Apply to
              </span>
              {(
                [
                  { id: "block", label: "This text" },
                  { id: "section", label: "Section" },
                  { id: "all", label: "All text" },
                ] as { id: InkTarget; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`ink-target-${opt.id}`}
                  aria-pressed={target === opt.id}
                  onClick={() => setInkTarget(opt.id)}
                  title={
                    opt.id === "section" && activeScope ? `All text in ${activeScope}` : opt.label
                  }
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest transition ${
                    target === opt.id
                      ? "bg-[#003FC7] text-white"
                      : "border border-black/15 text-black/55 hover:border-[#003FC7]/50 hover:text-black"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-black/50">
              Text
            </span>
            {COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                title={`${sw.label} · ${sw.hex}`}
                onClick={() => applyColor(sw.hex)}
                className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                  activeHex?.toLowerCase() === sw.hex.toLowerCase()
                    ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                    : "border-black/20"
                }`}
                style={{ background: sw.hex }}
              />
            ))}
            <label
              className="relative ml-1 inline-flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/20 bg-white text-[9px] font-bold text-black/60"
              title="Custom color"
            >
              +
              <input
                type="color"
                data-testid="ink-custom-hex"
                className="absolute h-0 w-0 opacity-0"
                value={activeHex ?? "#003FC7"}
                onChange={(e) => applyColor(e.target.value)}
              />
            </label>
            {activeHex ? (
              <button
                type="button"
                onClick={clearColor}
                title="Clear color override"
                className="ml-1 rounded-full border border-black/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-black/60 hover:border-red-500 hover:text-red-600"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
