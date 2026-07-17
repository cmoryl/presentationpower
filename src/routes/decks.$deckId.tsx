import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { DeckChat } from "@/components/DeckChat";
import { IconPicker } from "@/components/IconPicker";
import { SaveToCloudButton } from "@/components/CloudDeckControls";
import { useDeckStore, type DeckClientLogo } from "@/lib/deck-store";
import { listClientLogos, type ClientLogoRow } from "@/lib/client-logos.functions";

import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { runQa, blockingIssues, warningIssues, expandPath, readPath } from "@/lib/qa";

import {
  BRAND_MODES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  LAYOUT_FRAMEWORKS,
  byId,
  variantsForSection,
  relatedVariants,
} from "@/lib/taxonomy";




export const Route = createFileRoute("/decks/$deckId")({
  head: ({ params }) => ({
    meta: [{ title: `Deck ${params.deckId} · TransPerfect Modular` }],
  }),
  component: DeckEditor,
});

function DeckEditor() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const updateField = useDeckStore((s) => s.updateSlideField);
  const swapVariant = useDeckStore((s) => s.swapVariant);
  const moveSlide = useDeckStore((s) => s.moveSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);
  const addSlide = useDeckStore((s) => s.addSlide);
  const duplicateSlide = useDeckStore((s) => s.duplicateSlide);
  const revertAiChange = useDeckStore((s) => s.revertAiChange);
  const setDeckClientLogo = useDeckStore((s) => s.setDeckClientLogo);

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (!deck) throw notFound();
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const clamped = Math.min(activeIdx, deck.slides.length - 1);
  const active = deck.slides[clamped];
  const sf = active ? byId(SECTION_FRAMEWORKS, active.sectionId) : undefined;
  const mv = active ? byId(MODULE_VARIANTS, active.variantId) : undefined;
  const lf = active ? byId(LAYOUT_FRAMEWORKS, active.layoutId) : undefined;

  const qa = useMemo(() => runQa(deck.slides, deck.brandModeId), [deck.slides, deck.brandModeId]);
  const clientLogoUrl = deck.clientLogo?.primaryUrl ?? null;


  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0">
          <Link to="/" className="text-xs uppercase tracking-widest text-black/50 hover:text-black">← Dashboard</Link>
          <h1 className="mt-2 truncate text-3xl font-semibold">{deck.title}</h1>
          <div className="mt-1 text-sm text-black/60">
            {deck.slides.length} slides · Brand: {brand.name}
            {qa.length > 0 && (
              <span className="ml-3 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                {qa.length} QA issue{qa.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SaveToCloudButton deckId={deckId} />
          <Link
            to="/decks/$deckId/export"
            params={{ deckId }}
            className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black/30"
          >
            Export
          </Link>
          <Link
            to="/decks/$deckId/present"
            params={{ deckId }}
            className="rounded-full bg-[#0B2A4A] px-4 py-2 text-sm font-medium text-white hover:bg-[#0B2A4A]/90"
          >
            Present ▶
          </Link>

        </div>
      </div>

      <div className="mt-8 grid grid-cols-[260px_1fr_360px] gap-6">
        {/* Overview grid */}
        <div className="space-y-3">
          {deck.slides.map((slide, i) => {
            const variant = byId(MODULE_VARIANTS, slide.variantId);
            const hasIssue = qa.some((q) => q.slideId === slide.id);
            return (
              <div key={slide.id} className="group relative">
                <button
                  onClick={() => setActiveIdx(i)}
                  className={`block w-full overflow-hidden rounded-xl border text-left transition ${
                    i === clamped ? "border-[#0B2A4A] ring-2 ring-[#0B2A4A]/20" : "border-black/10 hover:border-black/30"
                  }`}
                >
                  <div className="aspect-[16/9] bg-white">
                    <ScaledSlide>
                      {variant && <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={i + 1} clientName={brief?.prospect} clientLogoUrl={clientLogoUrl} />}
                    </ScaledSlide>
                  </div>
                  <div className="border-t border-black/10 bg-white px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{String(i + 1).padStart(2, "0")} · {byId(SECTION_FRAMEWORKS, slide.sectionId)?.name}</span>
                      {hasIssue && <span className="text-amber-600">●</span>}
                    </div>
                    <div className="text-black/50">{variant?.name}</div>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <IconBtn title="Move up" onClick={() => moveSlide(deck.id, slide.id, -1)}>▲</IconBtn>
                  <IconBtn title="Move down" onClick={() => moveSlide(deck.id, slide.id, 1)}>▼</IconBtn>
                  <IconBtn title="Duplicate" onClick={() => duplicateSlide(deck.id, slide.id)}>⎘</IconBtn>
                  <IconBtn title="Remove" onClick={() => { if (confirm("Remove this slide?")) removeSlide(deck.id, slide.id); }}>✕</IconBtn>
                </div>
              </div>
            );
          })}

          <AddSlideMenu onAdd={(sectionId) => addSlide(deck.id, sectionId, active?.id)} />
        </div>

        {/* Stage */}
        <div>
          <button
            type="button"
            onClick={() => setZoomed(true)}
            title="Click to view larger"
            aria-label="View slide larger"
            className="group relative block w-full overflow-hidden rounded-2xl border border-black/10 shadow-lg transition hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2A4A]"
          >
            {active && mv && (
              <ScaledSlide>
                <VariantRenderer slide={active} variant={mv} brand={brand} pageNumber={clamped + 1} clientName={brief?.prospect} clientLogoUrl={clientLogoUrl} />
              </ScaledSlide>
            )}
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100">
              ⤢ Enlarge
            </span>
          </button>


          {/* Editable fields */}
          {active && mv && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
              <div className="text-xs uppercase tracking-widest text-black/50">Editable fields</div>
              <div className="mt-4 space-y-4">
                {mv.editableFields.map((path) => (
                  <FieldEditor
                    key={path}
                    path={path}
                    content={active.content}
                    onChange={(concretePath, value) => updateField(deck.id, active.id, concretePath, value)}
                  />
                ))}
              </div>
              {mv.lockedFields.length > 0 && (
                <div className="mt-6 border-t border-black/10 pt-4 text-xs text-black/50">
                  <span className="font-medium text-black/70">Locked by the module:</span>{" "}
                  {mv.lockedFields.join(" · ")}
                </div>
              )}
            </div>
          )}

          {/* AI change log */}
          {active && active.changes.filter((c) => c.accepted).length > 0 && (
            <div className="mt-6 rounded-2xl border border-emerald-300/40 bg-emerald-50/40 p-6">
              <div className="text-xs uppercase tracking-widest text-emerald-900/70">AI changes on this slide</div>
              <ul className="mt-4 space-y-3 text-sm">
                {active.changes.filter((c) => c.accepted).map((c) => (
                  <li key={c.field} className="rounded-lg border border-emerald-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-xs text-black/60">{c.field}</div>
                      <button
                        onClick={() => revertAiChange(deck.id, active.id, c.field)}
                        className="rounded-full border border-black/15 px-2.5 py-0.5 text-xs hover:bg-black/5"
                      >
                        Revert
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-black/50">Before</div>
                        <div className="mt-0.5 whitespace-pre-wrap text-xs text-black/60">
                          {typeof c.before === "string" ? c.before : JSON.stringify(c.before)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-emerald-800/70">After (AI)</div>
                        <div className="mt-0.5 whitespace-pre-wrap text-xs">
                          {typeof c.after === "string" ? c.after : JSON.stringify(c.after)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Inspector */}
        <aside className="space-y-4">
          {qa.length > 0 && (
            <Panel label="QA gates">
              <div className="mb-2 flex gap-3 text-[10px] uppercase tracking-widest">
                <span className="text-red-700">{blockingIssues(qa).length} blocking</span>
                <span className="text-amber-700">{warningIssues(qa).length} warnings</span>
              </div>
              <ul className="space-y-2 text-sm">
                {qa.map((issue, k) => {
                  const idx = deck.slides.findIndex((sl) => sl.id === issue.slideId);
                  const isBlock = issue.severity === "block";
                  return (
                    <li key={k} className={`rounded-lg px-3 py-2 ${isBlock ? "bg-red-50" : "bg-amber-50"}`}>
                      <button
                        onClick={() => setActiveIdx(idx)}
                        className={`text-xs font-medium uppercase tracking-widest hover:underline ${isBlock ? "text-red-900" : "text-amber-900"}`}
                      >
                        {isBlock ? "Block" : "Warn"} · Slide {idx + 1}
                      </button>
                      <div className={`mt-0.5 ${isBlock ? "text-red-900/80" : "text-amber-900/80"}`}>{issue.message}</div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {sf && (
            <Panel label="Section framework">
              <div className="font-mono text-xs text-black/50">{sf.id}</div>
              <div className="mt-1 font-medium">{sf.name}</div>
              <div className="mt-2 text-sm text-black/60">{sf.purpose}</div>
            </Panel>
          )}
          {mv && (
            <Panel label="Module variant">
              <div className="font-mono text-xs text-black/50">{mv.id}</div>
              <div className="mt-1 font-medium">{mv.name}</div>
              <div className="mt-2 text-sm text-black/60">{mv.description}</div>
              {active && (
                <div className="mt-4">
                  <div className="mb-2 text-xs uppercase tracking-widest text-black/50">Swap variant</div>
                  <select
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                    value={mv.id}
                    onChange={(e) => swapVariant(deck.id, active.id, e.target.value)}
                  >
                    {variantsForSection(active.sectionId).map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </Panel>
          )}
          {mv && active && (
            <IconsPanel
              slide={active}
              onChange={(path, value) => updateField(deck.id, active.id, path, value)}
            />
          )}
          {mv && active && (
            <Panel label="Related modules">
              <div className="mb-2 text-xs text-black/50">
                Same family — ranked by shared layouts, section fit, and fallback links.
              </div>
              <ul className="space-y-1.5">
                {relatedVariants(mv.id, active.sectionId, 5).map((rv) => (
                  <li key={rv.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{rv.name}</span>
                    <button
                      type="button"
                      onClick={() => swapVariant(deck.id, active.id, rv.id)}
                      className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-black/40 hover:text-black"
                      title={`Swap to ${rv.id}`}
                    >
                      Swap
                    </button>
                  </li>
                ))}
                {relatedVariants(mv.id, active.sectionId, 1).length === 0 && (
                  <li className="text-sm text-black/50">No sibling variants in this family.</li>
                )}
              </ul>
            </Panel>
          )}

          {lf && (
            <Panel label="Layout framework">
              <div className="font-mono text-xs text-black/50">{lf.id}</div>
              <div className="mt-1 font-medium">{lf.name}</div>
              <div className="mt-2 text-sm text-black/60">{lf.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lf.zones.map((z) => (
                  <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{z}</span>
                ))}
              </div>
            </Panel>
          )}
          {brief && (
            <Panel label="Brief">
              <div className="text-sm">{brief.prospect}</div>
              <div className="mt-1 text-xs text-black/50">{brief.industry} · {brief.audience}</div>
            </Panel>
          )}
          <ClientLogoPanel
            current={deck.clientLogo ?? null}
            onChange={(logo) => setDeckClientLogo(deck.id, logo)}
          />
        </aside>

      </div>
      <DeckChat deck={deck} brief={brief} />
      {zoomed && active && mv && (
        <SlideLightbox
          onClose={() => setZoomed(false)}
          label={`Slide ${clamped + 1} of ${deck.slides.length}`}
          onPrev={clamped > 0 ? () => setActiveIdx(clamped - 1) : undefined}
          onNext={clamped < deck.slides.length - 1 ? () => setActiveIdx(clamped + 1) : undefined}
        >
          <VariantRenderer slide={active} variant={mv} brand={brand} pageNumber={clamped + 1} clientName={brief?.prospect} clientLogoUrl={clientLogoUrl} />
        </SlideLightbox>
      )}
    </AppShell>
  );
}

function IconsPanel({
  slide,
  onChange,
}: {
  slide: { content: Record<string, unknown> };
  onChange: (path: string, value: unknown) => void;
}) {
  const items = Array.isArray(slide.content.items)
    ? (slide.content.items as Array<Record<string, unknown>>)
    : [];
  // Only expose picker when items have a label/title (icons live next to labels).
  const slots = items
    .map((it, i) => {
      const label =
        (typeof it.label === "string" && it.label) ||
        (typeof it.title === "string" && it.title) ||
        "";
      const currentIcon = typeof it.icon === "string" ? it.icon : "";
      return { i, label, currentIcon };
    })
    .filter((s) => s.label);
  if (slots.length === 0) return null;
  return (
    <Panel label="Icons">
      <div className="mb-3 text-xs text-black/50">
        Pick a specific icon for each row, or leave on Auto to match by label.
      </div>
      <ul className="space-y-2">
        {slots.map((slot) => (
          <li key={slot.i} className="flex items-center gap-3">
            <div className="w-5 shrink-0 text-right font-mono text-[10px] text-black/40">
              {String(slot.i + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1 truncate text-sm text-black/80" title={slot.label}>
              {slot.label}
            </div>
            <IconPicker
              value={slot.currentIcon || null}
              autoLabel={slot.label}
              onChange={(name) => onChange(`items[${slot.i}].icon`, name ?? "")}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}


function SlideLightbox({
  children,
  onClose,
  label,
  onPrev,
  onNext,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Slide preview"
    >
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <div className="text-xs uppercase tracking-[0.3em] text-white/70">{label}</div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:border-white/60 hover:text-white"
        >
          Close · Esc
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 pb-6">
        <div
          className="relative w-full max-w-[min(1600px,95vw)]"
          style={{ aspectRatio: "16 / 9" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl bg-white shadow-2xl">
            <ScaledSlide>{children}</ScaledSlide>
          </div>
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-lg text-white hover:bg-black/80"
            >
              ‹
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-lg text-white hover:bg-black/80"
            >
              ›
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] leading-none text-black/70 shadow ring-1 ring-black/10 hover:bg-white"
    >
      {children}
    </button>
  );
}

function AddSlideMenu({ onAdd }: { onAdd: (sectionId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-dashed border-black/20 bg-white/50 p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left text-xs font-medium uppercase tracking-widest text-black/60 hover:text-black"
      >
        + Add slide
      </button>
      {open && (
        <div className="mt-2 max-h-64 space-y-1 overflow-auto">
          {SECTION_FRAMEWORKS.map((sf) => (
            <button
              key={sf.id}
              onClick={() => { onAdd(sf.id); setOpen(false); }}
              className="block w-full rounded-md px-2 py-1 text-left text-xs hover:bg-black/5"
            >
              <span className="font-mono text-black/40">{sf.id}</span>{" "}
              <span>{sf.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="text-xs uppercase tracking-widest text-black/50">{label}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

// Expand editable field patterns like "items[].title" against the current content.

function FieldEditor({
  path,
  content,
  onChange,
}: {
  path: string;
  content: Record<string, unknown>;
  onChange: (concretePath: string, value: unknown) => void;
}) {
  const concretePaths = expandPath(path, content);
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-widest text-black/50">{path}</div>
      <div className="space-y-2">
        {concretePaths.map((cp) => {
          const value = String(readPath(content, cp) ?? "");
          const long = value.length > 80;
          return long ? (
            <textarea
              key={cp}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              rows={3}
              value={value}
              onChange={(e) => onChange(cp, e.target.value)}
            />
          ) : (
            <input
              key={cp}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              value={value}
              onChange={(e) => onChange(cp, e.target.value)}
            />
          );
        })}
      </div>
    </div>
  );
}
