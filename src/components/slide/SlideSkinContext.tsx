import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SLIDE_SKIN, type SlideSkin } from "@/lib/slide-skin";

/**
 * The active slide skin for the surface being rendered. Routes wrap their
 * slide previews in <SlideSkinProvider> with the deck's saved skin; individual
 * renderers can still take an explicit `skin` prop for one-off previews
 * (library thumbnails, swap pickers, side-by-side comparisons).
 */
const SlideSkinContext = createContext<SlideSkin>(DEFAULT_SLIDE_SKIN);

export function useSlideSkin(): SlideSkin {
  return useContext(SlideSkinContext);
}

export function SlideSkinProvider({
  skin,
  children,
}: {
  skin: SlideSkin | undefined | null;
  children: ReactNode;
}) {
  return (
    <SlideSkinContext.Provider value={skin ?? DEFAULT_SLIDE_SKIN}>
      {children}
    </SlideSkinContext.Provider>
  );
}

export { SlideSkinContext };
