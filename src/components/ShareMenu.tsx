import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Share2, Play, Printer, FileDown, ChevronDown } from "lucide-react";
import { useDeckStore } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { BRAND_MODES, byId } from "@/lib/taxonomy";

export function ShareMenu({ deckId }: { deckId: string }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!deck) return null;
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const stamp = (kind: "pptx" | "pdf" | "present") =>
    setDeckContext(deckId, { lastExportedAt: new Date().toISOString(), lastExportKind: kind });

  const onPresent = () => {
    stamp("present");
    setOpen(false);
    navigate({ to: "/decks/$deckId/present", params: { deckId } });
  };
  const onPrint = () => {
    stamp("pdf");
    setOpen(false);
    // Open the print route in a new tab; user triggers browser print.
    window.open(`/decks/${deckId}/print`, "_blank", "noopener,noreferrer");
  };
  const onPptx = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportDeckToPptx(deck, brand, { strategy: deck.context?.strategy ?? null });
      stamp("pptx");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 py-2 text-sm font-medium text-black backdrop-blur hover:border-black/30 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/30"
      >
        <Share2 size={14} />
        Share
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#07061F]/95">
          <div className="border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
            <div className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Share &amp; export</div>
            <div className="mt-0.5 truncate text-sm font-medium text-black dark:text-white">{deck.title}</div>
          </div>
          <ShareItem
            icon={<Play size={16} />}
            title="Present"
            hint="Fullscreen, keyboard nav"
            onClick={onPresent}
          />
          <ShareItem
            icon={<Printer size={16} />}
            title="Export PDF"
            hint="Print → Save as PDF"
            onClick={onPrint}
          />
          <ShareItem
            icon={<FileDown size={16} />}
            title={busy ? "Preparing…" : "Export PowerPoint"}
            hint="Native .pptx with brand logo"
            onClick={onPptx}
            disabled={busy}
          />
          <div className="border-t border-black/[0.06] px-4 py-2 text-[10px] text-black/50 dark:border-white/10 dark:text-white/50">
            <Link to="/decks/$deckId/export" params={{ deckId }} className="hover:text-black dark:hover:text-white">
              Advanced export &amp; QA →
            </Link>
            {deck.context?.lastExportedAt && (
              <div className="mt-1">
                Last {deck.context.lastExportKind ?? "export"}:{" "}
                {new Date(deck.context.lastExportedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareItem({
  icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-black/[0.03] disabled:opacity-50 dark:hover:bg-white/[0.05]"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-black dark:text-white">{title}</span>
        <span className="block text-[11px] text-black/50 dark:text-white/50">{hint}</span>
      </span>
    </button>
  );
}
