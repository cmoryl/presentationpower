import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { listSkinBackdrops, type SkinBackdropRow } from "@/lib/skin-backdrop.functions";
import { skinCodeFromPackId, isSkinPackId } from "@/lib/design-skin-pack";
import type { SkinScene } from "@/lib/skin-backgrounds";

/**
 * AI backdrop library, keyed `SKINCODE:scene:take`.
 *
 * Loaded once per surface and shared through context so every slide on a stage
 * paints its skin's generated imagery without refetching. Absent entries mean
 * the skin falls back to its CSS-composed scene, so nothing regresses.
 */
export type SkinBackdropMap = Record<string, string>;

const SkinBackdropContext = createContext<SkinBackdropMap>({});

export function backdropKey(skinCode: string, scene: string, take = 0): string {
  return `${skinCode}:${scene}:${take}`;
}

export function useSkinBackdropMap(): SkinBackdropMap {
  return useContext(SkinBackdropContext);
}

/** Resolve the generated image for a pack id + scene, if one exists. */
export function useSkinBackdropImage(
  packId: string | null | undefined,
  scene: SkinScene | string | null | undefined,
  take = 0,
): string | null {
  const map = useSkinBackdropMap();
  if (!packId || !isSkinPackId(packId) || !scene) return null;
  const code = skinCodeFromPackId(packId).toUpperCase();
  return (
    map[backdropKey(code, String(scene), take)] ??
    map[backdropKey(code, String(scene), 0)] ??
    map[backdropKey(code, "cover", 0)] ??
    null
  );
}

export function toBackdropMap(rows: SkinBackdropRow[]): SkinBackdropMap {
  const map: SkinBackdropMap = {};
  for (const r of rows) map[backdropKey(r.skinCode, r.scene, r.take)] = r.imageUrl;
  return map;
}

export function SkinBackdropProvider({
  value,
  children,
}: {
  value: SkinBackdropMap;
  children: ReactNode;
}) {
  return <SkinBackdropContext.Provider value={value}>{children}</SkinBackdropContext.Provider>;
}

/** Self-loading provider for surfaces that don't already have the library. */
export function SkinBackdropLibrary({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<SkinBackdropMap>({});
  useEffect(() => {
    let live = true;
    listSkinBackdrops()
      .then((rows) => {
        if (live) setMap(toBackdropMap(rows));
      })
      .catch(() => {
        /* backdrops are additive — never block a surface */
      });
    return () => {
      live = false;
    };
  }, []);
  return <SkinBackdropProvider value={map}>{children}</SkinBackdropProvider>;
}

export { SkinBackdropContext };
