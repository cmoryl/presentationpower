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

  const surface: CSSProperties =
    tokens.surface === "card"
      ? sectionGlass(mode, accent)
      : tokens.surface === "band"
        ? {
            backgroundImage: `linear-gradient(96deg, ${mode === "dark" ? "#03002C" : "#03002C"} 0%, ${accent} 100%)`,
            color: "#FFFFFF",
            border: "none",
          }
        : tokens.surface === "open"
          ? sectionGlass(mode, accent, { intensity: 0.7 })
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
