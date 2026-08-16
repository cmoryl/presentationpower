// -----------------------------------------------------------------------------
// BACKDROP LIGHTBOX — click-to-view-larger for backdrop imagery.
//
// Shows one backdrop at full 16:9 stage scale so an admin can judge grain,
// crop and reading-zone clearance before switching it into a template section.
// -----------------------------------------------------------------------------

import { useEffect } from "react";

export type BackdropShot = {
  /** Large/original URL to display. */
  url: string;
  /** Stable URL written into the override when "Use this backdrop" is clicked. */
  pickUrl?: string;
  label?: string;
};

export function BackdropLightbox({
  shot,
  onClose,
  onUse,
}: {
  shot: BackdropShot | null;
  onClose: () => void;
  onUse?: (url: string) => void;
}) {
  useEffect(() => {
    if (!shot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shot, onClose]);

  if (!shot) return null;
  const pickUrl = shot.pickUrl ?? shot.url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={shot.label ? `Backdrop preview — ${shot.label}` : "Backdrop preview"}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03002C]/85 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-2 text-white">
          <p className="truncate text-sm font-medium">{shot.label ?? "Backdrop"}</p>
          <div className="flex items-center gap-2">
            {onUse && (
              <button
                type="button"
                onClick={() => {
                  onUse(pickUrl);
                  onClose();
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#03002C]"
              >
                Use this backdrop
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-full border border-white/30 px-3 py-1.5 text-xs text-white"
            >
              Close
            </button>
          </div>
        </div>
        <img
          src={shot.url}
          alt={shot.label ?? "Backdrop preview"}
          className="aspect-[16/9] w-full rounded-2xl border border-white/20 object-cover shadow-2xl"
        />
      </div>
    </div>
  );
}
