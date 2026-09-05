import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { DEFAULT_STAT_LAYOUT, type StatLayout } from "@/lib/stat-layouts";
import type { StatArrangement } from "@/lib/stat-arrangements";

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

/**
 * The slide's multi-stat arrangement. Separate from `StatLayout` because it is a
 * property of the SET (how figures relate to each other), not of one figure, so
 * modules that lay out several stats read it once and plan their grid from it.
 */
const StatArrangementContext = createContext<StatArrangement>("even");

export function StatArrangementProvider({
  arrangement,
  children,
}: {
  arrangement: StatArrangement;
  children: ReactNode;
}) {
  return (
    <StatArrangementContext.Provider value={arrangement}>{children}</StatArrangementContext.Provider>
  );
}

export function useStatArrangement(): StatArrangement {
  return useContext(StatArrangementContext);
}
