// Artwork extracted from TransPerfect_Solutions_Proposal_Template.pptx so the
// multi-page proposal renders with the same imagery as the source deck.
import field from "@/assets/proposal/proposal-field.png.asset.json";
import logoWhite from "@/assets/proposal/tp-logo-white.svg.asset.json";
import lockupDark from "@/assets/proposal/tp-lockup-dark.svg.asset.json";
import worldMap from "@/assets/proposal/world-map.svg.asset.json";
import teamGrid from "@/assets/proposal/team-grid.png.asset.json";
import photoClouds from "@/assets/proposal/photo-clouds.jpeg.asset.json";
import logoLufthansa from "@/assets/proposal/logo-lufthansa.svg.asset.json";
import logoLavazza from "@/assets/proposal/logo-lavazza.svg.asset.json";
import photoCoffee from "@/assets/proposal/photo-coffee.jpeg.asset.json";

import samsung from "@/assets/proposal/client-samsung.png.asset.json";
import amazon from "@/assets/proposal/client-amazon.png.asset.json";
import bp from "@/assets/proposal/client-bp.png.asset.json";
import estee from "@/assets/proposal/client-estee.png.asset.json";
import hilton from "@/assets/proposal/client-hilton.png.asset.json";
import justeat from "@/assets/proposal/client-justeat.png.asset.json";
import loreal from "@/assets/proposal/client-loreal.png.asset.json";
import microsoft from "@/assets/proposal/client-microsoft.png.asset.json";
import netflix from "@/assets/proposal/client-netflix.png.asset.json";
import revolut from "@/assets/proposal/client-revolut.png.asset.json";
import sodexo from "@/assets/proposal/client-sodexo.png.asset.json";
import wb from "@/assets/proposal/client-wb.png.asset.json";

import cause01 from "@/assets/proposal/cause-01.png.asset.json";
import cause02 from "@/assets/proposal/cause-02.png.asset.json";
import cause03 from "@/assets/proposal/cause-03.png.asset.json";
import cause04 from "@/assets/proposal/cause-04.png.asset.json";
import cause05 from "@/assets/proposal/cause-05.png.asset.json";
import cause06 from "@/assets/proposal/cause-06.png.asset.json";
import cause07 from "@/assets/proposal/cause-07.png.asset.json";
import cause08 from "@/assets/proposal/cause-08.png.asset.json";
import cause09 from "@/assets/proposal/cause-09.png.asset.json";
import affinityAdvocate from "@/assets/proposal/affinity-advocate.png.asset.json";
import affinityStrive from "@/assets/proposal/affinity-strive.png.asset.json";
import affinityLadies from "@/assets/proposal/affinity-ladies.png.asset.json";
import affinityWorkingWomen from "@/assets/proposal/affinity-working-women.png.asset.json";

export const PROPOSAL_ART = {
  field: field.url,
  logoWhite: logoWhite.url,
  lockupDark: lockupDark.url,
  worldMap: worldMap.url,
  teamGrid: teamGrid.url,
  // The two source photos were exported with swapped filenames; keep the
  // semantic names pointing at the correct imagery.
  photoClouds: photoCoffee.url,
  photoCoffee: photoClouds.url,
};

export const STORY_LOGOS: Record<string, string> = {
  lufthansa: logoLufthansa.url,
  lavazza: logoLavazza.url,
};

export type LogoTile = { name: string; url: string };

/** Slide 6 client grid, in the source template's reading order. */
export const CLIENT_LOGOS: LogoTile[] = [
  { name: "Samsung", url: samsung.url },
  { name: "Amazon", url: amazon.url },
  { name: "BP", url: bp.url },
  { name: "Estée Lauder", url: estee.url },
  { name: "Hilton", url: hilton.url },
  { name: "Eat Just", url: justeat.url },
  { name: "L'Oréal", url: loreal.url },
  { name: "Microsoft", url: microsoft.url },
  { name: "Netflix", url: netflix.url },
  { name: "Revolut", url: revolut.url },
  { name: "Sodexo", url: sodexo.url },
  { name: "Warner Bros.", url: wb.url },
];

/** Slide 9 giving-back / cause partner logos. */
export const CAUSE_LOGOS: LogoTile[] = [
  { name: "Cause partner 1", url: cause01.url },
  { name: "Cause partner 2", url: cause02.url },
  { name: "Cause partner 3", url: cause03.url },
  { name: "Cause partner 4", url: cause04.url },
  { name: "Cause partner 5", url: cause05.url },
  { name: "Cause partner 6", url: cause06.url },
  { name: "Cause partner 7", url: cause07.url },
  { name: "Cause partner 8", url: cause08.url },
  { name: "Cause partner 9", url: cause09.url },
];

/** Slide 10 affinity / advocacy group marks. */
export const AFFINITY_LOGOS: LogoTile[] = [
  { name: "TransPerfect Advocate", url: affinityAdvocate.url },
  { name: "Strive", url: affinityStrive.url },
  { name: "Ladies Get Paid", url: affinityLadies.url },
  { name: "Working Women", url: affinityWorkingWomen.url },
];

/** Aqua accent used for figures and highlighted words in the template. */
export const PROPOSAL_AQUA = "#97F0FB";
