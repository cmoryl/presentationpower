// ---------------------------------------------------------------------------
// LEGAL CAMPAIGN — "You're not on it alone."
//
// Sixteen commissioned documentary frames. Every frame shows one expert
// committed to something hard, and a second person deliberately placed at a
// distance: watching, ready, not intervening. The relationship is subtle at
// first read and only lands on a second look, which is the whole idea.
//
// The Legal brief's forbidden list still holds on every frame: no blue overlay
// on the picture, no floating icons, no gavels or scales, no smiling stock, no
// hands on devices standing in for technology, no text baked into the artwork.
// ---------------------------------------------------------------------------

import climber from "@/assets/legal-refresh/adv-climber-belayer.jpg";
import rally from "@/assets/legal-refresh/adv-rally-codriver.jpg";
import golfer from "@/assets/legal-refresh/adv-golfer-caddie.jpg";
import tennis from "@/assets/legal-refresh/adv-tennis-doubles.jpg";
import boxer from "@/assets/legal-refresh/adv-boxer-corner.jpg";
import sailing from "@/assets/legal-refresh/adv-storm-sailing.jpg";
import cycling from "@/assets/legal-refresh/adv-cycling-pair.jpg";
import whitewater from "@/assets/legal-refresh/adv-whitewater-pair.jpg";
import pit from "@/assets/legal-refresh/adv-pit-crew.jpg";
import mountain from "@/assets/legal-refresh/adv-mountaineering-pair.jpg";
import kitchen from "@/assets/legal-refresh/adv-kitchen-service.jpg";
import backstage from "@/assets/legal-refresh/adv-backstage-crew.jpg";
import divers from "@/assets/legal-refresh/adv-dive-partners.jpg";
import lifter from "@/assets/legal-refresh/adv-lifter-spotter.jpg";
import rowing from "@/assets/legal-refresh/adv-rowing-crew.jpg";
import surf from "@/assets/legal-refresh/surf-safety-rider.jpg";

export const LEGAL_ALONGSIDE_CONCEPT = {
  campaign: "You're not on it alone",
  line: "You're not on it alone.",
  support: "Flexible legal solutions for complex matters.",
  cta: "Speak to a specialist",
  division: "TransPerfect Legal",
  brandModeId: "bm-tp-legal",
  channel: "LinkedIn · single image ad",
  narrative:
    "Every frame in this set is one expert fully committed to something hard, with a second person placed at a distance — watching, ready, not interfering. Nobody is being rescued and nobody is celebrating. That is the proposition: the matter stays yours, the support is already in position.",
  rules: [
    "The pair reads on the second look, never the first",
    "Never rescuing, never celebrating, no eye contact",
    "Documentary photography, no brands, no text in the artwork",
  ],
} as const;

/** Where the frame leaves clear space for copy. */
export type AlongsideClear = "left" | "right" | "bottom" | "top";

export type AlongsideScene = {
  id: string;
  /** Master-prompt number, kept so the set maps back to the brief. */
  no: string;
  /** Master-prompt title, e.g. "Climber + Belayer". */
  pair: string;
  /** Master-prompt theme, e.g. "Extreme Exposure". */
  theme: string;
  /** The ad headline this frame carries. */
  headline: string;
  /** The turn in the headline — set in the template's emphasis face. */
  action: string;
  /** Short caption shown under the frame on the board. */
  caption: string;
  /** The photographic craft note from the master prompt. */
  craft: string;
  /** The legal-industry buyer this frame is aimed at. */
  buyer: string;
  /** What that buyer says against the ad on a first, sceptical read. */
  objection: string;
  /** The real service answer the frame has to earn in their language. */
  answer: string;
  /** What that buyer says against the photograph itself. */
  photoObjection: string;
  /** Whether the picture survives that look, and on what evidence. */
  photoVerdict: string;
  src: string;
  /** CSS object-position for the landscape crop. */
  focus: string;
  /** CSS object-position for the square trim. */
  focusSquare: string;
  clear: AlongsideClear;
  /** Copy ink over this frame. */
  ink: "light" | "dark";
};

export const LEGAL_ALONGSIDE_SCENES: AlongsideScene[] = [
  {
    id: "climber-belayer",
    no: "01",
    pair: "Climber + Belayer",
    theme: "Extreme Exposure",
    headline: "You take the wall. You don't take it alone.",
    action: "You don't take it alone.",
    caption:
      "A climber committed high on a limestone wall. Look again at the base of the frame and the belayer is already braced, watching the move.",
    craft: "35mm, f/5.6, 1/1600, ISO 320 — late raking light, real chalk and taped fingers.",
    buyer: "General counsel, bet-the-company litigation",
    objection:
      "Exposure is my word for risk, and a rock face tells me nothing about who is accountable when the record is wrong.",
    answer:
      "Multilingual document review that stays defensible: your privilege calls, our reviewers and certified translations under them.",
    photoObjection:
      "Adventure climbing is the most over-used image in professional services. I have seen it on three insurance ads this month.",
    photoVerdict:
      "Holds, because the belayer is doing unglamorous work at the bottom of the frame and nobody is summiting. It is the least heroic climbing picture in the category.",
    src: climber,
    focus: "72% 45%",
    focusSquare: "72% 40%",
    clear: "left",
    ink: "light",
  },
  {
    id: "rally-codriver",
    no: "02",
    pair: "Rally Driver + Co-Driver",
    theme: "Complexity at Speed",
    headline: "Going fast is easy. Knowing the next corner isn't.",
    action: "Knowing the next corner isn't.",
    caption:
      "Nobody drives a blind gravel stage on instinct. The pace notes in the right seat are what make the next corner survivable.",
    craft: "24mm, f/4, 1/500, ISO 800 — dust in every seam, hand-written notes, honest high-ISO grain.",
    buyer: "Litigation support manager, cross-border discovery",
    objection:
      "Pace notes are a nice metaphor until a deadline moves and nobody can tell me what the next step actually is.",
    answer:
      "A named project team and a written production plan per jurisdiction, so the next filing date is already scheduled, not discovered.",
    photoObjection:
      "A rally car reads as speed for its own sake, which is the opposite of how I want my matters run.",
    photoVerdict:
      "Re-shot inside the cockpit only: no car body, no livery, no speed theatrics — two people and a hand-written note book calling the next corner.",
    src: rally,
    focus: "50% 50%",
    focusSquare: "45% 55%",
    clear: "top",
    ink: "light",
  },
  {
    id: "golfer-caddie",
    no: "03",
    pair: "Golfer + Caddie",
    theme: "The Unplayable Position",
    headline: "A difficult matter is still a workable one.",
    action: "still a workable one",
    caption:
      "A buried lie in a wet revetted bunker, in filthy weather. On the lip above, the caddie holds the line and the wind.",
    craft: "50mm, f/4, 1/1250, ISO 640 — real rain, mud-caked spikes, muted links greens.",
    buyer: "Litigation partner, adverse-facts matter",
    objection:
      "If the pitch is that a bad position can be played, that sounds like spin, and I cannot put spin in front of a court.",
    answer:
      "No case theory from us. Accurate certified translation and transcription of the record you actually have, however unhelpful it is.",
    photoObjection:
      "Golf is the corporate-hospitality cliché, and half my panel firms already use it. It also signals a client I am not.",
    photoVerdict:
      "Re-shot to answer that: every country-club cue is gone — wild coastal links, storm light, mud, no clubhouse, no spectators, no branding. It now reads as work in bad conditions, not hospitality.",
    src: golfer,
    focus: "35% 55%",
    focusSquare: "40% 55%",
    clear: "top",
    ink: "light",
  },
  {
    id: "tennis-doubles",
    no: "04",
    pair: "Tennis Doubles",
    theme: "Covering the Open Court",
    headline: "You play the ball. The open court is covered.",
    action: "The open court is covered.",
    caption:
      "One player fully committed to a low return. The partner is already moving to the space that opens the second they do.",
    craft: "135mm, f/2.8, 1/2500, ISO 400 — court dust airborne, sweat-soaked kit, no styling.",
    buyer: "Legal operations director, panel management",
    objection:
      "Covering the open court means handovers, and handovers are where my matters lose a week.",
    answer:
      "One point of contact across translation, review and deposition support, so nothing sits between two vendors waiting to be picked up.",
    photoObjection:
      "Doubles tennis looks like a sales conference slide about teamwork.",
    photoVerdict:
      "Holds because there is no eye contact and no celebration — one player low and committed, the other already moving into empty court.",
    src: tennis,
    focus: "40% 45%",
    focusSquare: "45% 45%",
    clear: "top",
    ink: "light",
  },
  {
    id: "boxer-corner",
    no: "05",
    pair: "Boxer + Corner Coach",
    theme: "Between Rounds",
    headline: "The work is yours. The corner is ours.",
    action: "The corner is ours.",
    caption:
      "Nobody is stepping in to fight it for you. The corner exists to make the next round different from the last one.",
    craft: "85mm, f/2, 1/500, ISO 1600 — practical overhead light, real swelling, honest grain.",
    buyer: "Deputy GC, regulatory investigation",
    objection:
      "Between rounds is when I need a decision, not encouragement.",
    answer:
      "Overnight turnarounds on foreign-language evidence, with an interpreter briefed before the next interview, not after it.",
    photoObjection:
      "Combat sport next to a legal brand implies we are looking for a fight. My board would not sign it.",
    photoVerdict:
      "Re-shot without the fight: the boxer sits between rounds, no blood, no raised fists, no crowd, and the coach works quietly a metre away. Safe for any legal audience now.",
    src: boxer,
    focus: "50% 40%",
    focusSquare: "48% 40%",
    clear: "bottom",
    ink: "light",
  },
  {
    id: "storm-sailing",
    no: "06",
    pair: "Sailing Crew",
    theme: "Calm Inside Chaos",
    headline: "Calm isn't the absence of weather.",
    action: "the absence of weather",
    caption:
      "Green water across the foredeck and one crew member buried in it. Aft, the helm holds a steady line through the same sea.",
    craft: "70mm, f/4, 1/2000, ISO 500 — frozen spray, salt-crusted kit, desaturated overcast grade.",
    buyer: "Chief compliance officer, multi-jurisdiction",
    objection:
      "Everyone claims calm. I want to know what happens on the worst week of the year.",
    answer:
      "Capacity that scales inside the same workflow: surge review teams and interpreters booked against a fixed rate card.",
    photoObjection:
      "Yachting says wealth, not competence.",
    photoVerdict:
      "Holds, because it is offshore work in green water rather than a regatta: soaked crew, no logos, nothing aspirational about it.",
    src: sailing,
    focus: "70% 45%",
    focusSquare: "68% 45%",
    clear: "left",
    ink: "light",
  },
  {
    id: "cycling-pair",
    no: "07",
    pair: "Road Cyclists",
    theme: "Taking the Wind",
    headline: "Someone should be taking the wind for you.",
    action: "taking the wind for you",
    caption:
      "The front rider is paying for both of them. That is not generosity — it is how the pair arrives at all.",
    craft: "200mm, f/3.2, 1/1600, ISO 400 — compressed perspective, road grit, sunlit skin texture.",
    buyer: "Head of legal, lean in-house team",
    objection:
      "Taking the wind sounds like you do my job. My job is not delegable.",
    answer:
      "We take the volume work — translation, transcription, first-pass review — and leave the judgement calls with your team.",
    photoObjection:
      "Cycling is the most over-used metaphor in consulting, full stop.",
    photoVerdict:
      "Re-shot to stop being stock: an exposed crosswind coast road, plain unbranded kit, the front rider visibly paying for both. Specific weather, specific cost.",
    src: cycling,
    focus: "30% 50%",
    focusSquare: "35% 50%",
    clear: "right",
    ink: "light",
  },
  {
    id: "whitewater-pair",
    no: "08",
    pair: "Whitewater Pair",
    theme: "Committed to the Line",
    headline: "Committed doesn't have to mean improvising.",
    action: "doesn't have to mean improvising",
    caption:
      "Two paddlers in a grade-five drop, reading the same water half a second apart. No hesitation available.",
    craft: "300mm, f/4, 1/2000, ISO 800 — frozen droplets, scuffed helmets, cool canyon light.",
    buyer: "eDiscovery manager",
    objection:
      "Once collection starts I cannot improvise. Tell me the chain of custody, not the drama.",
    answer:
      "Documented forensic collection and processing, one auditable trail from collection through production.",
    photoObjection:
      "Whitewater looks like risk-taking, and I am the person paid to reduce risk.",
    photoVerdict:
      "Re-shot without the adrenaline: both paddlers upright and composed, blades set on the same line, eyes on the water. It reads as control, not risk-taking.",
    src: whitewater,
    focus: "55% 45%",
    focusSquare: "58% 45%",
    clear: "left",
    ink: "light",
  },
  {
    id: "pit-crew",
    no: "09",
    pair: "Driver + Pit Crew",
    theme: "Never Stop Moving",
    headline: "Standing still is the expensive part.",
    action: "the expensive part",
    caption:
      "The driver's hands never leave the wheel. Everything that makes the next two hours possible happens around the car in seconds.",
    craft: "35mm, f/2.8, 1/250, ISO 1250 — practical garage light, heat shimmer, blurred crew, sharp driver.",
    buyer: "Legal ops lead, cost and cycle time",
    objection:
      "Standing still being expensive is my line, and it usually means someone is about to bill me for speed.",
    answer:
      "Fixed per-word and per-hour pricing with turnaround committed up front, so the fast option is the priced option.",
    photoObjection:
      "Motorsport pit stops are the standard efficiency stock shot in every outsourcing deck.",
    photoVerdict:
      "Holds because the driver's hands never leave the wheel — the point being made is who stays in control, not how fast the crew is.",
    src: pit,
    focus: "40% 50%",
    focusSquare: "40% 50%",
    clear: "right",
    ink: "light",
  },
  {
    id: "mountaineering-pair",
    no: "10",
    pair: "Mountaineering Pair",
    theme: "Connected Through the Whiteout",
    headline: "When the route disappears, you shouldn't be on your own.",
    action: "on your own",
    caption:
      "A corniced ridge in a near-whiteout. The only clear thing in the frame is the rope running back to the second climber.",
    craft: "85mm, f/2.8, 1/1000, ISO 640 — flat blizzard light, rime on every seam, delicate highlights.",
    buyer: "General counsel, first matter in an unfamiliar jurisdiction",
    objection:
      "I do not know what I do not know there. A rope in a blizzard does not tell me who is qualified.",
    answer:
      "Local-language counsel support: certified translators and interpreters with the credentials the local court requires, named before you commit.",
    photoObjection:
      "Summit imagery says ego. In a whiteout it also says poor planning.",
    photoVerdict:
      "Strongest frame for an unfamiliar-jurisdiction message: nothing is visible except the rope back to the second climber. Nobody looks triumphant.",
    src: mountain,
    focus: "70% 50%",
    focusSquare: "72% 50%",
    clear: "left",
    ink: "dark",
  },
  {
    id: "kitchen-service",
    no: "11",
    pair: "Chef + Sous-Chef",
    theme: "Controlled Pressure",
    headline: "Pressure is fine. Unmanaged pressure isn't.",
    action: "Unmanaged pressure isn't.",
    caption:
      "Peak service, one plate at a time, with the second pair of hands working a metre away on the part that can't wait.",
    craft: "35mm, f/2, 1/400, ISO 1600 — mixed tungsten and hood light, stained whites, real burns.",
    buyer: "Contracts lead, high-volume commercial",
    objection:
      "Unmanaged pressure is exactly what a vendor creates when the queue is theirs and the deadline is mine.",
    answer:
      "Visible queues: every contract translation tracked with status and due date, so volume is scheduled instead of negotiated.",
    photoObjection:
      "A restaurant kitchen has no relationship to legal work, and chef culture reads as shouting.",
    photoVerdict:
      "Re-shot as managed volume: an orderly pass of identical plates, a ticket rail, calm precise hands and no kitchen theatre. The link to scheduled work now reads without the caption.",
    src: kitchen,
    focus: "35% 45%",
    focusSquare: "38% 45%",
    clear: "right",
    ink: "light",
  },
  {
    id: "backstage-crew",
    no: "12",
    pair: "Performer + Backstage Crew",
    theme: "Behind the Performance",
    headline: "The performance is yours. The preparation is shared.",
    action: "The preparation is shared.",
    caption:
      "Seconds before an entrance. In the dark a metre away, the crew is holding the cue that makes the entrance work.",
    craft: "50mm, f/1.8, 1/160, ISO 2000 — chiaroscuro, cue-light glow, heavy black.",
    buyer: "Head of litigation, trial preparation",
    objection:
      "Preparation being shared is fine until a trial bundle is wrong in the room.",
    answer:
      "Trial-ready deliverables checked twice: exhibits, certified translations and transcripts assembled to your bundle, not ours.",
    photoObjection:
      "Theatre says performance, and performance is what clients accuse lawyers of.",
    photoVerdict:
      "Holds because the performer is not performing yet; it is the quiet second before an entrance, with the crew in the dark. Read it as preparation, never showmanship.",
    src: backstage,
    focus: "60% 45%",
    focusSquare: "62% 45%",
    clear: "left",
    ink: "light",
  },
  {
    id: "dive-partners",
    no: "13",
    pair: "Divers",
    theme: "Into the Unknown",
    headline: "Go into the unknown on a line, not a hunch.",
    action: "on a line",
    caption:
      "One diver enters the wreck. The second holds position outside with the reel — the way back is the whole point.",
    craft: "20mm, f/5.6, 1/125, ISO 1250 — real particulate, torch scatter, cold cast with a warm pool.",
    buyer: "IP counsel, foreign filings",
    objection:
      "A line back out is a nice image. My risk is a mistranslated claim that cannot be fixed later.",
    answer:
      "Patent and filing translation by subject-matter linguists, with a review step and a certificate on every claim set.",
    photoObjection:
      "Wreck diving looks reckless, and dark water is hard to read at LinkedIn size.",
    photoVerdict:
      "Re-shot for small sizes: clearer water, stronger torch beams and the taut guideline now the brightest thing in the frame, so the argument survives at feed scale.",
    src: divers,
    focus: "60% 50%",
    focusSquare: "62% 50%",
    clear: "left",
    ink: "light",
  },
  {
    id: "lifter-spotter",
    no: "14",
    pair: "Weightlifter + Spotter",
    theme: "Ready, Not Interfering",
    headline: "Support that's ready, and stays out of the way.",
    action: "stays out of the way",
    caption:
      "Hands open, a hand's width from the bar, taking none of the weight. That is what real support looks like under load.",
    craft: "35mm, f/2.5, 1/500, ISO 1600 — chalk dust in a single overhead beam, honest skin flush.",
    buyer: "Associate general counsel, day-to-day support",
    objection:
      "Most support interferes. I do not want to manage my supplier.",
    answer:
      "Standing capacity you call on without a new scope each time, and no involvement in the matter you have not asked for.",
    photoObjection:
      "Gym imagery reads as hustle culture, which lands badly with senior in-house counsel.",
    photoVerdict:
      "Re-shot tight on the spotter's open palms a hand's width from the bar, torsos covered, no mirrors or hustle styling. The promise is the whole picture now.",
    src: lifter,
    focus: "45% 45%",
    focusSquare: "45% 45%",
    clear: "right",
    ink: "light",
  },
  {
    id: "rowing-crew",
    no: "15",
    pair: "Rowing Crew",
    theme: "Precision Under Load",
    headline: "Under load, precision is the only thing that holds.",
    action: "the only thing that holds",
    caption:
      "Eight people at the catch, one shape, at the point where it hurts most. Precision is the only thing holding it together.",
    craft: "300mm, f/4, 1/1600, ISO 640 — cold dawn haze, blistered taped hands, matched blade angles.",
    buyer: "Director of legal operations, multi-vendor programme",
    objection:
      "Precision under load is a slogan. Show me consistency across sixteen languages and four suppliers.",
    answer:
      "One terminology base and one quality standard applied across every language and every reviewer on the programme.",
    photoObjection:
      "Rowing signals a specific university background. It can read as exclusive.",
    photoVerdict:
      "Re-shot with every club identifier removed — no crest, no livery, no landmarks on the bank — so it reads as matched work under load rather than a particular institution.",
    src: rowing,
    focus: "30% 45%",
    focusSquare: "32% 45%",
    clear: "right",
    ink: "light",
  },
  {
    id: "surf-safety-rider",
    no: "16",
    pair: "Big-Wave Surfer + Safety Rider",
    theme: "Far Outside the Path",
    headline: "The big one is yours. You're not watching it alone.",
    action: "You're not watching it alone.",
    caption:
      "A surfer the size of a thumbnail on an enormous face. Far outside the path, the safety rider is watching and ready.",
    craft: "400mm, f/5.6, 1/2500, ISO 500 — long-lens documentary sharpness, wind-blown spray, restrained colour.",
    buyer: "General counsel, single existential matter",
    objection:
      "One matter can end the company. A distant watcher is not reassurance.",
    answer:
      "Escalation you can name: a senior lead on the matter, out-of-hours cover, and a standing plan for the day it turns.",
    photoObjection:
      "Big-wave surfing is the boldest picture here and the easiest to dismiss as a car advert.",
    photoVerdict:
      "Holds because the surfer is almost too small to find and the safety rider sits far outside the path. It is the clearest statement of scale in the set.",
    src: surf,
    focus: "60% 35%",
    focusSquare: "62% 40%",
    clear: "bottom",
    ink: "light",
  },
];

/** Layout templates the board can switch between. */
export const LEGAL_ALONGSIDE_TEMPLATES = [
  {
    id: "veil",
    label: "Alpha veil",
    note: "One long diagonal veil of the ground colour falling from opaque to nothing in five stops, with an accent bloom screened into the base.",
  },
  {
    id: "strata",
    label: "Alpha strata",
    note: "Four stacked transparency bands climbing the frame, each denser than the last and divided by a gradient hairline.",
  },
  {
    id: "bloom",
    label: "Soft bloom",
    note: "A radial bloom behind the copy with the headline doubled — a blurred low-opacity ghost under a near-solid face.",
  },
  {
    id: "knockout",
    label: "Photo knockout",
    note: "A light field with the headline cut clean out of it so the photograph shows through the letterforms, over a full-bleed strip of the same frame.",
  },
  {
    id: "louvre",
    label: "Louvre panes",
    note: "The frame louvred into three panes of the same photograph, the centre pane in full colour and the outer two desaturated, copy on an ink band.",
  },
  {
    id: "marquee",
    label: "Duotone marquee",
    note: "A blue duotone photograph under the turn repeated three times at poster scale — outline, solid, outline.",
  },
  {
    id: "arch",
    label: "Arch window",
    note: "The photograph held in a tall arch with an accent ring struck off-register behind it, copy on the open side.",
  },
  {
    id: "contact",
    label: "Proof sheet",
    note: "A photographer's proof sheet: the frame marked up, two tighter crops beside it and the camera note set as data.",
  },
  {
    id: "wedge",
    label: "Cut wedge",
    note: "The photograph runs full bleed and a hard ink wedge is cut into it on the diagonal; the headline sits huge inside the wedge over a solid accent call to action.",
  },
  {
    id: "blade",
    label: "Reverse blade",
    note: "Wedge cut from the opposite edge with a thick accent blade along the cut; the headline crosses the diagonal at poster scale.",
  },
  {
    id: "shard",
    label: "Corner shard",
    note: "A triangular ink shard rising from the base corner, an outsized frame numeral held in the picture and the headline on the shard's baseline.",
  },
  {
    id: "chevron",
    label: "Chevron band",
    note: "An angled ink band driven straight across the frame carrying the headline, accent slabs closing both cut edges.",
  },
  {
    id: "editorial",
    label: "Editorial column",
    note: "Art to the far edge, copy held in a measured column on the clear side with a hairline masthead and the master number set against it.",
  },
  {
    id: "inset",
    label: "Museum inset",
    note: "The photograph floats inside a deep ground margin — nothing sits on the picture, the frame does the work.",
  },
  {
    id: "spine",
    label: "Rotated spine",
    note: "A narrow ground spine carries the division and number turned on its side; the headline sits on the art inside a soft wedge.",
  },
  {
    id: "ledger",
    label: "Ledger grid",
    note: "Art above, a three-column ledger below divided by hairlines: theme, headline, action.",
  },
  {
    id: "stack",
    label: "Offset plate",
    note: "Inset art with a ground plate stepped off the lower corner, accent hairline along its top edge.",
  },
  {
    id: "poster",
    label: "Poster masthead",
    note: "Caps headline in a ground masthead, the photograph opening beneath it as a window, tight footer strip.",
  },
  {
    id: "window",
    label: "Centred window",
    note: "The frame cropped to a window on wide margins, copy set beneath on a strict baseline.",
  },
  {
    id: "field",
    label: "Colour field step",
    note: "A ground field with an accent bar, the art stepped away from it so field and picture never fight.",
  },
  {
    id: "centre",
    label: "Centre axis",
    note: "Everything on the optical axis between two accent rules over a deep scrim.",
  },
] as const;


export type AlongsideTemplateId = (typeof LEGAL_ALONGSIDE_TEMPLATES)[number]["id"];

// Every sizing format the set has to survive, grouped for the picker. Ids are
// stable — they are what the board stores when you switch trim.
export const LEGAL_ALONGSIDE_SIZES = [
  { id: "banner", label: "Wide banner", group: "Banner", w: 1584, h: 396 },
  { id: "hd", label: "HD / screen", group: "Landscape", w: 1920, h: 1080 },
  { id: "linkedin", label: "LinkedIn", group: "Landscape", w: 1200, h: 628 },
  { id: "post", label: "Post 16:9", group: "Landscape", w: 1200, h: 675 },
  { id: "square", label: "Square", group: "Square", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait 4:5", group: "Portrait", w: 1080, h: 1350 },
  { id: "story", label: "Story 9:16", group: "Portrait", w: 1080, h: 1920 },
  { id: "halfpage", label: "Half page", group: "Portrait", w: 600, h: 900 },
] as const;


export type AlongsideSizeId = (typeof LEGAL_ALONGSIDE_SIZES)[number]["id"];

/** Palette used by every frame — enterprise tokens only. */
export const LEGAL_ALONGSIDE_PALETTE = {
  ground: "#03002C",
  ink: "#FFFFFF",
  accent: "#003FC7",
  light: "#EEF1F7",
} as const;

/** Opposite side helper, used to place a copy panel on the clear side. */
export function alongsideCopySide(clear: AlongsideClear): AlongsideClear {
  return clear;
}

// ---------------------------------------------------------------------------
// TYPE TREATMENTS
//
// Each layout carries its own voice on the page: a different display face,
// its own eyebrow/support/action pairing, and one emphasised phrase in the
// headline — the turn — set in a contrasting face (usually an italic).
// Emphasis is always ink; the accent only ever appears as a rule beneath it,
// because the brand accent is never body text.
// ---------------------------------------------------------------------------

/** Font stacks, all faces already loaded in the app shell. */
const F = {
  geist: "Geist, ui-sans-serif, system-ui, sans-serif",
  archivo: '"Archivo", Geist, sans-serif',
  anton: '"Anton", Geist, sans-serif',
  oswald: '"Oswald", Geist, sans-serif',
  syne: '"Syne", Geist, sans-serif',
  work: '"Work Sans", Geist, sans-serif',
  grotesk: '"Space Grotesk", Geist, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  fraunces: '"Fraunces", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  baskerville: '"Libre Baskerville", Georgia, serif',
  lora: '"Lora", Georgia, serif',
  mono: '"Space Mono", ui-monospace, monospace',
  plex: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

export type AlongsideTypeTreatment = {
  /** Headline face. `scale` corrects each face's optical size against the grid. */
  display: {
    family: string;
    weight: number;
    tracking: string;
    lineHeight: number;
    caps?: boolean;
    scale: number;
  };
  /** The emphasised phrase inside the headline. */
  action: {
    family: string;
    weight: number;
    italic?: boolean;
    tracking?: string;
    caps?: boolean;
    scale?: number;
    /** Accent hairline under the phrase. */
    rule?: boolean;
  };
  eyebrow: { family: string; weight: number; tracking: string };
  support: { family: string; weight: number; italic?: boolean; lineHeight: number };
  cta: { family: string; weight: number; tracking: string; caps?: boolean };
  /** Plain-language description of the treatment, shown on the board. */
  note: string;
};

export const LEGAL_ALONGSIDE_TYPE: Record<AlongsideTemplateId, AlongsideTypeTreatment> = {
  veil: {
    display: { family: F.archivo, weight: 700, tracking: "-0.036em", lineHeight: 1.02, scale: 1.04 },
    action: { family: F.serif, weight: 400, italic: true, scale: 1.16 },
    eyebrow: { family: F.archivo, weight: 600, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.46 },
    cta: { family: F.archivo, weight: 600, tracking: "0.16em", caps: true },
    note: "Archivo under the veil, the turn in Instrument Serif italic.",
  },
  strata: {
    display: { family: F.grotesk, weight: 600, tracking: "-0.028em", lineHeight: 1.06, scale: 1 },
    action: { family: F.fraunces, weight: 400, italic: true, scale: 1.1 },
    eyebrow: { family: F.grotesk, weight: 500, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.46 },
    cta: { family: F.grotesk, weight: 600, tracking: "0.14em", caps: true },
    note: "Space Grotesk across the strata, the turn in Fraunces italic.",
  },
  bloom: {
    display: { family: F.serif, weight: 400, tracking: "0em", lineHeight: 1.04, scale: 1.16 },
    action: { family: F.cormorant, weight: 500, italic: true, scale: 1.2 },
    eyebrow: { family: F.mono, weight: 400, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.5 },
    cta: { family: F.mono, weight: 500, tracking: "0.14em", caps: true },
    note: "Instrument Serif in the bloom, the turn in a Cormorant italic.",
  },
  knockout: {
    display: { family: F.anton, weight: 400, tracking: "-0.008em", lineHeight: 1.02, caps: true, scale: 1 },
    action: { family: F.anton, weight: 400, caps: true, scale: 1 },
    eyebrow: { family: F.archivo, weight: 700, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.42 },
    cta: { family: F.archivo, weight: 700, tracking: "0.16em", caps: true },
    note: "One Anton caps block, the picture read through the letterforms.",
  },
  louvre: {
    display: { family: F.work, weight: 700, tracking: "-0.026em", lineHeight: 1.04, scale: 1.02 },
    action: { family: F.lora, weight: 400, italic: true, scale: 1.04 },
    eyebrow: { family: F.grotesk, weight: 500, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.44 },
    cta: { family: F.work, weight: 600, tracking: "0.14em", caps: true },
    note: "Work Sans across the band, the turn in a Lora italic.",
  },
  marquee: {
    display: { family: F.anton, weight: 400, tracking: "0.006em", lineHeight: 0.94, caps: true, scale: 1 },
    action: { family: F.anton, weight: 400, caps: true, scale: 1 },
    eyebrow: { family: F.mono, weight: 400, tracking: "0.3em" },
    support: { family: F.grotesk, weight: 500, lineHeight: 1.3 },
    cta: { family: F.mono, weight: 500, tracking: "0.14em", caps: true },
    note: "Anton repeated as a marquee, outline against solid.",
  },
  arch: {
    display: { family: F.serif, weight: 400, tracking: "0em", lineHeight: 1, scale: 1.14 },
    action: { family: F.grotesk, weight: 600, caps: true, tracking: "0.1em", scale: 0.6 },
    eyebrow: { family: F.grotesk, weight: 500, tracking: "0.32em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.46 },
    cta: { family: F.grotesk, weight: 600, tracking: "0.16em", caps: true },
    note: "Instrument Serif in the arch, the turn in tracked Space Grotesk caps.",
  },
  contact: {
    display: { family: F.plex, weight: 500, tracking: "-0.024em", lineHeight: 1.1, scale: 0.98 },
    action: { family: F.lora, weight: 400, italic: true, scale: 1.06 },
    eyebrow: { family: F.plex, weight: 400, tracking: "0.26em" },
    support: { family: F.plex, weight: 400, lineHeight: 1.5 },
    cta: { family: F.plex, weight: 500, tracking: "0.14em", caps: true },
    note: "IBM Plex Mono as sheet data, the turn falling into a Lora italic.",
  },
  wedge: {
    display: { family: F.archivo, weight: 800, tracking: "-0.042em", lineHeight: 0.92, scale: 1.16 },
    action: { family: F.serif, weight: 400, italic: true, scale: 1.2 },
    eyebrow: { family: F.archivo, weight: 700, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.4 },
    cta: { family: F.archivo, weight: 700, tracking: "0.16em", caps: true },
    note: "Archivo black at poster scale, the turn in Instrument Serif italic.",
  },
  blade: {
    display: { family: F.anton, weight: 400, tracking: "-0.012em", lineHeight: 1.2, caps: true, scale: 0.95 },
    action: { family: F.fraunces, weight: 400, italic: true, caps: false, scale: 0.74 },
    eyebrow: { family: F.mono, weight: 400, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.42 },
    cta: { family: F.mono, weight: 500, tracking: "0.14em", caps: true },
    note: "Anton caps across the blade, the turn falling into Fraunces italic.",
  },
  shard: {
    display: { family: F.syne, weight: 800, tracking: "-0.03em", lineHeight: 0.96, scale: 1.08 },
    action: { family: F.cormorant, weight: 500, italic: true, scale: 1.24 },
    eyebrow: { family: F.plex, weight: 400, tracking: "0.28em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.42 },
    cta: { family: F.syne, weight: 700, tracking: "0.14em", caps: true },
    note: "Syne extra bold on the shard, the turn in a tall Cormorant italic.",
  },
  chevron: {
    display: {
      family: F.oswald,
      weight: 600,
      tracking: "0.004em",
      lineHeight: 0.98,
      caps: true,
      scale: 1.08,
    },
    action: { family: F.baskerville, weight: 400, italic: true, caps: false, scale: 0.72 },
    eyebrow: { family: F.oswald, weight: 500, tracking: "0.32em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.4 },
    cta: { family: F.oswald, weight: 600, tracking: "0.16em", caps: true },
    note: "Condensed Oswald caps riding the band, the turn in Libre Baskerville italic.",
  },
  editorial: {
    display: { family: F.archivo, weight: 600, tracking: "-0.024em", lineHeight: 1.05, scale: 1 },
    action: { family: F.serif, weight: 400, italic: true, scale: 1.14 },
    eyebrow: { family: F.archivo, weight: 600, tracking: "0.24em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.42 },
    cta: { family: F.archivo, weight: 600, tracking: "0.01em" },
    note: "Archivo column with the turn in Instrument Serif italic.",
  },
  inset: {
    display: { family: F.cormorant, weight: 500, tracking: "0em", lineHeight: 1.04, scale: 1.2 },
    action: { family: F.cormorant, weight: 500, italic: true, scale: 1.02, rule: true },
    eyebrow: { family: F.plex, weight: 400, tracking: "0.28em" },
    support: { family: F.cormorant, weight: 500, lineHeight: 1.34 },
    cta: { family: F.plex, weight: 500, tracking: "0.08em", caps: true },
    note: "Cormorant Garamond, the turn italic over an accent hairline.",
  },
  spine: {
    display: {
      family: F.oswald,
      weight: 500,
      tracking: "0.008em",
      lineHeight: 1.02,
      caps: true,
      scale: 1.02,
    },
    action: { family: F.mono, weight: 400, caps: true, tracking: "0.1em", scale: 0.72 },
    eyebrow: { family: F.oswald, weight: 500, tracking: "0.34em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.42 },
    cta: { family: F.oswald, weight: 500, tracking: "0.1em", caps: true },
    note: "Condensed Oswald caps, the turn dropped into tracked Space Mono.",
  },
  ledger: {
    display: { family: F.plex, weight: 400, tracking: "-0.012em", lineHeight: 1.22, scale: 0.94 },
    action: { family: F.lora, weight: 500, italic: true, scale: 1.1 },
    eyebrow: { family: F.plex, weight: 400, tracking: "0.2em" },
    support: { family: F.plex, weight: 400, lineHeight: 1.5 },
    cta: { family: F.plex, weight: 500, tracking: "0.08em", caps: true },
    note: "IBM Plex Mono record type, the turn in Lora italic.",
  },
  stack: {
    display: { family: F.work, weight: 600, tracking: "-0.02em", lineHeight: 1.07, scale: 1 },
    action: { family: F.serif, weight: 400, italic: true, scale: 1.16 },
    eyebrow: { family: F.work, weight: 600, tracking: "0.22em" },
    support: { family: F.work, weight: 400, lineHeight: 1.44 },
    cta: { family: F.work, weight: 600, tracking: "0.01em" },
    note: "Work Sans plate, the turn swung into a serif italic.",
  },
  poster: {
    display: { family: F.anton, weight: 400, tracking: "0.006em", lineHeight: 0.98, caps: true, scale: 1.04 },
    action: { family: F.baskerville, weight: 400, italic: true, scale: 0.66 },
    eyebrow: { family: F.archivo, weight: 600, tracking: "0.3em" },
    support: { family: F.baskerville, weight: 400, lineHeight: 1.5 },
    cta: { family: F.archivo, weight: 600, tracking: "0.06em", caps: true },
    note: "Anton masthead caps against a small Libre Baskerville italic turn.",
  },
  window: {
    display: { family: F.baskerville, weight: 400, tracking: "-0.004em", lineHeight: 1.2, scale: 0.9 },
    action: { family: F.grotesk, weight: 500, caps: true, tracking: "0.08em", scale: 0.78, rule: true },
    eyebrow: { family: F.grotesk, weight: 500, tracking: "0.26em" },
    support: { family: F.baskerville, weight: 400, lineHeight: 1.52 },
    cta: { family: F.grotesk, weight: 500, tracking: "0.08em", caps: true },
    note: "Libre Baskerville book setting, the turn in tracked Space Grotesk caps.",
  },
  field: {
    display: { family: F.syne, weight: 700, tracking: "-0.02em", lineHeight: 1.04, scale: 0.98 },
    action: { family: F.fraunces, weight: 400, italic: true, scale: 1.08 },
    eyebrow: { family: F.syne, weight: 700, tracking: "0.2em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.42 },
    cta: { family: F.syne, weight: 700, tracking: "0.02em" },
    note: "Syne on the colour field, the turn in Fraunces italic.",
  },
  centre: {
    display: { family: F.serif, weight: 400, tracking: "-0.006em", lineHeight: 1.04, scale: 1.22 },
    action: { family: F.archivo, weight: 600, caps: true, tracking: "0.07em", scale: 0.62 },
    eyebrow: { family: F.archivo, weight: 600, tracking: "0.3em" },
    support: { family: F.geist, weight: 400, lineHeight: 1.44 },
    cta: { family: F.archivo, weight: 600, tracking: "0.08em", caps: true },
    note: "Instrument Serif on the axis, the turn in small Archivo caps.",
  },
};

/**
 * Split a headline around its emphasised phrase. Returns the phrase as the
 * middle part; when the phrase isn't found the headline comes back whole.
 */
export function alongsideHeadlineParts(
  headline: string,
  action: string,
): { before: string; action: string; after: string } {
  const at = action ? headline.indexOf(action) : -1;
  if (at < 0) return { before: headline, action: "", after: "" };
  return {
    before: headline.slice(0, at),
    action,
    after: headline.slice(at + action.length),
  };
}

// ---------------------------------------------------------------------------
// TYPE SETS — a wider range of Google font families for the whole ad set.
//
// Each layout still has its own house treatment (LEGAL_ALONGSIDE_TYPE). A type
// set re-voices every ad in one considered Google-font pairing without touching
// the layout geometry: display face + the emphasised phrase's contrasting face,
// plus the eyebrow, supporting line and CTA so the frame reads as one piece of
// typography rather than a font swap.
// ---------------------------------------------------------------------------

const G = {
  playfair: '"Playfair Display", Georgia, serif',
  dmserif: '"DM Serif Display", Georgia, serif',
  bodoni: '"Bodoni Moda", Georgia, serif',
  garamond: '"EB Garamond", Georgia, serif',
  newsreader: '"Newsreader", Georgia, serif',
  spectral: '"Spectral", Georgia, serif',
  bricolage: '"Bricolage Grotesque", Geist, sans-serif',
  schibsted: '"Schibsted Grotesk", Geist, sans-serif',
  instrumentSans: '"Instrument Sans", Geist, sans-serif',
  familjen: '"Familjen Grotesk", Geist, sans-serif',
  epilogue: '"Epilogue", Geist, sans-serif',
  chivo: '"Chivo", Geist, sans-serif',
  bigShoulders: '"Big Shoulders Display", Geist, sans-serif',
  unbounded: '"Unbounded", Geist, sans-serif',
  gabarito: '"Gabarito", Geist, sans-serif',
  caslon: '"Libre Caslon Display", Georgia, serif',
  italiana: '"Italiana", Georgia, serif',
  cardo: '"Cardo", Georgia, serif',
  yeseva: '"Yeseva One", Georgia, serif',
  rozha: '"Rozha One", Georgia, serif',
  petrona: '"Petrona", Georgia, serif',
  vollkorn: '"Vollkorn", Georgia, serif',
  alegreya: '"Alegreya", Georgia, serif',
  alegreyaSans: '"Alegreya Sans", Geist, sans-serif',
  michroma: '"Michroma", Geist, sans-serif',
  fjalla: '"Fjalla One", Geist, sans-serif',
  syncopate: '"Syncopate", Geist, sans-serif',
  darker: '"Darker Grotesque", Geist, sans-serif',
} as const;

export type AlongsideTypeSet = {
  id: string;
  label: string;
  note: string;
  /** Undefined for the house set: each layout keeps its own faces. */
  faces?: {
    display: { family: string; weight: number; tracking?: string; caps?: boolean; scale?: number };
    action: { family: string; weight: number; italic?: boolean; caps?: boolean; scale?: number; tracking?: string };
    eyebrow: { family: string; weight: number; tracking?: string };
    support: { family: string; weight: number; italic?: boolean };
    cta: { family: string; weight: number; tracking?: string };
  };
};

export const LEGAL_ALONGSIDE_TYPESETS: AlongsideTypeSet[] = [
  {
    id: "house",
    label: "House (per layout)",
    note: "Each layout keeps its own pairing — the treatment written for that composition.",
  },
  {
    id: "editorial",
    label: "Editorial serif",
    note: "Playfair Display with its own italic for the turn; Instrument Sans carries the small type.",
    faces: {
      display: { family: G.playfair, weight: 700, tracking: "-0.018em", scale: 1.06 },
      action: { family: G.playfair, weight: 500, italic: true, scale: 1.04 },
      eyebrow: { family: G.instrumentSans, weight: 600, tracking: "0.28em" },
      support: { family: G.instrumentSans, weight: 400 },
      cta: { family: G.instrumentSans, weight: 600, tracking: "0.14em" },
    },
  },
  {
    id: "grotesque",
    label: "Modern grotesque",
    note: "Bricolage Grotesque at weight, the turn dropping into a Newsreader italic.",
    faces: {
      display: { family: G.bricolage, weight: 800, tracking: "-0.03em", scale: 1.02 },
      action: { family: G.newsreader, weight: 400, italic: true, scale: 1.1 },
      eyebrow: { family: G.schibsted, weight: 600, tracking: "0.3em" },
      support: { family: G.schibsted, weight: 400 },
      cta: { family: G.schibsted, weight: 600, tracking: "0.14em" },
    },
  },
  {
    id: "couture",
    label: "High contrast",
    note: "Bodoni Moda with a fine italic turn; Spectral for the supporting line.",
    faces: {
      display: { family: G.bodoni, weight: 700, tracking: "-0.01em", scale: 1.04 },
      action: { family: G.bodoni, weight: 500, italic: true, scale: 1.04 },
      eyebrow: { family: G.schibsted, weight: 500, tracking: "0.34em" },
      support: { family: G.spectral, weight: 400 },
      cta: { family: G.schibsted, weight: 600, tracking: "0.16em" },
    },
  },
  {
    id: "press",
    label: "Condensed press",
    note: "Big Shoulders Display caps at newspaper scale, the turn in a Newsreader italic.",
    faces: {
      display: { family: G.bigShoulders, weight: 800, tracking: "-0.005em", caps: true, scale: 1.12 },
      action: { family: G.newsreader, weight: 400, italic: true, caps: false, scale: 0.82 },
      eyebrow: { family: G.chivo, weight: 700, tracking: "0.3em" },
      support: { family: G.chivo, weight: 400 },
      cta: { family: G.chivo, weight: 700, tracking: "0.16em" },
    },
  },
  {
    id: "literary",
    label: "Literary",
    note: "EB Garamond throughout, the turn in its own italic — quiet and read-first.",
    faces: {
      display: { family: G.garamond, weight: 600, tracking: "-0.006em", scale: 1.14 },
      action: { family: G.garamond, weight: 500, italic: true, scale: 1.12 },
      eyebrow: { family: G.chivo, weight: 500, tracking: "0.3em" },
      support: { family: G.garamond, weight: 400 },
      cta: { family: G.chivo, weight: 600, tracking: "0.14em" },
    },
  },
  {
    id: "technical",
    label: "Technical",
    note: "Familjen Grotesk with a Spectral italic turn; small type in IBM Plex Mono.",
    faces: {
      display: { family: G.familjen, weight: 700, tracking: "-0.026em", scale: 1.02 },
      action: { family: G.spectral, weight: 400, italic: true, scale: 1.06 },
      eyebrow: { family: F.plex, weight: 500, tracking: "0.26em" },
      support: { family: F.plex, weight: 400 },
      cta: { family: F.plex, weight: 500, tracking: "0.14em" },
    },
  },
  {
    id: "statement",
    label: "Statement",
    note: "Unbounded as a display voice, Fraunces italic for the turn, Gabarito underneath.",
    faces: {
      display: { family: G.unbounded, weight: 700, tracking: "-0.03em", scale: 0.92 },
      action: { family: F.fraunces, weight: 400, italic: true, scale: 1.12 },
      eyebrow: { family: G.gabarito, weight: 600, tracking: "0.28em" },
      support: { family: G.gabarito, weight: 400 },
      cta: { family: G.gabarito, weight: 600, tracking: "0.14em" },
    },
  },
  {
    id: "humanist",
    label: "Humanist",
    note: "Epilogue with a DM Serif Display turn — plain, warm, corporate-safe.",
    faces: {
      display: { family: G.epilogue, weight: 700, tracking: "-0.028em", scale: 1.02 },
      action: { family: G.dmserif, weight: 400, italic: true, scale: 1.08 },
      eyebrow: { family: G.epilogue, weight: 600, tracking: "0.3em" },
      support: { family: G.epilogue, weight: 400 },
      cta: { family: G.epilogue, weight: 600, tracking: "0.14em" },
    },
  },
  {
    id: "caslon",
    label: "Caslon display",
    note: "Libre Caslon Display set large with a Cardo italic turn; Alegreya Sans for the small type.",
    faces: {
      display: { family: G.caslon, weight: 400, tracking: "-0.012em", scale: 1.08 },
      action: { family: G.cardo, weight: 400, italic: true, scale: 1.08 },
      eyebrow: { family: G.alegreyaSans, weight: 700, tracking: "0.3em" },
      support: { family: G.alegreyaSans, weight: 400 },
      cta: { family: G.alegreyaSans, weight: 700, tracking: "0.16em" },
    },
  },
  {
    id: "gallery",
    label: "Gallery caps",
    note: "Italiana in wide caps like exhibition signage, the turn falling into a Cardo italic.",
    faces: {
      display: { family: G.italiana, weight: 400, tracking: "0.06em", caps: true, scale: 1.12 },
      action: { family: G.cardo, weight: 400, italic: true, caps: false, scale: 0.88 },
      eyebrow: { family: G.syncopate, weight: 400, tracking: "0.34em" },
      support: { family: G.cardo, weight: 400 },
      cta: { family: G.syncopate, weight: 700, tracking: "0.2em" },
    },
  },
  {
    id: "billposter",
    label: "Bill poster",
    note: "Fjalla One caps stacked tight, with a Petrona italic turn — street-poster weight.",
    faces: {
      display: { family: G.fjalla, weight: 400, tracking: "0.002em", caps: true, scale: 1.12 },
      action: { family: G.petrona, weight: 400, italic: true, caps: false, scale: 0.84 },
      eyebrow: { family: G.darker, weight: 800, tracking: "0.26em" },
      support: { family: G.petrona, weight: 400 },
      cta: { family: G.darker, weight: 800, tracking: "0.18em" },
    },
  },
  {
    id: "revival",
    label: "Didone revival",
    note: "Rozha One as a heavy didone display, Vollkorn italic for the turn.",
    faces: {
      display: { family: G.rozha, weight: 400, tracking: "-0.014em", scale: 0.98 },
      action: { family: G.vollkorn, weight: 400, italic: true, scale: 1.06 },
      eyebrow: { family: G.alegreyaSans, weight: 500, tracking: "0.32em" },
      support: { family: G.vollkorn, weight: 400 },
      cta: { family: G.alegreyaSans, weight: 700, tracking: "0.16em" },
    },
  },
  {
    id: "engineered",
    label: "Engineered wide",
    note: "Michroma at small display size — engineered, wide, technical — with a Petrona italic turn.",
    faces: {
      display: { family: G.michroma, weight: 400, tracking: "-0.01em", scale: 0.74 },
      action: { family: G.petrona, weight: 400, italic: true, scale: 1.18 },
      eyebrow: { family: G.syncopate, weight: 400, tracking: "0.3em" },
      support: { family: F.geist, weight: 400 },
      cta: { family: G.syncopate, weight: 700, tracking: "0.18em" },
    },
  },
  {
    id: "bookface",
    label: "Book face",
    note: "Alegreya across the whole frame — long-read typography, the turn in its own italic.",
    faces: {
      display: { family: G.alegreya, weight: 700, tracking: "-0.008em", scale: 1.12 },
      action: { family: G.alegreya, weight: 500, italic: true, scale: 1.1 },
      eyebrow: { family: G.alegreyaSans, weight: 700, tracking: "0.3em" },
      support: { family: G.alegreya, weight: 400 },
      cta: { family: G.alegreyaSans, weight: 700, tracking: "0.14em" },
    },
  },
  {
    id: "ornament",
    label: "Ornamental",
    note: "Yeseva One's high-contrast display curves, cooled by an Alegreya Sans supporting line.",
    faces: {
      display: { family: G.yeseva, weight: 400, tracking: "-0.01em", scale: 1.0 },
      action: { family: G.cardo, weight: 400, italic: true, scale: 1.06 },
      eyebrow: { family: G.alegreyaSans, weight: 500, tracking: "0.34em" },
      support: { family: G.alegreyaSans, weight: 400 },
      cta: { family: G.alegreyaSans, weight: 700, tracking: "0.16em" },
    },
  },
  {
    id: "compressed",
    label: "Compressed sans",
    note: "Darker Grotesque compressed to headline height, the turn set in a Vollkorn italic.",
    faces: {
      display: { family: G.darker, weight: 800, tracking: "-0.012em", scale: 1.2 },
      action: { family: G.vollkorn, weight: 400, italic: true, scale: 0.9 },
      eyebrow: { family: G.alegreyaSans, weight: 700, tracking: "0.28em" },
      support: { family: G.alegreyaSans, weight: 400 },
      cta: { family: G.alegreyaSans, weight: 700, tracking: "0.16em" },
    },
  },
  {
    id: "monoset",
    label: "Monospaced dossier",
    note: "IBM Plex Mono as the display voice — evidence-log typography — with a Petrona italic turn.",
    faces: {
      display: { family: F.plex, weight: 500, tracking: "-0.03em", scale: 0.9 },
      action: { family: G.petrona, weight: 400, italic: true, scale: 1.16 },
      eyebrow: { family: F.plex, weight: 500, tracking: "0.24em" },
      support: { family: F.plex, weight: 400 },
      cta: { family: F.plex, weight: 500, tracking: "0.14em" },
    },
  },
];

/** Re-voice a layout's house treatment in the chosen type set. */
export function applyAlongsideTypeSet(
  base: AlongsideTypeTreatment,
  setId: string,
): AlongsideTypeTreatment {
  const set = LEGAL_ALONGSIDE_TYPESETS.find((s) => s.id === setId);
  if (!set?.faces) return base;
  const f = set.faces;
  return {
    display: {
      ...base.display,
      family: f.display.family,
      weight: f.display.weight,
      tracking: f.display.tracking ?? base.display.tracking,
      caps: f.display.caps ?? base.display.caps,
      scale: base.display.scale * (f.display.scale ?? 1),
    },
    action: {
      ...base.action,
      family: f.action.family,
      weight: f.action.weight,
      italic: f.action.italic,
      caps: f.action.caps ?? base.action.caps,
      tracking: f.action.tracking,
      scale: f.action.scale ?? base.action.scale,
    },
    eyebrow: {
      family: f.eyebrow.family,
      weight: f.eyebrow.weight,
      tracking: f.eyebrow.tracking ?? base.eyebrow.tracking,
    },
    support: {
      ...base.support,
      family: f.support.family,
      weight: f.support.weight,
      italic: f.support.italic,
    },
    cta: {
      ...base.cta,
      family: f.cta.family,
      weight: f.cta.weight,
      tracking: f.cta.tracking ?? base.cta.tracking,
    },
    note: set.note,
  };
}
