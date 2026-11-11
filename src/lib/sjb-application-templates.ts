import source0 from "@/assets/sjb-applications/presentation-light.pptx.asset.json";
import preview0 from "@/assets/sjb-applications/presentation-light-1.png.asset.json";
import source1 from "@/assets/sjb-applications/presentation-dark.pptx.asset.json";
import preview1 from "@/assets/sjb-applications/presentation-dark-1.png.asset.json";
import source2 from "@/assets/sjb-applications/av-sequence-hd-light.pptx.asset.json";
import preview2 from "@/assets/sjb-applications/av-sequence-hd-light-1.png.asset.json";
import source3 from "@/assets/sjb-applications/av-sequence-portrait-light.pptx.asset.json";
import preview3 from "@/assets/sjb-applications/av-sequence-portrait-light-1.png.asset.json";
import source4 from "@/assets/sjb-applications/av-sequence-hd-dark.pptx.asset.json";
import preview4 from "@/assets/sjb-applications/av-sequence-hd-dark-1.png.asset.json";
import source5 from "@/assets/sjb-applications/av-sequence-portrait-dark.pptx.asset.json";
import preview5 from "@/assets/sjb-applications/av-sequence-portrait-dark-1.png.asset.json";
import source6 from "@/assets/sjb-applications/letterhead-letter.docx.asset.json";
import preview6 from "@/assets/sjb-applications/letterhead-letter-1.png.asset.json";
import source7 from "@/assets/sjb-applications/fact-sheet-letter.docx.asset.json";
import preview7 from "@/assets/sjb-applications/fact-sheet-letter-1.png.asset.json";
import source8 from "@/assets/sjb-applications/report-letter.docx.asset.json";
import preview8 from "@/assets/sjb-applications/report-letter-1.png.asset.json";
import source9 from "@/assets/sjb-applications/letterhead-a4.docx.asset.json";
import preview9 from "@/assets/sjb-applications/letterhead-a4-1.png.asset.json";
import source10 from "@/assets/sjb-applications/fact-sheet-a4.docx.asset.json";
import preview10 from "@/assets/sjb-applications/fact-sheet-a4-1.png.asset.json";
import source11 from "@/assets/sjb-applications/report-a4.docx.asset.json";
import preview11 from "@/assets/sjb-applications/report-a4-1.png.asset.json";
import source12 from "@/assets/sjb-applications/poster-18x24.zip.asset.json";
import preview12 from "@/assets/sjb-applications/poster-18x24.png.asset.json";
import source13 from "@/assets/sjb-applications/poster-a3.zip.asset.json";
import preview13 from "@/assets/sjb-applications/poster-a3.png.asset.json";
import source14 from "@/assets/sjb-applications/directional-24x18.zip.asset.json";
import preview14 from "@/assets/sjb-applications/directional-24x18.png.asset.json";
import source15 from "@/assets/sjb-applications/tabletop-5x7.zip.asset.json";
import preview15 from "@/assets/sjb-applications/tabletop-5x7.png.asset.json";
import source16 from "@/assets/sjb-applications/tabletop-a5.zip.asset.json";
import preview16 from "@/assets/sjb-applications/tabletop-a5.png.asset.json";
import source17 from "@/assets/sjb-applications/pull-up-33x80.zip.asset.json";
import preview17 from "@/assets/sjb-applications/pull-up-33x80.png.asset.json";
import source18 from "@/assets/sjb-applications/backlit-artwork.zip.asset.json";
import preview18 from "@/assets/sjb-applications/backlit-artwork.png.asset.json";
import source19 from "@/assets/sjb-applications/vinyl-artwork.zip.asset.json";
import preview19 from "@/assets/sjb-applications/vinyl-artwork.png.asset.json";
import source20 from "@/assets/sjb-applications/holding-hd-light.zip.asset.json";
import preview20 from "@/assets/sjb-applications/holding-hd-light.png.asset.json";
import source21 from "@/assets/sjb-applications/holding-4k-light.zip.asset.json";
import preview21 from "@/assets/sjb-applications/holding-4k-light.png.asset.json";
import source22 from "@/assets/sjb-applications/speaker-hd-light.zip.asset.json";
import preview22 from "@/assets/sjb-applications/speaker-hd-light.png.asset.json";
import source23 from "@/assets/sjb-applications/opening-hd-light.zip.asset.json";
import preview23 from "@/assets/sjb-applications/opening-hd-light.png.asset.json";
import source24 from "@/assets/sjb-applications/closing-hd-light.zip.asset.json";
import preview24 from "@/assets/sjb-applications/closing-hd-light.png.asset.json";
import source25 from "@/assets/sjb-applications/opening-portrait-light.zip.asset.json";
import preview25 from "@/assets/sjb-applications/opening-portrait-light.png.asset.json";
import source26 from "@/assets/sjb-applications/closing-portrait-light.zip.asset.json";
import preview26 from "@/assets/sjb-applications/closing-portrait-light.png.asset.json";
import source27 from "@/assets/sjb-applications/holding-hd-dark.zip.asset.json";
import preview27 from "@/assets/sjb-applications/holding-hd-dark.png.asset.json";
import source28 from "@/assets/sjb-applications/holding-4k-dark.zip.asset.json";
import preview28 from "@/assets/sjb-applications/holding-4k-dark.png.asset.json";
import source29 from "@/assets/sjb-applications/speaker-hd-dark.zip.asset.json";
import preview29 from "@/assets/sjb-applications/speaker-hd-dark.png.asset.json";
import source30 from "@/assets/sjb-applications/opening-hd-dark.zip.asset.json";
import preview30 from "@/assets/sjb-applications/opening-hd-dark.png.asset.json";
import source31 from "@/assets/sjb-applications/closing-hd-dark.zip.asset.json";
import preview31 from "@/assets/sjb-applications/closing-hd-dark.png.asset.json";
import source32 from "@/assets/sjb-applications/opening-portrait-dark.zip.asset.json";
import preview32 from "@/assets/sjb-applications/opening-portrait-dark.png.asset.json";
import source33 from "@/assets/sjb-applications/closing-portrait-dark.zip.asset.json";
import preview33 from "@/assets/sjb-applications/closing-portrait-dark.png.asset.json";

export interface SjbApplicationTemplate { id:string; family:string; surface:"documents"|"signage"|"motion"; title:string; size:string; width:number; height:number; pages:number; format:string; mode:string; sourceUrl:string; previewUrl:string }
export const SJB_APPLICATION_TEMPLATES: SjbApplicationTemplate[] = [
{"id": "presentation-light", "family": "presentation", "surface": "documents", "title": "Presentation kit \u00b7 light", "size": "16:9 \u00b7 13\u2153 \u00d7 7\u00bd in", "width": 1920, "height": 1080, "pages": 8, "format": "PowerPoint", "mode": "light", "sourceUrl": source0.url, "previewUrl": preview0.url},
{"id": "presentation-dark", "family": "presentation", "surface": "documents", "title": "Presentation kit \u00b7 dark", "size": "16:9 \u00b7 13\u2153 \u00d7 7\u00bd in", "width": 1920, "height": 1080, "pages": 8, "format": "PowerPoint", "mode": "dark", "sourceUrl": source1.url, "previewUrl": preview1.url},
{"id": "av-sequence-hd-light", "family": "av-sequence", "surface": "motion", "title": "AV screen & sequence kit", "size": "16:9 \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 4, "format": "PowerPoint", "mode": "light", "sourceUrl": source2.url, "previewUrl": preview2.url},
{"id": "av-sequence-portrait-light", "family": "portrait-sequence", "surface": "motion", "title": "Portrait screen kit", "size": "9:16 \u00b7 1080 \u00d7 1920", "width": 1080, "height": 1920, "pages": 4, "format": "PowerPoint", "mode": "light", "sourceUrl": source3.url, "previewUrl": preview3.url},
{"id": "av-sequence-hd-dark", "family": "av-sequence", "surface": "motion", "title": "AV screen & sequence kit", "size": "16:9 \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 4, "format": "PowerPoint", "mode": "dark", "sourceUrl": source4.url, "previewUrl": preview4.url},
{"id": "av-sequence-portrait-dark", "family": "portrait-sequence", "surface": "motion", "title": "Portrait screen kit", "size": "9:16 \u00b7 1080 \u00d7 1920", "width": 1080, "height": 1920, "pages": 4, "format": "PowerPoint", "mode": "dark", "sourceUrl": source5.url, "previewUrl": preview5.url},
{"id": "letterhead-letter", "family": "letterhead", "surface": "documents", "title": "Letterhead", "size": "US Letter \u00b7 8\u00bd \u00d7 11 in", "width": 816, "height": 1056, "pages": 1, "format": "Word", "mode": "light", "sourceUrl": source6.url, "previewUrl": preview6.url},
{"id": "fact-sheet-letter", "family": "fact-sheet", "surface": "documents", "title": "Event fact sheet", "size": "US Letter \u00b7 8\u00bd \u00d7 11 in", "width": 816, "height": 1056, "pages": 1, "format": "Word", "mode": "light", "sourceUrl": source7.url, "previewUrl": preview7.url},
{"id": "report-letter", "family": "report", "surface": "documents", "title": "Report", "size": "US Letter \u00b7 8\u00bd \u00d7 11 in", "width": 816, "height": 1056, "pages": 2, "format": "Word", "mode": "light", "sourceUrl": source8.url, "previewUrl": preview8.url},
{"id": "letterhead-a4", "family": "letterhead", "surface": "documents", "title": "Letterhead", "size": "A4 \u00b7 210 \u00d7 297 mm", "width": 794, "height": 1123, "pages": 1, "format": "Word", "mode": "light", "sourceUrl": source9.url, "previewUrl": preview9.url},
{"id": "fact-sheet-a4", "family": "fact-sheet", "surface": "documents", "title": "Event fact sheet", "size": "A4 \u00b7 210 \u00d7 297 mm", "width": 794, "height": 1123, "pages": 1, "format": "Word", "mode": "light", "sourceUrl": source10.url, "previewUrl": preview10.url},
{"id": "report-a4", "family": "report", "surface": "documents", "title": "Report", "size": "A4 \u00b7 210 \u00d7 297 mm", "width": 794, "height": 1123, "pages": 2, "format": "Word", "mode": "light", "sourceUrl": source11.url, "previewUrl": preview11.url},
{"id": "poster-18x24", "family": "poster", "surface": "signage", "title": "Poster", "size": "18 \u00d7 24 in", "width": 1728, "height": 2304, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source12.url, "previewUrl": preview12.url},
{"id": "poster-a3", "family": "poster", "surface": "signage", "title": "Poster", "size": "A3 \u00b7 297 \u00d7 420 mm", "width": 1123, "height": 1587, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source13.url, "previewUrl": preview13.url},
{"id": "directional-24x18", "family": "directional", "surface": "signage", "title": "Directional sign", "size": "24 \u00d7 18 in", "width": 2304, "height": 1728, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source14.url, "previewUrl": preview14.url},
{"id": "tabletop-5x7", "family": "tabletop", "surface": "signage", "title": "Tabletop sign", "size": "5 \u00d7 7 in", "width": 480, "height": 672, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source15.url, "previewUrl": preview15.url},
{"id": "tabletop-a5", "family": "tabletop", "surface": "signage", "title": "Tabletop sign", "size": "A5 \u00b7 148 \u00d7 210 mm", "width": 559, "height": 794, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source16.url, "previewUrl": preview16.url},
{"id": "pull-up-33x80", "family": "pull-up", "surface": "signage", "title": "Pull-up banner", "size": "Proposed 33 \u00d7 80 in", "width": 1584, "height": 3840, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source17.url, "previewUrl": preview17.url},
{"id": "backlit-artwork", "family": "backlit", "surface": "signage", "title": "Backlit artwork", "size": "Proportional 16:9 \u00b7 supplier size required", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source18.url, "previewUrl": preview18.url},
{"id": "vinyl-artwork", "family": "vinyl", "surface": "signage", "title": "Vinyl artwork", "size": "Proportional 1:1 \u00b7 supplier size required", "width": 1080, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source19.url, "previewUrl": preview19.url},
{"id": "holding-hd-light", "family": "holding", "surface": "motion", "title": "Holding screen", "size": "Full HD \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source20.url, "previewUrl": preview20.url},
{"id": "holding-4k-light", "family": "holding", "surface": "motion", "title": "Holding screen", "size": "UHD \u00b7 3840 \u00d7 2160", "width": 3840, "height": 2160, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source21.url, "previewUrl": preview21.url},
{"id": "speaker-hd-light", "family": "lower-third", "surface": "motion", "title": "Speaker lower third", "size": "Full HD \u00b7 1920 \u00d7 1080 \u00b7 transparent ground", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source22.url, "previewUrl": preview22.url},
{"id": "opening-hd-light", "family": "opening", "surface": "motion", "title": "Opening frame", "size": "Full HD \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source23.url, "previewUrl": preview23.url},
{"id": "closing-hd-light", "family": "closing", "surface": "motion", "title": "Closing frame", "size": "Full HD \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source24.url, "previewUrl": preview24.url},
{"id": "opening-portrait-light", "family": "opening", "surface": "motion", "title": "Portrait opening", "size": "Portrait \u00b7 1080 \u00d7 1920", "width": 1080, "height": 1920, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source25.url, "previewUrl": preview25.url},
{"id": "closing-portrait-light", "family": "closing", "surface": "motion", "title": "Portrait closing", "size": "Portrait \u00b7 1080 \u00d7 1920", "width": 1080, "height": 1920, "pages": 1, "format": "Layered SVG", "mode": "light", "sourceUrl": source26.url, "previewUrl": preview26.url},
{"id": "holding-hd-dark", "family": "holding", "surface": "motion", "title": "Holding screen", "size": "Full HD \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source27.url, "previewUrl": preview27.url},
{"id": "holding-4k-dark", "family": "holding", "surface": "motion", "title": "Holding screen", "size": "UHD \u00b7 3840 \u00d7 2160", "width": 3840, "height": 2160, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source28.url, "previewUrl": preview28.url},
{"id": "speaker-hd-dark", "family": "lower-third", "surface": "motion", "title": "Speaker lower third", "size": "Full HD \u00b7 1920 \u00d7 1080 \u00b7 transparent ground", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source29.url, "previewUrl": preview29.url},
{"id": "opening-hd-dark", "family": "opening", "surface": "motion", "title": "Opening frame", "size": "Full HD \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source30.url, "previewUrl": preview30.url},
{"id": "closing-hd-dark", "family": "closing", "surface": "motion", "title": "Closing frame", "size": "Full HD \u00b7 1920 \u00d7 1080", "width": 1920, "height": 1080, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source31.url, "previewUrl": preview31.url},
{"id": "opening-portrait-dark", "family": "opening", "surface": "motion", "title": "Portrait opening", "size": "Portrait \u00b7 1080 \u00d7 1920", "width": 1080, "height": 1920, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source32.url, "previewUrl": preview32.url},
{"id": "closing-portrait-dark", "family": "closing", "surface": "motion", "title": "Portrait closing", "size": "Portrait \u00b7 1080 \u00d7 1920", "width": 1080, "height": 1920, "pages": 1, "format": "Layered SVG", "mode": "dark", "sourceUrl": source33.url, "previewUrl": preview33.url}
];
