/**
 * PrintSectionLayoutFrame — applies one of the five section layouts a print
 * module family exposes. The frame owns geometry (columns, rhythm, padding,
 * alignment, surface grammar, header treatment, scale); the module inside it
 * keeps rendering its own content unchanged. Paired with
 * `src/styles/print-section-layouts.css`.
 */
import type { CSSProperties, ReactNode } from "react";

import { sectionGlass, sectionInk, cq } from "./shared";
import {
  printSectionLayoutVars,
  resolvePrintSectionLayout,
  type PrintSectionKind,
  type PrintSectionLayoutId,
} from "@/lib/print-section-layouts";

export function PrintSectionLayoutFrame({
  kind,
  layoutId,
  mode,
  accent,
  children,
}: {
  kind: PrintSectionKind;
  layoutId: PrintSectionLayoutId | undefined;
  mode: "light" | "dark";
  accent: string;
  children: ReactNode;
}) {
  const { tokens } = resolvePrintSectionLayout(kind, layoutId);
  const ink = sectionInk(mode);

  // Print rule: gradients belong to BOXES only. A section layout frame is page
  // furniture, not a card, so it never paints an accent wash behind titles —
  // the modules' own cards/tiles keep the fade-out grammar.
  const surface: CSSProperties =
    tokens.surface === "band"
      ? { background: "transparent", color: ink.strong, border: "none" }
      : {};

  const style: CSSProperties = {
    ...surface,
    ...(printSectionLayoutVars(tokens) as CSSProperties),
    ["--ps-hairline" as string]: ink.hairline,
    padding: tokens.pad > 0 ? cq(tokens.pad) : undefined,
  };


  return (
    <div
      data-ps-frame
      data-ps-kind={kind}
      data-ps-layout={layoutId ?? "layout-standard"}
      data-ps-surface={tokens.surface}
      data-ps-header={tokens.header}
      data-ps-align={tokens.align}
      data-ps-reverse={tokens.reverse ? "1" : "0"}
      style={style}
    >
      {children}
    </div>
  );
}
