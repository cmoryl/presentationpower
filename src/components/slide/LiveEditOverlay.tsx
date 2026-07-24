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

export function LiveEditOverlay({
  enabled,
  slideId,
  content,
  editableFields,
  onChange,
  inkOverrides,
  onSetInkColor,
  onClearInkColor,
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
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [boundCount, setBoundCount] = useState(0);
  // Bumped whenever we commit an edit so we can force a retag pass without
  // relying on React re-render timing.
  const [tick, setTick] = useState(0);
  const [activePath, setActivePath] = useState<string | null>(null);

  // Precompute path → value map for the tag pass; unique-by-value only.
  const uniqueByValue = useMemo(() => {
    const entries: { path: string; value: string }[] = [];
    for (const pattern of editableFields) {
      for (const cp of expandPath(pattern, content)) {
        const raw = readPath(content, cp);
        if (typeof raw !== "string") continue;
        const v = raw.trim();
        if (!v) continue;
        entries.push({ path: cp, value: v });
      }
    }
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
    const map = new Map<string, string>();
    for (const e of entries) if ((counts.get(e.value) ?? 0) === 1) map.set(e.value, e.path);
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
    let node: Node | null = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (
        parent &&
        !claimedEls.has(parent) &&
        !parent.closest("input,textarea,button,select,[data-slide-chrome]")
      ) {
        const txt = (parent.textContent ?? "").replace(/\s+/g, " ").trim();
        const path = uniqueByValue.get(txt);
        if (path && !claimedPaths.has(path)) {
          parent.setAttribute("data-live-path", path);
          if (enabled) {
            parent.setAttribute("contenteditable", "plaintext-only");
            parent.setAttribute("spellcheck", "true");
            parent.classList.add("live-edit-target");
          }
          claimedPaths.add(path);
          claimedEls.add(parent);
        }
      }
      node = walker.nextNode();
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
      const next = (target.textContent ?? "").replace(/\s+/g, " ").trim();
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
        if (!active?.closest?.("[data-live-color-picker]") && !active?.hasAttribute?.("data-live-path")) {
          setActivePath(null);
        }
      }, 120);
    }
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t?.hasAttribute?.("data-live-path")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        t.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        const path = t.getAttribute("data-live-path")!;
        t.textContent = String(readPath(content, path) ?? "");
        t.blur();
      }
    }
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-live-path]")) e.stopPropagation();
    }

    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("focusout", onFocusOut, true);
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("focusout", onFocusOut, true);
      root.removeEventListener("keydown", onKeyDown, true);
      root.removeEventListener("click", onClick, true);
    };
  }, [enabled, content, onChange]);

  // Build the scoped stylesheet for ink overrides. Keyed by concrete path.
  const overrideCss = useMemo(() => {
    if (!inkOverrides) return "";
    const rules: string[] = [];
    for (const [path, hex] of Object.entries(inkOverrides)) {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) continue;
      // Attribute-escape any unusual characters — paths use [ ] . which are
      // legal in CSS attribute-value selectors when quoted.
      const q = path.replace(/"/g, '\\"');
      rules.push(`[data-live-path="${q}"], [data-live-path="${q}"] * { color: ${hex} !important; }`);
    }
    return rules.join("\n");
  }, [inkOverrides]);

  const canPickColor = enabled && !!activePath && (onSetInkColor || onClearInkColor);
  const activeHex = activePath ? inkOverrides?.[activePath] : undefined;

  return (
    <div
      ref={wrapRef}
      className={enabled ? "live-edit-active relative" : "relative"}
      data-live-bound={boundCount}
    >
      {overrideCss ? <style>{overrideCss}</style> : null}
      {children}
      {canPickColor ? (
        <div
          data-live-color-picker
          className="pointer-events-auto absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-black/10 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur"
          onMouseDown={(e) => e.preventDefault()} // keep focus on the editable element
        >
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-black/50">Text</span>
            {COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                title={`${sw.label} · ${sw.hex}`}
                onClick={() => onSetInkColor?.(activePath!, sw.hex)}
                className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                  activeHex?.toLowerCase() === sw.hex.toLowerCase()
                    ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                    : "border-black/20"
                }`}
                style={{ background: sw.hex }}
              />
            ))}
            <label
              className="ml-1 inline-flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/20 bg-white text-[9px] font-bold text-black/60"
              title="Custom color"
            >
              +
              <input
                type="color"
                className="absolute h-0 w-0 opacity-0"
                value={activeHex ?? "#003FC7"}
                onChange={(e) => onSetInkColor?.(activePath!, e.target.value)}
              />
            </label>
            {activeHex ? (
              <button
                type="button"
                onClick={() => onClearInkColor?.(activePath!)}
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
