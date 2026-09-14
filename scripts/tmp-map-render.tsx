import { renderToStaticMarkup } from "react-dom/server";
import { WorldMap, MAP_STYLES, getDivisionLocationSet } from "@/lib/location-maps";
import { writeFileSync } from "node:fs";
const pins = getDivisionLocationSet("bm-enterprise").pins;
const cards = MAP_STYLES.map((s) => `<figure style="margin:0"><div style="background:#EEF1F7;border-radius:12px;overflow:hidden">${renderToStaticMarkup(
  <WorldMap pins={pins} mode="light" accent="#003FC7" primary="#03002C" mapStyle={s.id} animate={false} showLabels={false} />,
)}</div><figcaption style="font:600 13px Geist,sans-serif;padding:6px 2px">${s.label}</figcaption></figure>`).join("");
writeFileSync("/tmp/browser/maps/out.html", `<body style="margin:24px;background:#fff"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px">${cards}</div></body>`);
