import { BrandApplicationGallery } from "./BrandApplicationExamples";
import { SJB_CANVA_GALLERY, SJB_CANVA_COLLECTIONS } from "@/lib/sjb-canva-gallery";
import { SJB_COLORS, SJB_EVENT, SJB_LOGOS } from "@/lib/san-juan-bowl";

export interface SjbApplicationGalleryProps { className?: string }
export function SjbApplicationGallery({ className }: SjbApplicationGalleryProps) {
  return <BrandApplicationGallery id="applications" socialPosts={SJB_SOCIAL_POSTS} className={className} artwork={{ name: SJB_EVENT.name, color: SJB_LOGOS[0].svg, white: SJB_LOGOS[1].svg, dark: SJB_COLORS[0].hex, accent: SJB_COLORS[2].hex }} />;
}
/** One saved, non-email Canva post per campaign set. */
const SJB_SOCIAL_POSTS = SJB_CANVA_COLLECTIONS.flatMap((c) => {
  const d = SJB_CANVA_GALLERY.find((g) => g.collectionId === c.id && g.status === "saved" && !g.format && g.width === 1080 && g.height === 1350);
  return d ? [{ src: d.previewUrl, title: `${c.label ?? c.id} · ${d.name}`, size: `${d.width}×${d.height}` }] : [];
});
