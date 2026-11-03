import nextPdf from "@/assets/brand-kits/next-brand-kit-v1.0.pdf.asset.json";
import nexusPdf from "@/assets/brand-kits/nexus-brand-kit-v1.0.pdf.asset.json";
/**
 * Released brand-kit PDFs: full-section exports built from the live kit, checked page by
 * page, then served unchanged from /downloads/brand-kits/. Re-release by exporting again,
 * re-checking, and updating the row (date = release day, never a future or guessed date).
 */
export interface KitRelease { file: string; version: string; released: string; pages: number }

export const KIT_RELEASES: Record<string, KitRelease> = {
  "transperfect-master": { file: "/downloads/brand-kits/transperfect-master-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 17 },
  "globallink": { file: "/downloads/brand-kits/globallink-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "transperfect-life-sciences": { file: "/downloads/brand-kits/transperfect-life-sciences-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "transperfect-legal": { file: "/downloads/brand-kits/transperfect-legal-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "transperfect-media": { file: "/downloads/brand-kits/transperfect-media-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "transperfect-gaming": { file: "/downloads/brand-kits/transperfect-gaming-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 15 },
  "transperfect-digital": { file: "/downloads/brand-kits/transperfect-digital-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 15 },
  "dataforce": { file: "/downloads/brand-kits/dataforce-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "transperfect-cobrand": { file: "/downloads/brand-kits/transperfect-cobrand-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "trial-interactive": { file: "/downloads/brand-kits/trial-interactive-brand-kit-v26.06-3.0.pdf", version: "26.06 / 3.0", released: "2026-11-03", pages: 16 },
  "element": { file: "/downloads/brand-kits/element-brand-kit-v1.0.pdf", version: "1.0", released: "2026-11-03", pages: 7 },
  "san-juan-bowl": { file: "/downloads/brand-kits/san-juan-bowl-brand-kit-v1.0.pdf", version: "1.0", released: "2026-11-03", pages: 20 },
  "nexus": { file: nexusPdf.url, version: "1.0", released: "2026-11-03", pages: 22 },
  "hackathon": { file: "/downloads/brand-kits/hackathon-brand-kit-v1.0.pdf", version: "1.0", released: "2026-11-03", pages: 14 },
  "legalweek": { file: "/downloads/brand-kits/legalweek-brand-kit-v1.0.pdf", version: "1.0", released: "2026-11-03", pages: 16 },
  "next": { file: nextPdf.url, version: "1.0", released: "2026-11-03", pages: 70 },
};

export function kitRelease(id?: string): KitRelease | undefined {
  return id ? KIT_RELEASES[id] : undefined;
}
