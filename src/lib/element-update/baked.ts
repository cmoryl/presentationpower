import baked from "./library-baked.json";
import type { SourceLayout } from "./registry";

export const SOURCE_BAKE_SIGNATURE = baked.sig;
export const SOURCE_BAKE_FINGERPRINT = baked.fp;
/** Fresh working copy; provenance stays immutable and fit must still be measured locally. */
export function bakedSourceLayout(pieceId: string): SourceLayout | undefined {
  const layout = (baked.pieces as unknown as Record<string, SourceLayout>)[pieceId];
  if (!layout) return undefined;
  const copy = structuredClone(layout);
  copy.modules = copy.modules.map(module => ({ ...module, id: crypto.randomUUID() }));
  return copy;
}
export function bakedTemplateFit(templateKey: string) {
  return (baked.templates as Record<string, { n: number; tight?: number; breaks?: number[]; nat?: number }>)[templateKey];
}