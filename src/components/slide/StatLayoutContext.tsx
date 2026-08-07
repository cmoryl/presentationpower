import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { DEFAULT_STAT_LAYOUT, type StatLayout } from "@/lib/stat-layouts";

/**
 * The active per-module stat typography layout. `VariantRenderer` provides the
 * resolved layout for the slide's module so every `StatFigure` inside picks up
 * an intentional treatment without each variant threading a `shape` prop.
 * An explicit `shape` prop on a figure still wins.
 */
const StatLayoutContext = createContext<StatLayout>(DEFAULT_STAT_LAYOUT);

export function StatLayoutProvider({
  layout,
  children,
}: {
  layout: StatLayout;
  children: ReactNode;
}) {
  return <StatLayoutContext.Provider value={layout}>{children}</StatLayoutContext.Provider>;
}

export function useStatLayout(): StatLayout {
  return useContext(StatLayoutContext);
}
