/**
 * AnchoredPanel — a viewport-fixed popover rendered in a portal.
 *
 * Authoring chrome popovers (Distribute menu, Share & export) used to be
 * `position: absolute` inside scrolling toolbars and inside each other, so they
 * were clipped by ancestor overflow and could not be interacted with. Portalling
 * to <body> with fixed coordinates keeps them fully on screen and clickable.
 */

import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Align = "start" | "end";

export function useAnchoredPosition(
  anchorEl: HTMLElement | null,
  open: boolean,
  opts: { align?: Align; width?: number; gap?: number } = {},
) {
  const { align = "start", width = 320, gap = 6 } = opts;
  const [style, setStyle] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0,
    left: 0,
    maxHeight: 560,
  });

  const measure = useCallback(() => {
    if (!anchorEl || typeof window === "undefined") return;
    const r = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const w = Math.min(width, vw - margin * 2);
    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(margin, Math.min(left, vw - w - margin));
    const below = vh - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    const openUp = below < 220 && above > below;
    const maxHeight = Math.max(180, Math.min(560, openUp ? above : below));
    const top = openUp ? Math.max(margin, r.top - gap - maxHeight) : r.bottom + gap;
    setStyle({ top, left, maxHeight });
  }, [anchorEl, align, width, gap]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, measure]);

  const width_ =
    typeof window === "undefined" ? width : Math.min(width, window.innerWidth - 24);

  return { ...style, width: width_ };
}

export function AnchoredPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
