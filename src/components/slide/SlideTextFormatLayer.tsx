// -----------------------------------------------------------------------------
// Applies per-slide typography overrides to the LIVE slide DOM.
//
// Wraps the variant tree in a `display: contents` host (no layout impact) and
// re-runs the applier whenever the overrides or the slide content change. Because
// it lives inside VariantRenderer, the overrides are present on EVERY surface:
// editor preview, present, share, and the offscreen export stage.
// -----------------------------------------------------------------------------

import { useEffect, useRef, type ReactNode } from "react";

import {
  applyTextFormat,
  clearTextFormat,
  hasTextFormats,
  type SlideTextFormats,
} from "@/lib/slide-text-format";

export function SlideTextFormatLayer({
  formats,
  signature,
  children,
}: {
  formats?: SlideTextFormats | null;
  /** Changing this re-applies after the module re-renders. */
  signature?: string;
  children: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const key = JSON.stringify(formats ?? {});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // The host is display:contents, so its element children ARE the slide tree.
    const roots = Array.from(host.children).filter(
      (n): n is HTMLElement => n instanceof HTMLElement,
    );
    const run = () => roots.forEach((r) => applyTextFormat(r, formats ?? null));
    run();
    // Fonts/late layout can change the measured base size; re-run once settled.
    const raf = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(raf);
      roots.forEach((r) => clearTextFormat(r));
    };
  }, [key, signature, formats]);

  if (!hasTextFormats(formats)) return <>{children}</>;

  return (
    <div ref={hostRef} style={{ display: "contents" }} data-slide-text-format-host="">
      {children}
    </div>
  );
}
