import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelSvg, buildLondonPanelAi } from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";
import { writeFileSync } from "node:fs";
const pillar = LONDON_PANELS.find((p) => /pillar/i.test(p.name) || /pillar/i.test(p.ground))!;
console.log(pillar.id, pillar.name, pillar.trimW, pillar.trimH);
const place = { ...DEFAULT_LOGO_PLACEMENT, text: "WELCOME", qr: "https://transperfectelement.lovable.app/events/next/london", textVertical: true };
const plan = londonBrandingPlan(pillar, place);
console.log(JSON.stringify({ vertical: plan.copyVertical, copySizeMm: plan.copySizeMm, qr: plan.qr && { x: plan.qr.x, y: plan.qr.y, size: plan.qr.size, modules: plan.qr.modules } }));
// place override into the store used by the builders
const store = await import("@/lib/next-london-logo-placement");
store.setLondonLogoPlacement(pillar.id, place);
writeFileSync("/tmp/lond/pillar.svg", buildLondonPanelSvg(pillar));
writeFileSync("/tmp/lond/pillar.ai", buildLondonPanelAi(pillar));
const wide = LONDON_PANELS.find((p) => p.trimW / p.trimH > 2)!;
writeFileSync("/tmp/lond/wide.svg", buildLondonPanelSvg(wide));
console.log("wide", wide.id, wide.name);
