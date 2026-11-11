// San Juan Bowl social calendar, imported from the team's calendar spreadsheet
// (San_Juan_Bowl_Social_Media_Social_Calendar, Nov 10 2026). Each post gets Canva
// designs in five looks (dark, light, Set 2, Set 3, Set 4), in
// three sizes. Design IDs live in sjb-social-calendar-designs.json; posts without
// an entry there have not been built in Canva yet.
import designs from "./sjb-social-calendar-designs.json";
import { sjbIllustratorMaster } from "./sjb-illustrator-masters";

export type SjbCalendarMode = "dark" | "light" | "set2" | "set3" | "set4";
export const SJB_CALENDAR_MODES: { id: SjbCalendarMode; label: string }[] = [
  // Dark (gold player) retired from the calendar Nov 2026; registry entries and Canva files are kept.
  { id: "light", label: "Light (light action)" },
  { id: "set2", label: "Set 2 (night grandstand)" },
  { id: "set3", label: "Set 3 (player spotlight)" },
  { id: "set4", label: "Set 4 (stadium + field)" },
];
export type SjbCalendarSize = "1350" | "1080" | "1920";
export const SJB_CALENDAR_SIZES: { id: SjbCalendarSize; label: string; w: number; h: number }[] = [
  { id: "1350", label: "Feed", w: 1080, h: 1350 },
  { id: "1080", label: "Square", w: 1080, h: 1080 },
  { id: "1920", label: "Story", w: 1080, h: 1920 },
];
export const SJB_CALENDAR_PHASES = ["Launch", "Build", "Sell", "Matchup", "Game week", "Unscheduled phase"] as const;

export interface SjbCalendarPost {
  n: string;
  itemId: string;
  title: string;
  brief: string;
  status: string;
  /** ISO date, or null when the sheet has no post date. */
  date: string | null;
  phase: (typeof SJB_CALENDAR_PHASES)[number];
  channel: string;
  owners: string;
  /** Headline used on the artwork. */
  headline: [string, string];
  /** What the artwork still needs before it can go out. */
  waitingOn?: string;
  /** Approved caption from the sheet's updates tab. */
  caption?: string;
}

const C3 = `From the World Baseball Classic and MLB games to major concerts, Hiram Bithorn Stadium has seen its share of big moments. ⚾🎶

And this December, it's adding something new to the lineup: college football! 🏈

For the first time, the iconic San Juan venue will be transformed into a football stadium as teams from the ACC and the Sun Belt Conference take the field for the inaugural TransPerfect San Juan Bowl.

A new sport. A new chapter. And another big moment for San Juan.

🏈 TransPerfect San Juan Bowl
📅 December 16, 2026
📍 Hiram Bithorn Stadium, San Juan
🎟️ Learn more and get your tickets: https://www.sanjuanbowl.com/

#TransPerfectSanJuanBowl #CollegeFootball #PuertoRico`;
const C4 = `San Juan has long been part of our story. This December, we're adding college football to the mix! 🏈🇵🇷

With a major office in the city and several members of our executive leadership team calling San Juan home, our ties to Puerto Rico run deep.

Now we're building on that connection by bringing postseason college football to the island for the first time with the inaugural TransPerfect San Juan Bowl.

It's the start of a new college football tradition in Puerto Rico, and we'd love to see you there when it all kicks off!

🏈 TransPerfect San Juan Bowl
📅 December 16, 2026
📍 Hiram Bithorn Stadium, San Juan
🎟️ Get your tickets: https://www.sanjuanbowl.com/

#TransPerfectSanJuanBowl #CollegeFootball #PuertoRico`;
const CTV = `We've got a new play to announce… 🏈📺

The inaugural TransPerfect San Juan Bowl is coming to CBS Sports Network!

Tune in December 16 at 6:30 PM ET as postseason college football makes its Puerto Rico debut, live from Hiram Bithorn Stadium in San Juan. 🇵🇷

Catch the action on CBS Sports Network or stream it on the CBS Sports app. Better yet, join us in person!

🏈 TransPerfect San Juan Bowl
📅 December 16, 2026 | 6:30 PM ET
📍 Hiram Bithorn Stadium, San Juan
🎟️ Get your tickets: https://www.sanjuanbowl.com/

#TransPerfectSanJuanBowl #CollegeFootball #PuertoRico #CBSSportsNetwork`;
const CCD = `Your Saturday football lineup is looking pretty good. 🏈

Just wait until December 16! 🇵🇷

We're officially 32 days away from the inaugural TransPerfect San Juan Bowl, when postseason action makes its Puerto Rico debut!

Teams from the ACC and the Sun Belt Conference will face off under the lights at Hiram Bithorn Stadium in San Juan.

Who's ready for bowl season? 🙌

🏈 TransPerfect San Juan Bowl
📅 December 16, 2026 | 6:30 PM ET
📍 Hiram Bithorn Stadium, San Juan
🎟️ Get your tickets: https://www.sanjuanbowl.com/

#TransPerfectSanJuanBowl #CollegeFootball #PuertoRico`;

const P = (n: string, itemId: string, title: string, brief: string, status: string, date: string | null, phase: SjbCalendarPost["phase"], owners: string, headline: [string, string], extra: Partial<SjbCalendarPost> = {}): SjbCalendarPost =>
  ({ n, itemId, title, brief, status: status || "No status", date, phase, channel: "Facebook, Insta", owners, headline, ...extra });

const JK = "Justin Weir, Kristie Gavrilos";
const HS = "Hal Bowles, Sara Schweiger";

// The sheet's "test" row (item 13458313348) is left out.
export const SJB_CALENDAR_POSTS: SjbCalendarPost[] = [
  P("27", "13481682644", "TV announcement", "Excitement around announcing the TV channel; posted Saturday during the games.", "Approved/Ready", "2026-11-07", "Launch", JK, ["LIVE ON CBS", "SPORTS NETWORK"], { caption: CTV, phase: "Unscheduled phase" }),
  P("02", "13455938265", "Tickets reminder", "48-hr on-sale reminder: tickets + Add to Calendar on sanjuanbowl.com.", "Not Started", "2026-11-08", "Launch", "", ["TICKETS ON SALE", "SANJUANBOWL.COM"]),
  P("03", "13455938266", "Hiram Bithorn: from WBC to college football", "Carousel: 2026 World Baseball Classic, MLB, concerts, now football (first time football).", "Approved/Ready", "2026-11-09", "Launch", JK, ["FROM WBC TO", "COLLEGE FOOTBALL"], { caption: C3 }),
  P("04", "13455938267", "Meet the title partner", "TransPerfect's San Juan roots and 2020–24 Music City Bowl history.", "Approved/Ready", "2026-11-12", "Launch", JK, ["SAN JUAN ROOTS.", "NEW TRADITION."], { caption: C4 }),
  P("29", "13509753293", "Countdown post", "Days until game, based on Saturday Nov 14 (posted during the games).", "Approved/Ready", "2026-11-12", "Unscheduled phase", JK, ["32 DAYS", "TO GO"], { caption: CCD }),
  P("05", "13455938286", "Bowl eligibility watch", "Carousel of ACC and Sun Belt teams near eligibility. Reusable weekly template.", "Not Started", "2026-11-15", "Launch", "", ["BOWL ELIGIBILITY", "WATCH · WEEK 1"], { waitingOn: "Team list and logos for the carousel slides" }),
  P("06", "13455938287", "30 days to kickoff", "Countdown graphic. Weekly Stories countdown to Dec 16, then daily.", "Not Started", "2026-11-16", "Build", "", ["30 DAYS", "TO KICKOFF"]),
  P("08", "13455938289", "Bowl eligibility watch", "Weekly template update.", "Not Started", "2026-11-22", "Build", "", ["BOWL ELIGIBILITY", "WATCH · WEEK 2"], { waitingOn: "Updated team list" }),
  P("09", "13455938290", "Give the game for the holidays", "Gift angle: bowl tickets as a holiday gift. Link to Ticketera.", "Ready For Content", "2026-11-23", "Sell", HS, ["GIVE THE GAME", "THIS HOLIDAY"]),
  P("10", "13455938291", "Thanksgiving", "Bilingual thank-you, Stories only.", "Ready For Content", "2026-11-26", "Sell", HS, ["HAPPY THANKSGIVING", "¡FELIZ ACCIÓN DE GRACIAS!"]),
  P("12", "13455938293", "Who could come to San Juan", "Every eligible ACC and Sun Belt team. Ask fans to tag their school.", "Not Started", "2026-11-29", "Sell", "", ["WHO'S COMING", "TO SAN JUAN?"], { waitingOn: "Eligible team list and logos" }),
  P("14", "13455938358", "Sunday we find out", "Explainer: how teams are picked and when the matchup drops.", "Ready For Content", "2026-12-02", "Sell", HS, ["SUNDAY", "WE FIND OUT"]),
  P("15", "13455938359", "Matchup reveal", "Biggest post. Pre-built template for every possible team; post within minutes of the official announcement.", "Not Started", "2026-12-06", "Matchup", "", ["[ACC TEAM] VS", "[SUN BELT TEAM]"], { waitingOn: "Official matchup — team names are placeholders" }),
  P("16", "13455938360", "Matchup preview", "Records, key players, history.", "Not Started", "2026-12-07", "Matchup", "", ["MATCHUP", "PREVIEW"], { waitingOn: "Matchup, records and key players" }),
  P("17", "13455938361", "Traveling fan guide", "Flights (no passport needed for US citizens), hotels, where to eat, tickets. Tag both fan bases.", "Ready For Content", "2026-12-08", "Matchup", HS, ["TRAVELING", "FAN GUIDE"]),
  P("18", "13455938362", "Welcome videos", "Coach/player 'see you in San Juan' clips from school SIDs.", "Not Started", "2026-12-09", "Matchup", "", ["SEE YOU IN", "SAN JUAN"], { waitingOn: "Video clips from the schools" }),
  P("20", "13455938364", "Teams land in San Juan", "Arrival photos/video, bilingual welcome.", "Not Started", "2026-12-12", "Matchup", "", ["WELCOME TO SAN JUAN", "¡BIENVENIDOS!"], { waitingOn: "Arrival photos or video" }),
  P("21", "13455938365", "Bowl week day 1", "Practice + team outing in Old San Juan.", "Not Started", "2026-12-14", "Game week", "", ["BOWL WEEK", "DAY 1"], { waitingOn: "Practice and outing photos" }),
  P("22", "13455938366", "1 day to go", "Final countdown + media day quotes.", "Not Started", "2026-12-15", "Game week", "", ["1 DAY", "TO GO"]),
  P("23", "13455948625", "Game day info", "Gates, parking, bag policy, kickoff (confirm time), how to watch. Pin it.", "Not Started", "2026-12-16", "Game week", "", ["GAME DAY", "INFO"], { waitingOn: "Gate and parking details" }),
  P("24", "13455948626", "Live game coverage", "X + Stories live; one feed post for the final score.", "Not Started", "2026-12-16", "Game week", "", ["FINAL", "00 – 00"], { waitingOn: "Final score — numbers are placeholders" }),
  P("25", "13455911926", "Recap and gracias", "Highlight reel; thank fans, city, partners.", "Not Started", "2026-12-17", "Game week", "", ["¡GRACIAS,", "SAN JUAN!"], { waitingOn: "Game photos for the highlight reel" }),
  P("01", "13455938264", "Why San Juan", "15-sec B-roll: Old San Juan, beach, Hiram Bithorn at night. 'One night. One game. Under the lights.' End card: tickets.", "Pending", null, "Launch", "", ["ONE NIGHT.", "ONE GAME."], { waitingOn: "B-roll video (these designs are the end card)" }),
  P("07", "13455938288", "Field conversion", "Baseball diamond becoming a football field: before/after or time-lapse. Skip if no access.", "Pending", null, "Build", "", ["DIAMOND TO", "GRIDIRON"], { waitingOn: "Before/after photos of the field" }),
  P("11", "13455938292", "Black Friday offer", "Only if there's a real ticket or hotel offer; otherwise skip.", "Pending", null, "Sell", "", ["BLACK FRIDAY", "OFFER TBC"], { waitingOn: "A confirmed ticket or hotel offer" }),
  P("13", "13455938294", "Cyber Monday tickets", "Last ticket push before matchup.", "Pending", null, "Sell", "", ["CYBER MONDAY", "GET YOUR TICKETS"]),
  P("19", "13455938363", "Field reveal", "Finished football field at Hiram Bithorn.", "Pending", null, "Matchup", "", ["THE FIELD", "IS READY"], { waitingOn: "Photo of the finished field" }),
  P("28", "13483557621", "San Juan top things to do", "Historical sites, restaurants, beaches and more to visit while there.", "", null, "Launch", "", ["SAN JUAN", "TOP THINGS TO DO"], { waitingOn: "Choice of places to feature" }),
];

// Cleaned (AI-label-free) Canva exports, one pointer per design id.
const PREVIEW_POINTERS = import.meta.glob<{ url: string }>("../assets/sjb-calendar/*.jpg.asset.json", { eager: true, import: "default" });
export const SJB_CALENDAR_PREVIEWS: Record<string, string> = Object.fromEntries(
  Object.entries(PREVIEW_POINTERS).map(([path, ptr]) => [path.split("/").pop()!.replace(".jpg.asset.json", ""), ptr.url]),
);

type DesignMap = Record<string, Partial<Record<SjbCalendarMode, Partial<Record<SjbCalendarSize, string>>>>>;
const DESIGNS = designs as DesignMap;

export function sjbCalendarDesign(n: string, mode: SjbCalendarMode, size: SjbCalendarSize) {
  const id = DESIGNS[n]?.[mode]?.[size];
  if (!id) return null;
  return { id, canvaUrl: `https://www.canva.com/design/${id}/edit`, illustratorUrl: sjbIllustratorMaster(id),
    previewUrl: SJB_CALENDAR_PREVIEWS[id] ?? null,
    downloadUrl: SJB_CALENDAR_PREVIEWS[id] ?? null,
    downloadName: `san-juan-bowl-calendar-${n}-${mode}-${size}.jpg` };
}
export function sjbCalendarBuilt(n: string) {
  return Boolean(DESIGNS[n] && Object.keys(DESIGNS[n]).length);
}
