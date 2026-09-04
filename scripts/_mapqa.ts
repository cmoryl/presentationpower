import { floorMapSvg, assetMapSvg, floorMapSheetSize } from "@/lib/next-london-floormap-svg";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import "@/lib/next-london-booths";
import { writeFileSync } from "fs";
const svg = floorMapSvg("GF", { labels: true, footerNote: "Ground floor · sheet 1 of 6" });
writeFileSync("/tmp/browser/mapqa/gf.svg", svg);
const panel = LONDON_PANELS.find((p) => p.floor === "GF")!;
writeFileSync("/tmp/browser/mapqa/card.svg", assetMapSvg(panel));
console.log(JSON.stringify(floorMapSheetSize("GF", { labels: true })));
