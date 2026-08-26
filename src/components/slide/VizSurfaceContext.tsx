// Which surface a chart is being drawn on, so the visualisation engine can
// apply the right budgets: a deck slide, a press sheet, or a social post.
//
// The same MV-VIZ-* modules render in all three places. Print needs vector
// export and greyscale-safe separation; social needs a headline and very short
// labels. Without this signal every chart was audited and repaired as if it
// were a 16:9 slide.

import * as React from "react";
import type { VizSurface } from "@/lib/infographics/audit";

const VizSurfaceContext = React.createContext<VizSurface>("presentation");

export function VizSurfaceProvider({
  surface,
  children,
}: {
  surface: VizSurface;
  children: React.ReactNode;
}) {
  return <VizSurfaceContext.Provider value={surface}>{children}</VizSurfaceContext.Provider>;
}

export function useVizSurface(): VizSurface {
  return React.useContext(VizSurfaceContext);
}
