// Shared accessibility scaffolding for overlay/modal components built on the
// hand-rolled `fixed inset-0` pattern (RebrandMenu, SwapLayoutPicker,
// ExportPreflightModal, VersionHistoryDrawer, PptxPreviewModal, …).
//
// shadcn/Radix dialogs already handle these behaviors, but the modals above
// pre-date that adoption; rather than rewrite each surface, this hook adds:
//   • Escape closes the modal
//   • Focus is trapped inside the container while open (Tab / Shift+Tab cycle)
//   • Initial focus lands on the container (or the first focusable child)
//   • Focus returns to the element that had focus before open — usually the
//     triggering button — when close is signalled
//
// Usage:
//   const ref = useRef<HTMLDivElement>(null);
//   useModalA11y({ open, onClose, containerRef: ref });
//   return open ? (
//     <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="…" tabIndex={-1}>…</div>
//   ) : null;

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
}

export function useModalA11y({
  open,
  onClose,
  containerRef,
  closeOnEscape = true,
  trapFocus = true,
  autoFocus = true,
}: {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const previousActive = document.activeElement as HTMLElement | null;

    // Initial focus: prefer the first focusable child so Tab flows naturally;
    // otherwise focus the container itself (needs tabIndex={-1}). The screen
    // reader announces role="dialog" + aria-labelledby on focus.
    if (autoFocus && container) {
      const first = focusableWithin(container)[0];
      (first ?? container).focus({ preventScroll: true });
    }

    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (!trapFocus || e.key !== "Tab" || !container) return;
      const items = focusableWithin(container);
      if (items.length === 0) {
        // No interactive children — keep focus on the container.
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Restore focus to whatever triggered the open (typically the button).
      // Guard against the previous element being detached from the DOM.
      if (previousActive && document.contains(previousActive)) {
        previousActive.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, containerRef, closeOnEscape, trapFocus, autoFocus]);
}
