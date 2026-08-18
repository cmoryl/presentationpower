/**
 * Shared authoring chrome.
 *
 * One editor language across every authoring surface (slide editor, present,
 * print, export, document):
 *
 *   · EditorPageHeader — deck identity + status, always in the same place.
 *   · AuthoringNav     — one row of destinations, so "where am I / where can I
 *                        go" never has to be re-learned per screen.
 *   · EditorToolbar    — two rows: DECK-level controls on top, SLIDE-level
 *                        controls underneath. Nothing that changes the whole
 *                        deck ever sits next to something that changes one
 *                        slide.
 *   · EditorMenu       — the single dropdown primitive used by both rows
 *                        (focus trap, Escape, edge-aware anchoring).
 *   · InspectorTabs    — one right-hand inspector with tabs instead of a
 *                        20-panel scroll.
 */

import { Link } from "@tanstack/react-router";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// -----------------------------------------------------------------------------
// Page header
// -----------------------------------------------------------------------------

export function EditorPageHeader({
  backTo,
  backLabel = "← Dashboard",
  title,
  meta,
  status,
}: {
  backTo: string;
  backLabel?: string;
  title: string;
  meta?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="min-w-0">
        <Link
          to={backTo}
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/40 transition hover:text-primary"
        >
          {backLabel}
        </Link>
        <h1 className="mt-3 truncate text-[34px] font-semibold leading-tight tracking-tight text-[#03002C]">
          {title}
        </h1>
        {meta ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-black/55">{meta}</div>
        ) : null}
      </div>
      {status ? <div className="flex shrink-0 flex-col items-end gap-2">{status}</div> : null}
    </div>
  );
}

/** Small round separator used between header meta items. */
export function MetaDot() {
  return <span className="h-1 w-1 rounded-full bg-black/20" aria-hidden />;
}

// -----------------------------------------------------------------------------
// Authoring destinations
// -----------------------------------------------------------------------------

export type AuthoringSurface = "edit" | "present" | "print" | "export" | "document";

const SURFACES: Array<{ id: AuthoringSurface; label: string; to: string; hint: string }> = [
  { id: "edit", label: "Edit", to: "/decks/$deckId", hint: "Build and restyle slides" },
  { id: "present", label: "Present", to: "/decks/$deckId/present", hint: "Full-screen run-through" },
  { id: "document", label: "Document", to: "/decks/$deckId/document", hint: "Long-form document view" },
  { id: "print", label: "Print", to: "/decks/$deckId/print", hint: "Printable / PDF layout" },
  { id: "export", label: "Export", to: "/decks/$deckId/export", hint: "PowerPoint and hand-off" },
];

export function AuthoringNav({
  deckId,
  active,
  className,
}: {
  deckId: string;
  active: AuthoringSurface;
  className?: string;
}) {
  return (
    <nav
      aria-label="Deck views"
      className={`inline-flex items-center gap-0.5 rounded-full border border-black/[0.07] bg-white/80 p-1 shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur ${className ?? ""}`}
    >
      {SURFACES.map((s) => {
        const isActive = s.id === active;
        return (
          <Link
            key={s.id}
            to={s.to}
            params={{ deckId }}
            title={s.hint}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              isActive
                ? "bg-[#03002C] text-white shadow-sm"
                : "text-black/50 hover:bg-black/[0.04] hover:text-primary"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

// -----------------------------------------------------------------------------
// Two-row toolbar: deck row + slide row
// -----------------------------------------------------------------------------

export function EditorToolbar({
  deckRow,
  deckRowEnd,
  slideLabel,
  slideRow,
  slideRowEnd,
}: {
  deckRow: ReactNode;
  deckRowEnd?: ReactNode;
  slideLabel?: string;
  slideRow?: ReactNode;
  slideRowEnd?: ReactNode;
}) {
  return (
    <div className="relative z-50 overflow-visible rounded-2xl border border-black/[0.07] bg-white/85 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-16px_rgba(3,0,44,0.12)] backdrop-blur">
      <ToolbarRow scope="Deck" end={deckRowEnd}>
        {deckRow}
      </ToolbarRow>
      {slideRow ? (
        <ToolbarRow
          scope={slideLabel ?? "Slide"}
          end={slideRowEnd}
          className="border-t border-black/[0.06] bg-black/[0.015]"
        >
          {slideRow}
        </ToolbarRow>
      ) : null}
    </div>
  );
}

function ToolbarRow({
  scope,
  children,
  end,
  className,
}: {
  scope: string;
  children: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 px-3 py-2 ${className ?? ""}`}>
      <span className="mr-1 shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/30">
        {scope}
      </span>
      {children}
      {end ? <div className="ml-auto flex items-center gap-1.5">{end}</div> : null}
    </div>
  );
}

/** Vertical hairline between related toolbar clusters. */
export function ToolbarSep() {
  return <span className="mx-0.5 h-5 w-px bg-black/[0.08]" aria-hidden />;
}

// -----------------------------------------------------------------------------
// Menu primitive (dropdown with focus trap + edge-aware anchoring)
// -----------------------------------------------------------------------------

export function EditorMenu({
  label,
  hint,
  badge,
  children,
}: {
  label: string;
  hint?: string;
  badge?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<"left" | "right">("left");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const getFocusable = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("data-focus-skip"));
  }, []);

  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const vw = window.innerWidth;
      setAnchor(rect.left + rect.width / 2 > vw / 2 ? "right" : "left");
    }
    const els = getFocusable();
    if (els.length > 0) els[0]?.focus();
    else panelRef.current?.focus();
  }, [open, getFocusable]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const els = getFocusable();
    if (els.length === 0) {
      setOpen(false);
      if (!e.shiftKey) {
        e.preventDefault();
        triggerRef.current?.focus();
      }
      return;
    }
    const first = els[0];
    const last = els[els.length - 1];
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl === panelRef.current) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative" data-open={open ? "true" : "false"}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
          open
            ? "border-primary bg-primary text-primary-foreground"
            : "border-black/[0.06] bg-white text-black/55 hover:border-primary/40 hover:text-primary"
        }`}
      >
        <span>{label}</span>
        {hint && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal ${open ? "bg-primary-foreground/15 text-primary-foreground/85" : "bg-black/[0.05] text-black/55"}`}
          >
            {hint}
          </span>
        )}
        {badge && (
          <span
            className={`inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${open ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}
          >
            {badge}
          </span>
        )}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`h-2.5 w-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5 L6 7.5 L9 4.5" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="group"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          className={`absolute top-[calc(100%+6px)] z-[60] flex w-max min-w-[220px] max-w-[min(340px,calc(100vw-2rem))] flex-col gap-0.5 rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_12px_30px_-12px_rgba(3,0,44,0.25)] outline-none ${anchor === "right" ? "right-0 left-auto" : "left-0 right-auto"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Labeled row inside an EditorMenu — icon-only controls always get a name.
 *
 * `layout`:
 *  · "inline" (default) — 32px control slot on the left, text to its right.
 *    Correct for icon buttons only.
 *  · "stack" — text first, control on its own full-width line below. Required
 *    for wide controls (segmented toggles, pickers, selects); squeezing those
 *    into the 32px inline slot makes them overflow and collide with the label.
 */
export function EditorMenuRow({
  label,
  hint,
  layout = "inline",
  children,
}: {
  label: string;
  hint?: string;
  layout?: "inline" | "stack";
  children: ReactNode;
}) {
  if (layout === "stack") {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg px-1.5 py-1.5 transition hover:bg-black/[0.04]">
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[12px] font-medium text-black/80">{label}</span>
          {hint && <span className="block text-[10px] leading-snug text-black/45">{hint}</span>}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-black/[0.04]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">{children}</span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12px] font-medium text-black/80">{label}</span>
        {hint && <span className="block truncate text-[10px] text-black/45">{hint}</span>}
      </span>
    </div>
  );
}


// -----------------------------------------------------------------------------
// Inspector tabs — one panel column, grouped instead of endlessly stacked
// -----------------------------------------------------------------------------

export function InspectorSection({
  id,
  label,
  badge,
  children,
}: {
  id: string;
  label: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  // Rendered by InspectorTabs; standalone use just renders the content.
  void id;
  void label;
  void badge;
  return <div className="space-y-4">{children}</div>;
}

type SectionElement = React.ReactElement<React.ComponentProps<typeof InspectorSection>>;

function isSection(node: ReactNode): node is SectionElement {
  return React.isValidElement(node) && node.type === InspectorSection;
}

export function InspectorTabs({
  children,
  onCollapse,
  storageKey,
}: {
  children: ReactNode;
  onCollapse?: () => void;
  storageKey?: string;
}) {
  const sections = useMemo(
    () => React.Children.toArray(children).filter(isSection),
    [children],
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // Remember the last tab per surface so switching slides doesn't reset it.
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setActiveId(saved);
    } catch {
      /* storage blocked */
    }
  }, [storageKey]);

  const current =
    sections.find((s) => s.props.id === activeId) ?? sections[0] ?? null;

  const select = (id: string) => {
    setActiveId(id);
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, id);
    } catch {
      /* storage blocked */
    }
  };

  if (!current) return null;

  return (
    <div className="space-y-3">
      <div className="sticky top-4 z-30 rounded-2xl border border-black/[0.07] bg-white/90 p-1.5 shadow-[0_8px_24px_-18px_rgba(3,0,44,0.25)] backdrop-blur">
        <div className="flex items-center gap-1.5">
          <div
            role="tablist"
            aria-label="Inspector sections"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
          >
            {sections.map((s) => {
              const isActive = s.props.id === current.props.id;
              return (
                <button
                  key={s.props.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => select(s.props.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                    isActive
                      ? "bg-[#03002C] text-white shadow-sm"
                      : "text-black/50 hover:bg-black/[0.04] hover:text-primary"
                  }`}
                >
                  {s.props.label}
                  {s.props.badge}
                </button>
              );
            })}
          </div>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              title="Collapse inspector"
              aria-label="Collapse inspector"
              className="shrink-0 rounded-full border border-black/10 bg-white px-2 py-1 text-[10px] text-black/50 transition hover:text-black"
            >
              ›
            </button>
          ) : null}
        </div>
      </div>
      <div role="tabpanel" aria-label={current.props.label} className="space-y-4">
        {current}
      </div>
    </div>
  );
}
