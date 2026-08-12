import { toast } from "sonner";
import { useDeckStore, type TransitionType } from "@/lib/deck-store";

/**
 * PowerPoint-parity bulk actions for a multi-selection of slides in the deck
 * editor rail. Mirrors the actions PowerPoint exposes on a slide selection:
 * Duplicate, Delete, Hide Slide, Move to Section start/end, apply a transition
 * to the selection, and set the slide theme (light/dark).
 *
 * Every action pushes one labelled history entry, so ⌘/Ctrl+Z reverts the whole
 * bulk operation at once.
 */
const TRANSITIONS: Array<{ id: TransitionType; label: string }> = [
  { id: "none", label: "None" },
  { id: "cut", label: "Cut" },
  { id: "fade", label: "Fade" },
  { id: "push-left", label: "Push left" },
  { id: "push-right", label: "Push right" },
  { id: "zoom", label: "Zoom" },
];

export function BulkSlideActions({
  deckId,
  selectedIds,
  onClear,
}: {
  deckId: string;
  selectedIds: string[];
  onClear: () => void;
}) {
  const slides = useDeckStore((s) => s.decks[deckId]?.slides ?? []);
  const setSlidesHidden = useDeckStore((s) => s.setSlidesHidden);
  const setSlidesMode = useDeckStore((s) => s.setSlidesMode);
  const setSlidesTransition = useDeckStore((s) => s.setSlidesTransition);
  const duplicateSlides = useDeckStore((s) => s.duplicateSlides);
  const removeSlides = useDeckStore((s) => s.removeSlides);
  const moveSlidesTo = useDeckStore((s) => s.moveSlidesTo);

  const n = selectedIds.length;
  if (n === 0) return null;
  const picked = slides.filter((sl) => selectedIds.includes(sl.id));
  const allHidden = picked.length > 0 && picked.every((sl) => sl.hidden);

  const undoToast = (msg: string) =>
    toast.success(msg, {
      action: { label: "Undo", onClick: () => useDeckStore.getState().undo() },
    });

  return (
    <div
      role="toolbar"
      aria-label={`Bulk actions for ${n} selected slides`}
      className="sticky top-2 z-20 space-y-2 rounded-2xl border border-[#003FC7]/25 bg-[#003FC7]/[0.04] p-2.5 text-[11px] shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#003FC7]">{n} selected</span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-2 py-0.5 text-black/50 transition hover:bg-black/[0.06] hover:text-black"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        <BulkBtn
          label="Duplicate"
          onClick={() => {
            duplicateSlides(deckId, selectedIds);
            undoToast(`Duplicated ${n} slide${n === 1 ? "" : "s"}`);
          }}
        />
        <BulkBtn
          label={allHidden ? "Unhide" : "Hide slide"}
          title="PowerPoint “Hide Slide” — kept in the deck, skipped when presenting and on export"
          onClick={() => {
            setSlidesHidden(deckId, selectedIds, !allHidden);
            undoToast(allHidden ? "Slides shown again" : `Hid ${n} slide${n === 1 ? "" : "s"}`);
          }}
        />
        <BulkBtn label="↑ To start" onClick={() => moveSlidesTo(deckId, selectedIds, "start")} />
        <BulkBtn label="↓ To end" onClick={() => moveSlidesTo(deckId, selectedIds, "end")} />
        <BulkBtn label="Light" onClick={() => setSlidesMode(deckId, selectedIds, "light")} />
        <BulkBtn label="Dark" onClick={() => setSlidesMode(deckId, selectedIds, "dark")} />
        <BulkBtn
          label="Delete"
          danger
          onClick={() => {
            if (!confirm(`Remove ${n} selected slide${n === 1 ? "" : "s"}?`)) return;
            removeSlides(deckId, selectedIds);
            onClear();
            undoToast(`Deleted ${n} slide${n === 1 ? "" : "s"}`);
          }}
        />
      </div>

      <label className="flex items-center gap-1.5 text-black/60">
        <span className="shrink-0">Transition</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as TransitionType | "";
            if (!v) return;
            setSlidesTransition(deckId, selectedIds, v === "none" ? null : { type: v });
            e.currentTarget.value = "";
            undoToast(`Applied ${v} to ${n} slide${n === 1 ? "" : "s"}`);
          }}
          className="w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-[11px]"
        >
          <option value="">Apply to selection…</option>
          {TRANSITIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function BulkBtn({
  label,
  onClick,
  danger,
  title,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`rounded-full border px-2.5 py-1 font-medium transition ${
        danger
          ? "border-rose-500/30 bg-white text-rose-600 hover:border-rose-500 hover:bg-rose-50"
          : "border-black/12 bg-white text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
      }`}
    >
      {label}
    </button>
  );
}
