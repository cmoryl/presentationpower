export type SjbCalendarFormat = "single" | "linkedin-portrait" | "linkedin-square" | "instagram-carousel" | "story-sequence";

export interface SjbCalendarFormatSpec {
  id: SjbCalendarFormat;
  label: string;
  width: number;
  height: number;
  delivery: "image" | "pdf" | "images";
}

export const SJB_CALENDAR_FORMATS: readonly SjbCalendarFormatSpec[] = [
  { id: "single", label: "Single images", width: 1080, height: 1350, delivery: "image" },
  { id: "linkedin-portrait", label: "LinkedIn carousel · 4:5", width: 1080, height: 1350, delivery: "pdf" },
  { id: "linkedin-square", label: "LinkedIn carousel · square", width: 1080, height: 1080, delivery: "pdf" },
  { id: "instagram-carousel", label: "Instagram carousel", width: 1080, height: 1350, delivery: "images" },
  { id: "story-sequence", label: "Story sequence", width: 1080, height: 1920, delivery: "images" },
];

export interface SjbCalendarSequence {
  canvaUrl?: string;
  provenance?: 'assembled-canva-pages';
  sourceCanvaUrls?: string[];
  pages: { previewUrl: string; downloadUrl: string; downloadName: string }[];
  pdfUrl?: string;
  zipUrl?: string;
  illustratorUrl?: string;
}

// Only audited, cleaned exports belong here. Never substitute a single-image
// Canva design for a carousel or invent a link for a pending sequence.
const SEQUENCES: Record<string, SjbCalendarSequence> = {};
import { sjbAssembledPostSequence } from './sjb-post-sequences';

export function sjbCalendarSequence(post: string, mode: string, format: SjbCalendarFormat): SjbCalendarSequence | null {
  return SEQUENCES[`${post}:${mode}:${format}`] ?? sjbAssembledPostSequence(post, mode, format);
}
// Live multi-page Canva files (page 1 = the post's saved single ad, then the
// shared details + tickets pages). Exported pictures may still be pending.
import CANVA_SEQUENCES from "./sjb-calendar-canva-sequences.json";
const FORMAT_SIZE: Record<SjbCalendarFormat, string> = {
  single: "1350", "linkedin-portrait": "1350", "instagram-carousel": "1350", "linkedin-square": "1080", "story-sequence": "1920",
};
export function sjbCalendarSequenceCanvaUrl(post: string, mode: string, format: SjbCalendarFormat): string | null {
  if (format === "single") return null;
  const id = (CANVA_SEQUENCES as Record<string, Record<string, Record<string, string>>>)[mode]?.[post]?.[FORMAT_SIZE[format]];
  return id ? `https://www.canva.com/design/${id}/edit` : null;
}
