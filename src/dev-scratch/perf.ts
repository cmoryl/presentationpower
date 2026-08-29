import { planDivisionFit, demoSlideBriefs, sectionSequence } from "@/lib/division-fit-engine";
import { NARRATIVE_ARCHETYPES } from "@/lib/taxonomy";
const secs = sectionSequence(NARRATIVE_ARCHETYPES[0].id);
console.log("sections", secs.length);
const t=Date.now();
const p = planDivisionFit({ brandModeId:"bm-enterprise", rhythmWindow:3, slides: demoSlideBriefs(secs,{blocks:4,copy:"medium",media:true}) });
console.log("ms", Date.now()-t, "considered", p.totalConsidered, "slides", p.slides.length);
