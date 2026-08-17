// -----------------------------------------------------------------------------
// Deck look preset picker — switch a whole deck onto any approved style
// template (S01–S28 + built-in packs) from inside the deck editor's
// "Look & feel" menu. Writes deck.context.stylePackId, which every preview,
// print and export surface resolves through `stylePackById`.
// -----------------------------------------------------------------------------
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { StyleLookPicker } from "@/components/skins/StyleLookPicker";
import { stylePackById } from "@/lib/style-packs";
import { useDeckStore } from "@/lib/deck-store";

export function DeckLookPresetPicker({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  const deck = useDeckStore((s) => s.decks[deckId]);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  if (!deck) return null;

  const current = deck.context?.stylePackId ?? null;
  const pack = current ? stylePackById(current) : null;
  const intent = [deck.title, deck.context?.industry, deck.context?.subCompany]
    .filter(Boolean)
    .join(" ");

  const apply = (packId: string | null) => {
    setDeckContext(deckId, { stylePackId: packId });
    const label = packId ? (stylePackById(packId)?.label ?? packId) : "Approved brand system";
    toast.success(`${label} applied`, {
      description: `All ${deck.slides.length} slide${deck.slides.length === 1 ? "" : "s"} now use this template.`,
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-black/15 bg-white px-3 py-1 text-[11px] font-medium text-[#03002C] transition hover:bg-black/[0.04]"
        >
          {pack ? `Template · ${pack.label}` : "Choose preset template…"}
        </button>
        {current && (
          <button
            type="button"
            onClick={() => apply(null)}
            className="text-[11px] text-black/45 underline underline-offset-2 hover:text-black"
          >
            Reset
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a preset template"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#03002C]">Preset templates</h2>
                <p className="mt-0.5 text-xs text-black/55">
                  Every approved visual language. Picking one restyles all {deck.slides.length}{" "}
                  slides — content, layouts and speaker notes stay exactly as they are.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close preset templates"
                className="rounded-full p-1.5 text-black/45 transition hover:bg-black/5 hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <StyleLookPicker
                value={current}
                intent={intent}
                onChange={(packId) => {
                  apply(packId);
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
