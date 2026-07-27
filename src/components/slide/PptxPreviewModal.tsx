// "Preview in PowerPoint" validation modal.
//
// Runs the exact same background-planning pipeline used by pptx-export.ts
// (planPptxBackground / imageBackgroundSizing / scrimRectSpec) and paints a
// side-by-side comparison so authors can confirm that scrim opacity,
// crop/fit, zoom/offset, and any overlays will render faithfully in a real
// .pptx file. A "Download test .pptx" button emits a single-slide deck for
// the user to open in PowerPoint to sanity-check the round-trip.

import { useEffect, useMemo, useRef, useState } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import type { Deck, DeckSlide } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";
import {
  planPptxBackground,
  scrimRectSpec,
  imageBackgroundSizing,
  type PptxBackgroundPlan,
} from "@/lib/pptx-background";
import { resolveSlideBackground } from "@/lib/background-library";
import { variantSupportsImagery } from "@/lib/variant-media";


// Preview canvas is 640×360 (16:9). PPTX slide is 13.333"×7.5". Everything we
// draw uses a single px/inch scale so scrim positions and image sizing are
// visually identical to what pptxgenjs will emit.
const PREVIEW_W = 640;
const PREVIEW_H = 360;
const SLIDE_W_IN = 13.333;
const SLIDE_H_IN = 7.5;
const PX_PER_IN = PREVIEW_W / SLIDE_W_IN;

type Check = {
  level: "pass" | "warn" | "fail";
  label: string;
  detail?: string;
  fix?: { label: string; patch: Record<string, unknown> };
};

export function PptxPreviewModal({
  deck,
  slide,
  brand,
  open,
  onClose,
  onApplyBackground,
}: {
  deck: Deck;
  slide: DeckSlide;
  brand: BrandMode;
  open: boolean;
  onClose: () => void;
  onApplyBackground?: (next: Record<string, unknown>) => void;
}) {
  const [plan, setPlan] = useState<PptxBackgroundPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedFix, setAppliedFix] = useState<string | null>(null);

  const content = slide.content as Record<string, unknown>;
  const bg = useMemo(() => resolveSlideBackground(content.background), [content.background]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    planPptxBackground(content.background)
      .then((p) => {
        if (!cancelled) setPlan(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to plan background");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, content.background]);

  // Clear applied-fix banner shortly after the plan re-computes.
  useEffect(() => {
    if (!appliedFix) return;
    const t = setTimeout(() => setAppliedFix(null), 2200);
    return () => clearTimeout(t);
  }, [appliedFix, plan]);

  const checks: Check[] = useMemo(() => buildChecks(slide, bg, plan), [slide, bg, plan]);

  async function handleDownload() {
    setExporting(true);
    try {
      const singleDeck: Deck = {
        ...deck,
        title: `${deck.title} — Preview slide ${slide.position + 1}`,
        slides: [{ ...slide, position: 0 }],
      };
      const { exportDeckToPptx } = await import("@/lib/pptx-export");
      await exportDeckToPptx(singleDeck, brand);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose, containerRef: dialogRef });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pptx-preview-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-[1080px] overflow-y-auto rounded-2xl border border-white/15 bg-white text-black shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-6 border-b border-black/10 px-6 py-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-black/50">
              Preview in PowerPoint
            </div>
            <h2 id="pptx-preview-title" className="mt-1 text-xl font-semibold">
              Slide {String(slide.position + 1).padStart(2, "0")} — .pptx fidelity check
            </h2>
            <p className="mt-1 text-sm text-black/60">
              This is exactly what pptxgenjs will emit for this slide's background, scrim, and image
              positioning. If the right panel looks wrong, PowerPoint will show it that way too.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-black/5"
          >
            Close
          </button>
        </header>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          <section>
            <div className="mb-2 text-[11px] uppercase tracking-widest text-black/50">
              PowerPoint reconstruction
            </div>
            <div
              className="relative overflow-hidden rounded-xl border border-black/10 bg-white"
              style={{ width: PREVIEW_W, height: PREVIEW_H, maxWidth: "100%" }}
            >
              <PptxFidelityCanvas plan={plan} />
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs uppercase tracking-widest text-black/60">
                  Rasterizing…
                </div>
              )}
            </div>
            <div className="mt-2 text-[11px] text-black/50">
              Native fill + rasterized layer + scrim rectangle(s), 1:1 with the PPTX pipeline.
            </div>
          </section>

          <section>
            <div className="mb-2 text-[11px] uppercase tracking-widest text-black/50">
              Validation
            </div>
            <ul className="space-y-2">
              {checks.map((c, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                    c.level === "pass"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : c.level === "warn"
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-red-200 bg-red-50/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      c.level === "pass"
                        ? "bg-emerald-500"
                        : c.level === "warn"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{c.label}</div>
                    {c.detail && <div className="text-xs text-black/60">{c.detail}</div>}
                    {c.fix && onApplyBackground && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyBackground(c.fix!.patch);
                          setAppliedFix(c.fix!.label);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-black/20 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-black/80 hover:border-[#003FC7] hover:text-[#003FC7]"
                      >
                        <span aria-hidden>✨</span>
                        {c.fix.label}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {appliedFix && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Applied: {appliedFix}. Re-running validation…
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                {error}
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-black/[0.02] px-6 py-4">
          <div className="text-[11px] text-black/50">
            Open the downloaded file in PowerPoint to confirm scrim, crop, and overlays match the
            reconstruction above.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/15 px-4 py-2 text-xs uppercase tracking-widest hover:bg-black/5"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={exporting}
              className="rounded-full bg-[#003FC7] px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-[#03002C] disabled:opacity-40"
            >
              {exporting ? "Preparing…" : "Download test .pptx"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** Paints the exact layers pptx-export will emit, at 1:1 slide-inch scale. */
function PptxFidelityCanvas({ plan }: { plan: PptxBackgroundPlan | null }) {
  if (!plan || plan.kind === "none") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white text-[11px] uppercase tracking-widest text-black/40">
        Native white fill (no background set)
      </div>
    );
  }
  if (plan.kind === "solid") {
    return <div className="h-full w-full" style={{ background: `#${plan.color}` }} />;
  }
  // Image plan — mirror imageBackgroundSizing math against preview px.
  const sz = imageBackgroundSizing(plan, SLIDE_W_IN, SLIDE_H_IN);
  const rects = scrimRectSpec(plan, SLIDE_W_IN, SLIDE_H_IN);
  return (
    <div className="relative h-full w-full" style={{ background: `#${plan.solidFallback}` }}>
      <img
        src={plan.data}
        alt=""
        style={{
          position: "absolute",
          left: sz.x * PX_PER_IN,
          top: sz.y * PX_PER_IN,
          width: sz.w * PX_PER_IN,
          height: sz.h * PX_PER_IN,
          objectFit: sz.fit,
          objectPosition: "center",
        }}
      />
      {rects.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (r.x / SLIDE_W_IN) * PREVIEW_W,
            top: (r.y / SLIDE_H_IN) * PREVIEW_H,
            width: (r.w / SLIDE_W_IN) * PREVIEW_W,
            height: (r.h / SLIDE_H_IN) * PREVIEW_H,
            background: `#${r.color}`,
            opacity: 1 - r.transparency / 100,
          }}
        />
      ))}
    </div>
  );
}

function buildChecks(
  slide: DeckSlide,
  bg: ReturnType<typeof resolveSlideBackground>,
  plan: PptxBackgroundPlan | null,
): Check[] {
  const out: Check[] = [];

  const base = (bg ?? {}) as Record<string, unknown>;
  const merge = (p: Record<string, unknown>) => ({ ...base, ...p });

  // 1. Background mapping
  if (!bg) {
    out.push({
      level: "warn",
      label: "No background configured",
      detail: "PowerPoint will emit a plain white fill for this slide.",
      fix: {
        label: "Apply Navy Aurora preset",
        patch: {
          kind: "library",
          presetId: "bg-navy-aurora",
          solid: "#03002C",
          css: "radial-gradient(130% 90% at 12% 8%, #003FC755 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, #A1FBF922 0%, transparent 60%), linear-gradient(180deg, #03002C 0%, #05003C 100%)",
          darkChrome: true,
        },
      },
    });
  } else if (!plan) {
    out.push({ level: "warn", label: "Background plan pending…" });
  } else if (plan.kind === "solid") {
    out.push({
      level: "pass",
      label: "Native solid fill",
      detail: `PPTX slide.background = #${plan.color}`,
    });
  } else if (plan.kind === "image") {
    out.push({
      level: "pass",
      label: "Rasterized background embedded",
      detail: `Fit ${plan.fit ?? "cover"} · zoom ${(plan.zoom ?? 1).toFixed(2)}× · offset (${plan.offsetX ?? 0}, ${plan.offsetY ?? 0})`,
    });
  } else {
    out.push({
      level: "fail",
      label: "Background could not be planned",
      detail: "Falling back to solid color — check CSS or image URL.",
      fix: {
        label: "Use safe solid fill (#03002C)",
        patch: merge({ kind: "color", color: "#03002C", solid: "#03002C", darkChrome: true }),
      },
    });
  }

  // 2. Scrim / opacity
  if (bg && (bg.kind === "upload" || bg.kind === "ai")) {
    const strength = bg.scrimStrength ?? 0.55;
    if (plan?.kind === "image") {
      const rects = scrimRectSpec(plan, SLIDE_W_IN, SLIDE_H_IN);
      if (rects.length === 0) {
        out.push({
          level: "warn",
          label: "No scrim will render",
          detail: "Text over the image may be hard to read.",
          fix: {
            label: "Add bottom scrim @ 55%",
            patch: merge({ scrim: "bottom", scrimStrength: 0.55 }),
          },
        });
      } else if (strength < 0.25) {
        out.push({
          level: "warn",
          label: `Scrim faint (${Math.round(strength * 100)}%)`,
          detail: "Copy on top of the image may lack contrast in PowerPoint.",
          fix: {
            label: "Boost scrim to 55%",
            patch: merge({ scrimStrength: 0.55 }),
          },
        });
      } else {
        const primary = rects[0];
        out.push({
          level: "pass",
          label: `Scrim: ${bg.scrim ?? "bottom"} @ ${Math.round(strength * 100)}%`,
          detail: `Emits ${rects.length} rect(s) at ${primary.transparency}% PPTX transparency (opacity ${(1 - primary.transparency / 100).toFixed(2)}).`,
        });
      }
    }
  }

  // 3. Crop / fit / zoom / offset explicit
  if (bg && (bg.kind === "upload" || bg.kind === "ai")) {
    const zoomed = (bg.zoom ?? 1) !== 1;
    const offset = (bg.offsetX ?? 0) !== 0 || (bg.offsetY ?? 0) !== 0;
    if (bg.fit === "contain") {
      out.push({
        level: "warn",
        label: "Fit = contain",
        detail: "PPTX will letterbox the image; edges will show the fallback color.",
        fix: {
          label: "Switch to cover (full-bleed)",
          patch: merge({ fit: "cover" }),
        },
      });
    } else if (zoomed || offset) {
      out.push({
        level: "pass",
        label: "Crop / pan preserved",
        detail: `Zoom ${(bg.zoom ?? 1).toFixed(2)}× · pan (${bg.offsetX ?? 0}, ${bg.offsetY ?? 0}) applied via sized addImage.`,
      });
    } else {
      out.push({
        level: "pass",
        label: "Cover fit, centered",
        detail: "Full-bleed cover — matches CSS object-fit: cover.",
      });
    }
  }

  // 4. Overlay chrome awareness
  const advancedDark = slide.variantId === "MV-COUNTDOWN";
  const bgIsImage = plan?.kind === "image";
  const kind =
    slide.variantId.startsWith("MV-COVER") || slide.variantId === "MV-COVER"
      ? "cover"
      : slide.variantId.startsWith("MV-DIVIDER")
        ? "divider"
        : "other";
  const isDark = advancedDark || kind === "cover" || kind === "divider" || bgIsImage;
  const chromeMismatch = bg && typeof bg.darkChrome === "boolean" && bg.darkChrome !== isDark;
  if (chromeMismatch) {
    out.push({
      level: "warn",
      label: "Overlay chrome mismatch",
      detail: `Background is marked ${bg!.darkChrome ? "dark" : "light"} but rendering expects ${isDark ? "light chrome (dark bg)" : "dark chrome (light bg)"}.`,
      fix: {
        label: `Flip chrome to ${isDark ? "dark bg / light chrome" : "light bg / dark chrome"}`,
        patch: merge({ darkChrome: isDark }),
      },
    });
  } else {
    out.push({
      level: "pass",
      label: isDark ? "Overlays will use light chrome" : "Overlays will use dark chrome",
      detail: isDark
        ? "White logo + light text on dark/photo background."
        : "Color logo + dark text on light background.",
    });
  }

  // 5. Slide-level imagery (mediaUrl / mediaSeed)
  const c = slide.content as Record<string, unknown>;
  const hasMedia =
    (typeof c.mediaUrl === "string" && c.mediaUrl.length > 0) ||
    (typeof c.mediaSeed === "string" && c.mediaSeed.length > 0);
  if (hasMedia) {
    if (variantSupportsImagery(slide.variantId)) {
      out.push({
        level: "pass",
        label: "Slide imagery will embed",
        detail: "mediaUrl / mediaSeed resolved for this variant.",
      });
    } else {
      out.push({
        level: "warn",
        label: "Slide imagery will be skipped",
        detail: "Variant does not render slide-level imagery; only the background will show.",
      });
    }
  }

  return out;
}
