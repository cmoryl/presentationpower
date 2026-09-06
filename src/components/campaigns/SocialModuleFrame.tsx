// SocialModuleFrame — renders any print section module inside a social format.
//
// Print modules are authored at page width with `cqw` typography. This frame
// gives them an inline-size container at a *virtual* page width, scales the
// whole block into the format's safe rect, and auto-escalates the relief
// ladder (social-module-fit.ts) until the module fits without overlapping the
// platform chrome or clipping at the trim. The measured fit is reported back so
// the studio can show a health banner and offer an AI refit.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PrintSectionRenderer } from "@/components/print/sections/PrintSectionRenderer";
import { VizSurfaceProvider } from "@/components/slide/VizSurfaceContext";
import { PrintDocModeProvider, PRINT_ICON_STYLE_DEFAULT } from "@/components/print/print-doc-mode";
import { PrintPageProvider } from "@/components/print/print-page-context";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { PrintSection } from "@/lib/print-assets.types";
import { aspectClass, type SocialFormat } from "@/lib/social-formats";
import {
  computeSocialFit,
  nextRelief,
  nextGrowthStep,
  nextAirStep,
  SOCIAL_GROWTH_MAX,
  growthMaxFor,
  airMaxFor,
  reliefFloorFor,
  SOCIAL_GROWTH_STEPS,
  SOCIAL_AIR_MAX,
  SOCIAL_AIR_STEPS,
  reliefAt,
  socialSafeRect,
  type SocialFitRelief,
  type SocialFitResult,
} from "@/lib/social-module-fit";

import { applyReliefToSection } from "@/lib/social-module-layouts";

export type SocialModuleFrameProps = {
  format: SocialFormat;
  section: PrintSection;
  brandId: string;
  mode: "light" | "dark";
  /** Display size of the short edge in CSS px (the frame renders at format px). */
  displayShortEdge?: number;
  /** Pin the relief rung instead of auto-fitting. */
  reliefLevel?: number;
  /** Draw the safe-area / overflow debug overlay. */
  showSafeArea?: boolean;
  /** Report the measured fit (auto-fit result included). */
  onFit?: (fit: SocialFitResult, relief: SocialFitRelief) => void;
  /** Hide the brand lockup (e.g. tiny picker thumbnails). */
  hideLockup?: boolean;
  /** Module density — lets wide banner frames start at a condensed rung. */
  density?: "compact" | "standard" | "tall";
};

function accentFor(brandId: string): string {
  return BRAND_MODES.find((b) => b.id === brandId)?.tokens.accent ?? "#003FC7";
}

export function SocialModuleFrame({
  format,
  section,
  brandId,
  mode,
  displayShortEdge = 320,
  reliefLevel,
  showSafeArea = false,
  onFit,
  hideLockup = false,
  density,
}: SocialModuleFrameProps) {
  const accent = accentFor(brandId);
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
  const short = Math.min(format.width, format.height);
  const displayScale = displayShortEdge / short;
  const safe = useMemo(() => socialSafeRect(format), [format]);

  const measureRef = useRef<HTMLDivElement>(null);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const reliefFloor = reliefFloorFor(format, density);
  const [autoLevel, setAutoLevel] = useState(reliefFloor);
  // Growth index climbs only while the module reads too small, and never past a
  // rung that already overflowed — that ceiling is what keeps the
  // measure/decide/render loop from oscillating.
  const [growthIndex, setGrowthIndex] = useState(0);
  const growthCeiling = useRef(growthMaxFor(format));
  // Air index picks up where growth stops: it pads the module out so its own
  // surfaces reach the safe rect instead of floating in a letterbox.
  const [airIndex, setAirIndex] = useState(0);
  const airCeiling = useRef(airMaxFor(format));
  // STRETCH — last resort for width-proportional modules. Growth and air both
  // scale a module's height with its width, so a module that is intrinsically a
  // thin strip (an inline quote, a credential pill row) still floats in a story
  // frame with every ladder exhausted. Stretching gives the module's own root
  // the full safe height, so its surface paints the frame instead of leaving a
  // dead band. It latches on once and only resets with the frame inputs, which
  // is what keeps the measure -> decide -> render loop from oscillating.
  const [stretched, setStretched] = useState(false);
  const [preStretchFill, setPreStretchFill] = useState<number | null>(null);

  const pinned = typeof reliefLevel === "number";
  const relief = reliefAt(pinned ? (reliefLevel as number) : autoLevel);
  const rendered = useMemo(() => applyReliefToSection(section, relief), [section, relief]);
  const growth = SOCIAL_GROWTH_STEPS[Math.min(growthIndex, growthCeiling.current)];
  const air = SOCIAL_AIR_STEPS[Math.min(airIndex, airCeiling.current)];

  const fit = useMemo(
    () => computeSocialFit({ format, naturalHeight, relief, growth, air }),
    [format, naturalHeight, relief, growth, air],
  );

  // Reset every ladder whenever the inputs change so we always start from the
  // most generous rung — all three are monotonic, so this terminates.
  useEffect(() => {
    if (!pinned) setAutoLevel(reliefFloor);
    setGrowthIndex(0);
    setAirIndex(0);
    growthCeiling.current = growthMaxFor(format);
    airCeiling.current = airMaxFor(format);
    setStretched(false);
    setPreStretchFill(null);
  }, [pinned, section, format, reliefFloor]);

  // Measure the module at the current virtual page width. rAF-coalesced and
  // threshold-damped, the same discipline the print preview frame uses.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    let raf = 0;
    let last = -1;
    const measure = () => {
      raf = 0;
      const h = el.offsetHeight;
      if (Math.abs(h - last) > 0.75) {
        last = h;
        setNaturalHeight(h);
      }
    };
    measure();
    const ro = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [rendered, fit.pageWidth, air]);

  // Auto-escalate relief until the module clears the safe rect; when it clears
  // with room to spare, enlarge, then pad it out so the frame reads full.
  useEffect(() => {
    if (naturalHeight <= 0) return;
    if (!fit.ok) {
      // Air is the newest and cheapest thing to give back.
      if (airIndex > 0) {
        airCeiling.current = Math.min(airCeiling.current, airIndex - 1);
        setAirIndex(airIndex - 1);
        return;
      }
      // Enlarging caused (or failed to fix) the overflow: pin the ceiling below
      // the current rung before touching relief.
      if (growthIndex > 0) {
        growthCeiling.current = Math.min(growthCeiling.current, growthIndex - 1);
        setGrowthIndex(growthIndex - 1);
        return;
      }
      if (pinned) return;
      const next = nextRelief(fit, relief);
      if (next) setAutoLevel(next.level);
      return;
    }
    const grow = nextGrowthStep(fit, growthIndex);
    if (grow !== null && grow <= growthCeiling.current) {
      setGrowthIndex(grow);
      return;
    }
    const growthExhausted =
      growthIndex >= Math.min(SOCIAL_GROWTH_MAX, growthCeiling.current) || grow === null;
    const nextAir = nextAirStep(fit, airIndex, growthExhausted);
    if (nextAir !== null && nextAir <= airCeiling.current) {
      setAirIndex(nextAir);
      return;
    }
    const airExhausted = airIndex >= Math.min(SOCIAL_AIR_MAX, airCeiling.current) || nextAir === null;
    if (!stretched && growthExhausted && airExhausted && fit.fillPct < fit.fillTarget) {
      setPreStretchFill(fit.fillPct);
      setStretched(true);
    }
  }, [pinned, naturalHeight, fit, relief, growthIndex, airIndex, stretched]);

  useEffect(() => {
    if (naturalHeight > 0) onFit?.(fit, relief);
    // onFit is a reporting sink; re-running on identity churn would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, relief, naturalHeight]);

  // The virtual sheet the module lays out on takes the safe rect's proportions,
  // so every "% of page height" measurement in the library (masthead bands,
  // split panels, plate heights) resolves against the social frame instead of
  // against a Letter page.
  //
  // Height must be expressed in the 816px-wide template coordinate system that
  // `cq()` normalises against — not in rendered px — otherwise growth-narrowed
  // pages silently shrink every band back down.
  const framePageHeight = Math.round(816 * (safe.height / safe.width));

  const frameBandPct = useMemo(() => {
    switch (aspectClass(format)) {
      case "landscape-wide":
        return 104;
      case "landscape":
        return 112;
      case "square":
        return 128;
      case "portrait":
        return 126;
      case "portrait-tall":
        return 118;
    }
  }, [format]);

  const ink = mode === "dark" ? "#FFFFFF" : "#03002C";
  const paper = mode === "dark" ? "#03002C" : "#FFFFFF";

  // Center the module inside the safe rect so short modules never leave a
  // lopsided band at one edge.
  const top = safe.top + Math.max(0, (safe.height - fit.renderedHeight) / 2);
  const lockupPad = safe.left * 0.55;

  return (
    <VizSurfaceProvider surface="social">
      <div
        style={{ width: format.width * displayScale, height: format.height * displayScale }}
        className="relative overflow-hidden"
        data-social-fit={fit.ok ? (fit.sparse ? "sparse" : "ok") : "overflow"}
        data-social-fit-format={format.id}
        data-social-fit-fill={Math.round(fit.fillPct * 100)}
        data-social-fit-overflow={Math.round(fit.overflowPct * 100)}
        data-social-fit-relief={relief.level}
        data-social-fit-growth={growth}
        data-social-fit-air={air}
        data-social-fit-stretch={stretched ? "1" : "0"}
        data-social-fit-natural-fill={
          preStretchFill === null ? undefined : Math.round(preStretchFill * 100)
        }

      >

        <div
          style={{
            width: format.width,
            height: format.height,
            transform: `scale(${displayScale})`,
            transformOrigin: "top left",
            background: paper,
            color: ink,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Division aura ground — keeps social frames on-brand without fighting
            the module's own surfaces. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                mode === "dark"
                  ? `radial-gradient(120% 90% at 12% 0%, ${accent}55 0%, transparent 62%), radial-gradient(90% 70% at 100% 100%, ${accent}33 0%, transparent 60%)`
                  : `radial-gradient(120% 90% at 10% 0%, ${accent}1f 0%, transparent 60%), radial-gradient(90% 70% at 100% 100%, ${accent}14 0%, transparent 58%)`,
            }}
          />

          {/* Live module, scaled into the safe rect. */}
          <div
            style={{
              position: "absolute",
              left: safe.left,
              top,
              width: safe.width,
              height: Math.min(fit.renderedHeight, safe.height),
              overflow: "hidden",
            }}
          >
            <div
              ref={measureRef}
              className="[container-type:inline-size]"
              style={{
                width: fit.pageWidth,
                ...(stretched ? { minHeight: safe.height / fit.scale } : null),
                transform: `scale(${fit.scale})`,
                transformOrigin: "top left",
                ["--print-page-pad" as string]: "0px",
                ["--print-page-pad-top" as string]: "0px",
                // Air ladder: multiplies only the module's internal padding so
                // its own plates and surfaces reach the safe rect.
                ["--print-fit-pad" as string]: String(fit.air),
              }}
            >
              {/* The virtual sheet takes the FRAME's aspect, not Letter's. Band
                and masthead heights are a share of page height, so this is what
                makes a photo band fill a square post instead of sitting in a
                letterbox. */}
              <PrintPageProvider
                size="Letter"
                margin="standard"
                heightPx={framePageHeight}
                heroBandPct={frameBandPct}
              >
                <PrintDocModeProvider icons={relief.icons} iconStyle={PRINT_ICON_STYLE_DEFAULT}>
                  <PrintSectionRenderer section={rendered} mode={mode} accent={accent} />
                </PrintDocModeProvider>
              </PrintPageProvider>
            </div>
          </div>

          {!hideLockup && brand ? (
            <div style={{ position: "absolute", left: safe.left, bottom: lockupPad }}>
              <BrandLockup brand={brand} color={ink} size={short >= 1400 ? "sm" : "xs"} />
            </div>
          ) : null}

          {showSafeArea ? (
            <>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: safe.left,
                  top: safe.top,
                  width: safe.width,
                  height: safe.height,
                  outline: `2px dashed ${fit.ok ? "#2563EB" : "#E53D2E"}`,
                  outlineOffset: -1,
                }}
              />
              {!fit.ok ? (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: safe.left,
                    top: safe.top + safe.height,
                    width: safe.width,
                    height: Math.min(fit.overflowPx, format.height - safe.top - safe.height),
                    background: "rgba(229,61,46,0.22)",
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </VizSurfaceProvider>
  );
}
