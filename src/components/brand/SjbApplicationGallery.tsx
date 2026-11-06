import { BrandApplicationGallery } from "./BrandApplicationExamples";
import { SJB_COLORS, SJB_EVENT, SJB_LOGOS } from "@/lib/san-juan-bowl";

export interface SjbApplicationGalleryProps { className?: string }
export function SjbApplicationGallery({ className }: SjbApplicationGalleryProps) {
  return <BrandApplicationGallery id="applications" className={className} artwork={{ name: SJB_EVENT.name, color: SJB_LOGOS[0].svg, white: SJB_LOGOS[1].svg, dark: SJB_COLORS[0].hex, accent: SJB_COLORS[2].hex }} />;
}