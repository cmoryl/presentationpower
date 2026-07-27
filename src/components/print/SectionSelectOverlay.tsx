// Click-to-select overlay that scans the print canvas for elements marked
// with `data-section` and lets the user delete the section or scroll to its
// inspector panel. Rendered ABOVE LiveEditOverlay's text-editing overlays,
// but stops propagation on its own controls so text editing still works.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Trash2, Replace, X } from "lucide-react";

export type SectionAction = "delete" | "replace";

type Rect = { top: number; left: number; width: number; height: number };

type Section = {
  key: string;
  label: string;
  rect: Rect;
};

type Props = {
  canvasRef: React.RefObject<HTMLElement | null>;
  /** Called when the user hits delete on a section. */
  onDelete: (sectionKey: string) => void;
  /** Called when the user hits replace on a section. */
  onReplace?: (sectionKey: string) => void;
  /** Optional dependency list — re-scan when any of these change. */
  scanKey?: unknown;
};

export function SectionSelectOverlay({ canvasRef, onDelete, onReplace, scanKey }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const rescan = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const nodes = Array.from(canvas.querySelectorAll<HTMLElement>("[data-section]"));
    const next: Section[] = nodes.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        key: el.dataset.section ?? "",
        label: el.dataset.sectionLabel ?? el.dataset.section ?? "Section",
        rect: {
          top: r.top - canvasRect.top,
          left: r.left - canvasRect.left,
          width: r.width,
          height: r.height,
        },
      };
    });
    setSections(next);
  }, [canvasRef]);

  useLayoutEffect(() => {
    rescan();
  }, [rescan, scanKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(rescan);
    });
    ro.observe(canvas);
    canvas.querySelectorAll("[data-section]").forEach((el) => ro.observe(el));
    const onScroll = () => rescan();
    window.addEventListener("resize", onScroll);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, rescan, scanKey]);

  const active = useMemo(
    () => sections.find((s) => s.key === selectedKey) ?? null,
    [sections, selectedKey],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {sections.map((s) => {
        const isActive = s.key === selectedKey;
        const isHover = s.key === hoverKey;
        return (
          <button
            key={s.key}
            type="button"
            className="pointer-events-auto absolute cursor-pointer transition-colors"
            style={{
              top: s.rect.top,
              left: s.rect.left,
              width: s.rect.width,
              height: s.rect.height,
              background: isActive ? "rgba(0,63,199,0.06)" : "transparent",
              border: isActive
                ? "2px solid #003FC7"
                : isHover
                ? "2px dashed rgba(0,63,199,0.55)"
                : "2px dashed transparent",
              borderRadius: 10,
            }}
            onMouseEnter={() => setHoverKey(s.key)}
            onMouseLeave={() => setHoverKey((h) => (h === s.key ? null : h))}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedKey((k) => (k === s.key ? null : s.key));
            }}
            aria-label={`Select ${s.label} section`}
          >
            {(isHover || isActive) && (
              <span
                className="absolute left-1 top-1 rounded-md bg-[#003FC7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow"
                style={{ pointerEvents: "none" }}
              >
                {s.label}
              </span>
            )}
          </button>
        );
      })}

      {active && (
        <div
          className="pointer-events-auto absolute flex items-center gap-1 rounded-xl border border-black/10 bg-white px-1.5 py-1 shadow-lg dark:border-white/10 dark:bg-[#0B0A2A]"
          style={{
            top: Math.max(4, active.rect.top - 40),
            left: active.rect.left + active.rect.width - 240,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">
            {active.label}
          </span>
          {onReplace && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#003FC7] hover:bg-[#003FC7]/10"
              onClick={() => {
                onReplace(active.key);
              }}
            >
              <Replace size={12} /> Replace
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-500/10"
            onClick={() => {
              onDelete(active.key);
              setSelectedKey(null);
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-icon-subtle hover:bg-black/5"
            onClick={() => setSelectedKey(null)}
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
