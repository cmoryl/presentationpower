// Scene photograph backgrounds offered in the sign editor's Background
// section, per layout. Each scene is a full-bleed JPEG in public/downloads,
// designed with a calm centre so live pieces (badge, headline, QR) stay
// readable on top. RGB only; CMYK stays opt-in per the print contract.

export type SignScene = { id: string; label: string; src: string };

const SJB = "/downloads/sjb-flyer";

/** San Juan Bowl game flyer scenes (8.5 × 11 in portrait, calm centre). */
export const SJB_FLYER_SCENES: SignScene[] = [
  { id: "collage", label: "Torn-paper collage", src: `${SJB}/bg-collage.jpg` },
  { id: "stadium-night", label: "Stadium night", src: `${SJB}/bg-stadium-night.jpg` },
  { id: "el-morro", label: "El Morro coastline", src: `${SJB}/bg-el-morro.jpg` },
  { id: "kickoff", label: "Kickoff confetti", src: `${SJB}/bg-kickoff.jpg` },
  { id: "mural", label: "Mural sunburst", src: `${SJB}/bg-mural.jpg` },
  { id: "neon", label: "Neon kickoff", src: `${SJB}/bg-neon.jpg` },
  { id: "artdeco", label: "Art deco gold", src: `${SJB}/bg-artdeco.jpg` },
  { id: "gouache", label: "Gouache wave", src: `${SJB}/bg-gouache.jpg` },
  { id: "popart", label: "Pop-art kickoff", src: `${SJB}/bg-popart.jpg` },
  { id: "retro", label: "Retro travel poster", src: `${SJB}/bg-retro.jpg` },
];

const SIGN_SCENES: Record<string, SignScene[]> = {
  "divsign-sjb-first-flyer": SJB_FLYER_SCENES,
};

/** Scene backgrounds registered for a sign layout (empty when none). */
export function signScenes(layoutId: string): SignScene[] {
  return SIGN_SCENES[layoutId] ?? [];
}

/** Resolve a saved scene pick to its registry entry. */
export function signScene(layoutId: string, id: string | null | undefined): SignScene | null {
  if (!id) return null;
  return signScenes(layoutId).find((s) => s.id === id) ?? null;
}
