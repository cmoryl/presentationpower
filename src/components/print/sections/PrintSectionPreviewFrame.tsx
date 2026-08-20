// Print section modules render with `cq()` units (cqw against PAGE_W = 816),
// so they MUST sit inside an inline-size container that is exactly one print
// page wide. Rendering them in a bare card made every cqw resolve against the
// viewport, which is why library previews came out oversized and clipped.
//
// This frame renders the section at true page width and scales the whole thing
// down to the available width with a transform, so typography, columns and
// gutters keep their real print proportions. With `sheet` on it also draws the
// paper: page-width white (or ink) stock, real 0.7in side margins, hairline
// page edge and a soft drop shadow — the same "look at the document" framing
// the presentation library uses for slides.
import { useEffect, useRef, useState } from "react";

import { PAGE_W } from "@/components/print/print-primitives";
import {
  PrintDocModeProvider,
  PRINT_ICON_STYLE_DEFAULT,
  type PrintIconStyle,
} from "@/components/print/print-doc-mode";
import { PrintPageProvider } from "@/components/print/print-page-context";
import { pageSideMarginPx, type PrintMarginPreset } from "@/lib/print-page-presets";
import { PrintSectionRenderer } from "./PrintSectionRenderer";
import type { PrintPageSize, PrintSection } from "@/lib/print-assets.types";

export function PrintSectionPreviewFrame({
  section,
  mode = "light",
  accent = "#003FC7",
  /** Page format the section is being laid out on. Drives the margin preset
   *  and the masthead band height. */
  pageSize = "Letter",
  /** Margin ladder for that format. */
  marginPreset = "standard",
  /** Explicit page padding override (px). Defaults to the format's margin. */
  padX,
  maxScale = 1,
  /** Draw the page stock (paper, margins, hairline edge, shadow). */
  sheet = false,
  /** Render icon chips inside the section. Off = typeset document look. */
  icons = true,
  /** Glyph scale / stroke / accent override for the iconography. */
  iconStyle = PRINT_ICON_STYLE_DEFAULT,
}: {
  section: PrintSection;
  mode?: "light" | "dark";
  accent?: string;
  pageSize?: PrintPageSize;
  marginPreset?: PrintMarginPreset;
  padX?: number;
  maxScale?: number;
  sheet?: boolean;
  icons?: boolean;
  iconStyle?: PrintIconStyle;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(0);

  const paper = mode === "dark" ? "#03002C" : "#ffffff";
  const pad = padX ?? pageSideMarginPx(pageSize, "standard", marginPreset);
  const padTop = sheet ? 28 : 0;

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const w = outer.clientWidth;
      if (w > 0) setScale(Math.min(maxScale, w / PAGE_W));
      setHeight(inner.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [maxScale, section, pad, pageSize, marginPreset]);


  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden"
      style={
        sheet
          ? {
              background: paper,
              boxShadow:
                mode === "dark"
                  ? "0 1px 0 rgba(255,255,255,0.10), 0 18px 40px -24px rgba(0,0,0,0.8)"
                  : "0 0 0 1px rgba(3,0,44,0.10), 0 18px 40px -26px rgba(3,0,44,0.35)",
            }
          : undefined
      }
    >
      <div style={{ height: height * scale }}>
        <div
          ref={innerRef}
          className="[container-type:inline-size]"
          style={{
            width: PAGE_W,
            paddingLeft: pad,
            paddingRight: pad,
            paddingTop: padTop,
            paddingBottom: sheet ? 28 : 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            // Publish the page margin so hero mastheads can bleed to the trim
            // and restore the margin for their own copy.
            ["--print-page-pad" as string]: `${pad}px`,
            ["--print-page-pad-top" as string]: `${padTop}px`,
          }}
        >
          <PrintPageProvider size={pageSize} margin={marginPreset}>
            <PrintDocModeProvider icons={icons} iconStyle={iconStyle}>
              <PrintSectionRenderer section={section} mode={mode} accent={accent} />
            </PrintDocModeProvider>
          </PrintPageProvider>
        </div>
      </div>
    </div>
  );
}
