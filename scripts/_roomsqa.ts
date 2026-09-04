import { writeFileSync } from "node:fs";
import { floorMapSvg } from "../src/lib/next-london-floormap-svg";
writeFileSync("/tmp/browser/rooms/gf.svg", floorMapSvg("GF", { roomsOnly: true }));
writeFileSync("/tmp/browser/rooms/f3.svg", floorMapSvg("3F", { roomsOnly: true }));
