import { useEffect, useRef, useState } from "react";
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
 * Fields whose value is empty, appears in multiple elements, or is spread
 * across sibling text nodes can't be safely bound and fall back to the
 * "Editable fields" panel below the preview.
 */
export function LiveEditOverlay({
  enabled,
  slideId,
  content,
  editableFields,
  onChange,
  children,
}: {
  enabled: boolean;
  slideId: string;
  content: Record<string, unknown>;
  editableFields: string[];
  onChange: (concretePath: string, value: unknown) => void;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [boundCount, setBoundCount] = useState(0);
  // Bumped whenever we commit an edit so we can force a retag pass without
  // relying on React re-render timing.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    // Clean up prior tagging first.
    root.querySelectorAll<HTMLElement>("[data-live-path]").forEach((el) => {
      el.removeAttribute("data-live-path");
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
      el.classList.remove("live-edit-target");
    });

    if (!enabled) {
      setBoundCount(0);
      return;
    }

    // Build path → value map, keeping only non-empty scalar strings.
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

    // Discard values that appear more than once — they're ambiguous.
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
    const uniqueByValue = new Map<string, string>(); // value → path
    for (const e of entries) if ((counts.get(e.value) ?? 0) === 1) uniqueByValue.set(e.value, e.path);

    if (uniqueByValue.size === 0) {
      setBoundCount(0);
      return;
    }

    // Walk text nodes; when a text node's parent element's normalized text
    // matches a unique value, tag it. Skip inputs, buttons, and elements
    // already tagged.
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
          parent.setAttribute("contenteditable", "plaintext-only");
          parent.setAttribute("spellcheck", "true");
          parent.classList.add("live-edit-target");
          claimedPaths.add(path);
          claimedEls.add(parent);
        }
      }
      node = walker.nextNode();
    }

    setBoundCount(claimedPaths.size);
  }, [enabled, slideId, content, editableFields, tick]);

  // Commit handlers via event delegation. contentEditable="plaintext-only"
  // strips markup on paste; Enter blurs to commit.
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
      // Force a retag next tick so subsequent edits still find their target.
      setTick((t) => t + 1);
    }

    function onFocusOut(e: FocusEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.hasAttribute?.("data-live-path")) commit(t);
    }
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t?.hasAttribute?.("data-live-path")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        t.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Revert visible text; blur without commit.
        const path = t.getAttribute("data-live-path")!;
        t.textContent = String(readPath(content, path) ?? "");
        t.blur();
      }
    }
    // Prevent the parent "Enlarge" button from swallowing clicks.
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-live-path]")) e.stopPropagation();
    }

    root.addEventListener("focusout", onFocusOut, true);
    root.addEventListener("keydown", onKeyDown, true);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("focusout", onFocusOut, true);
      root.removeEventListener("keydown", onKeyDown, true);
      root.removeEventListener("click", onClick, true);
    };
  }, [enabled, content, onChange]);

  return (
    <div ref={wrapRef} className={enabled ? "live-edit-active" : undefined} data-live-bound={boundCount}>
      {children}
    </div>
  );
}
