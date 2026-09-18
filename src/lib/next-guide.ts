// -----------------------------------------------------------------------------
// NEXT delegate guide — the printed "YOUR GUIDE" handout, one per event location.
//
// This module owns only the shape of a guide and the London 2026 starting
// content. The three builders (press PDF, Word, PowerPoint) read the same model,
// so a change made in the studio shows up in every output.
//
// Every block is a plain editable record: nothing here is generated copy and
// nothing is invented. The London seed is transcribed from the approved
// "TPNEXT your guide" master, and the event facts it prints come from
// NEXT_EVENT / LONDON_VENUE rather than being retyped.
// -----------------------------------------------------------------------------

import { NEXT_APP_ORIGIN, NEXT_EVENT } from "@/lib/next-event";
import { GUIDE_LOOK_NOTE, type GuideAccentId, type GuideGroundId } from "@/lib/next-guide-theme";


/** Handout stock. A guide never prints at board size. */
export type GuideSizeId = "a4" | "us-letter";

export const GUIDE_SIZES: {
  id: GuideSizeId;
  name: string;
  /** Trim in millimetres. */
  trimW: number;
  trimH: number;
  note: string;
}[] = [
  { id: "a4", name: "A4 · 210 × 297 mm", trimW: 210, trimH: 297, note: "European delegate bag." },
  {
    id: "us-letter",
    name: "US Letter · 8.5 × 11 in",
    trimW: 215.9,
    trimH: 279.4,
    note: "US delegate bag.",
  },
];

export function guideSize(id: GuideSizeId) {
  return GUIDE_SIZES.find((s) => s.id === id) ?? GUIDE_SIZES[0]!;
}

/** Where the guide is for. Printed on the cover and the practical page. */
export type GuideLocation = {
  city: string;
  venue: string;
  address: string;
  dates: string;
  wifi: string;
  supportEmail: string;
  siteUrl: string;
};

export type GuideItem = { id: string; label: string; body: string };
export type GuideRow = { id: string; time: string; item: string };
export type GuideDay = { id: string; name: string; rows: GuideRow[] };
export type GuideFloor = { id: string; name: string; room: string; lines: string[] };
export type GuideLink = { id: string; label: string; url: string };

/**
 * The look choices every page carries. They are optional so a guide saved
 * before the master design landed still opens, and simply takes the defaults.
 */
export type GuideStyle = {
  ground?: GuideGroundId;
  /** Display colour for headings and rules on this page. */
  accent?: GuideAccentId;
  /** Photograph from the guide library. */
  imageId?: string;
  /** Where the photograph sits on the page. */
  imagePlace?: "band" | "side" | "hero" | "none";
  /** Vertical label down the inside edge, as the master uses. */
  sidebar?: string;
  /** Small white QR card. */
  qrLabel?: string;
  qrUrl?: string;
};

type GuideBlockCore =
  | {
      id: string;
      kind: "cover";
      eyebrow: string;
      title: string;
      strapline: string;
      theme: string;
      footnote: string;
      /** Text inside the yellow date disc. */
      disc?: string;
    }
  | { id: string; kind: "welcome"; title: string; body: string; byline: string; note: string }
  | { id: string; kind: "info"; title: string; standfirst: string; items: GuideItem[] }
  | { id: string; kind: "schedule"; title: string; standfirst: string; days: GuideDay[] }
  | {
      id: string;
      kind: "keynote";
      eyebrow: string;
      name: string;
      talkTitle: string;
      when: string;
      body: string;
    }
  | { id: string; kind: "list"; title: string; standfirst: string; items: GuideItem[] }
  | { id: string; kind: "floors"; title: string; standfirst: string; floors: GuideFloor[] }
  | { id: string; kind: "links"; title: string; standfirst: string; links: GuideLink[] }
  | { id: string; kind: "closing"; title: string; standfirst: string };

export type GuideBlock = GuideBlockCore & GuideStyle;

export type GuideBlockKind = GuideBlockCore["kind"];

export const GUIDE_BLOCK_LABELS: Record<GuideBlockKind, string> = {
  cover: "Cover",
  welcome: "Welcome letter",
  info: "Practical information",
  schedule: "Event at a glance",
  keynote: "Keynote",
  list: "List page",
  floors: "Floor directory",
  links: "Links and app",
  closing: "Back cover",
};


export type GuideConfig = {
  sizeId: GuideSizeId;
  location: GuideLocation;
  blocks: GuideBlock[];
};

/** A new empty block of the requested kind, ready to type into. */
export function guideNewBlock(kind: GuideBlockKind, seed = ""): GuideBlock {
  const id = `${kind}-${Math.random().toString(36).slice(2, 8)}`;
  switch (kind) {
    case "cover":
      return { id, kind, eyebrow: "", title: "YOUR GUIDE", strapline: "", theme: "", footnote: "" };
    case "welcome":
      return { id, kind, title: "Welcome", body: "", byline: "", note: "" };
    case "info":
      return { id, kind, title: seed || "Practical information", standfirst: "", items: [] };
    case "schedule":
      return { id, kind, title: seed || "Event at a glance", standfirst: "", days: [] };
    case "keynote":
      return { id, kind, eyebrow: "Meet our keynote", name: "", talkTitle: "", when: "", body: "" };
    case "list":
      return { id, kind, title: seed || "What's on", standfirst: "", items: [] };
    case "floors":
      return { id, kind, title: seed || "Explore the exhibits", standfirst: "", floors: [] };
    case "links":
      return { id, kind, title: seed || "Your agenda", standfirst: "", links: [] };
    case "closing":
      return { id, kind, title: seed || "", standfirst: "", ground: "gradient" };
  }

}

const item = (label: string, body: string): GuideItem => ({
  id: `i-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
  label,
  body,
});

const row = (time: string, it: string): GuideRow => ({
  id: `r-${time.replace(/[^0-9a-z]+/gi, "").toLowerCase()}-${it.slice(0, 6).toLowerCase()}`,
  time,
  item: it,
});

/** London 2026 — transcribed from the approved master guide. */
export const LONDON_GUIDE_LOCATION: GuideLocation = {
  city: "London",
  venue: "QEII Centre",
  address: "Broad Sanctuary, Westminster, London SW1P 3EE",
  dates: "24 & 25 September 2026",
  wifi: "TransPerfectNEXT (no password)",
  supportEmail: "next@transperfect.com",
  siteUrl: "www.transperfectnext.com/emea",
};

export function londonGuideConfig(): GuideConfig {
  return {
    sizeId: "a4",
    location: LONDON_GUIDE_LOCATION,
    blocks: [
      {
        id: "cover",
        kind: "cover",
        eyebrow: LONDON_GUIDE_LOCATION.dates,
        title: "YOUR GUIDE",
        strapline: "LEARN | CONNECT | DISCOVER | ELEVATE | ENJOY",
        theme: "BEYOND INTELLIGENCE",
        footnote: LONDON_GUIDE_LOCATION.siteUrl,
        disc: LONDON_GUIDE_LOCATION.dates.toUpperCase(),
        ground: "gradient",
        accent: "yellow",
        imageId: "facade",
        imagePlace: "band",
      },

      {
        id: "welcome",
        kind: "welcome",
        title: "Welcome to TransPerfectNEXT",
        body:
          "Thank you for spending two days with us. With 10 specialised programmes happening under one roof, there's a lot to explore. We hope you'll use this time to hear new perspectives, make valuable connections and come away with ideas you can put to work.",
        byline: "Matt Hauser · Chief Experience Officer, TransPerfect",
        note:
          "Friday, 25 September at 9:45 AM: join Matt for his keynote, \u201cBeyond Intelligence\u201d, in the Fleming Space (third floor).",
        ground: "gradient",
        accent: "yellow",
        imageId: "plenary",
        imagePlace: "side",
      },
      {
        id: "practical",
        kind: "info",
        title: "Practical information",
        standfirst: `Venue: ${LONDON_GUIDE_LOCATION.venue}, ${LONDON_GUIDE_LOCATION.address} · Event Wi-Fi: ${LONDON_GUIDE_LOCATION.wifi}`,
        ground: "gradient",
        accent: "yellow",
        sidebar: "NETWORK, EAT, DRINK",
        qrLabel: "Live chat support",
        qrUrl: `mailto:${LONDON_GUIDE_LOCATION.supportEmail}`,

        items: [
          item(
            "NEXTBREW Cafe · Ground floor",
            "Open from 11:30 AM Thursday and 9:00 AM Friday. Coffee, tea and light refreshments served on all floors throughout the event.",
          ),
          item(
            "Lunch · Third and fifth floors",
            "12:00–1:30 PM on Thursday and 11:45 AM–12:45 PM on Friday.",
          ),
          item(
            "Cocktail reception · Ground floor",
            "6:00–8:00 PM on Thursday. An open bar, light bites and live music after Thursday's sessions. All TransPerfectNEXT attendees are welcome.",
          ),
          item(
            "Live chat support",
            `Email ${LONDON_GUIDE_LOCATION.supportEmail}, find us at a help desk on the ground, second, third, fourth or fifth floor, or connect with us on WhatsApp for live chat support.`,
          ),
        ],
      },
      {
        id: "glance",
        kind: "schedule",
        title: "Event at a glance",
        standfirst: "Times are local to London.",
        ground: "gradient",
        accent: "yellow",
        sidebar: "AT A GLANCE",
        days: [
          {
            id: "thu",
            name: "Thursday, 24 September",
            rows: [
              row("11:30 AM", "Registration, networking and lunch"),
              row("1:30 PM", "Sessions begin"),
              row("6:00 PM", "Post-event cocktail party"),
              row("8:00 PM", "Event close"),
            ],
          },
          {
            id: "fri",
            name: "Friday, 25 September",
            rows: [
              row("9:00 AM", "Registration, coffee and networking"),
              row("9:45 AM", "Keynotes: Beyond Intelligence & Will Guidara"),
              row("11:45 AM", "Lunch"),
              row("3:00 PM", "Event close"),
            ],
          },
        ],
      },
      {
        id: "keynote",
        kind: "keynote",
        eyebrow: "Meet our keynote",
        name: "Will Guidara",
        talkTitle: "Unreasonable Brands",
        when: "Friday, 25 September · 10:30 AM",
        body:
          "For most of America's history we functioned as a manufacturing economy; now we're a service economy, with more than three-quarters of GDP coming from service. Whether you're in retail, finance, education, healthcare, computer services or communications, you are in the business of serving other people. Making good products is no longer enough, and serving efficiently is no longer enough — now it's how you make the people you work with, and those you serve, feel that matters most of all. In this talk Will shares why he believes our world is on the precipice of becoming a hospitality economy, and how every business can choose to be in the business of hospitality by turning ordinary transactions into extraordinary experiences.",
        ground: "gradient",
        accent: "yellow",
        imageId: "plenary",
        imagePlace: "hero",
      },
      {
        id: "whats-on",
        kind: "list",
        title: "What's on",
        standfirst:
          "The sessions and speakers may be the main attraction, but there are plenty of other ways to connect, learn and explore.",
        ground: "gradient",
        accent: "yellow",
        imageId: "churchill",
        imagePlace: "band",

        items: [
          item(
            "Innovation Lounge · Churchill, ground floor",
            "Meet the experts behind GlobalLink. Test-drive GlobalLink Web, Strings, TV, NOW, Media Creator and TransPerfect Aura, with our teams on hand to answer questions.",
          ),
          item(
            "Innovation Stage",
            "Short, interactive presentations and live demos featuring GlobalLink LIVE, GlobalLink ONE, GlobalLink Coach, GlobalLink Aura and Media Creator.",
          ),
          item(
            "Meet with a NEXTpert",
            "Every global content programme is different. Meet one-on-one with a NEXTpert for guidance tailored to your goals. Visit the NEXTpert Exchange desk in the Innovation Lounge to schedule your session.",
          ),
          item(
            "GlobalLink pathway assessment",
            "Discover your GlobalLink profile and receive personalised recommendations for sessions and products to explore, plus NEXTperts to meet at the event.",
          ),
        ],
      },
      {
        id: "exhibits",
        kind: "floors",
        title: "Explore the exhibits",
        standfirst:
          "Visit the exhibit booths to explore TransPerfect solutions and the teams behind them.",
        ground: "gradient",
        accent: "green",
        sidebar: "EXPLORE THE EXHIBITS",
        imageId: "foyer",
        imagePlace: "band",
        floors: [
          {
            id: "third",
            name: "Third floor",
            room: "Britten",
            lines: [
              "Creative Content Production by The Mill",
              "Virtual Data Rooms",
              "Global Content and Performance Marketing",
              "Global Digital Experience",
              "Learning and Talent Development",
              "Legal Support and Compliance",
              "Live Customer Experience and Support",
              "Conference & Event Solutions: Live Comms and Interpretation",
              "Media Subtitling, Dubbing and Distribution",
            ],
          },
          {
            id: "fifth",
            name: "Fifth floor",
            room: "Cambridge",
            lines: [
              "Medical Writing",
              "Commercialization, Delivery and Performance",
              "Live Customer Experience and Support",
              "Conference & Event Solutions: Live Comms and Interpretation",
              "COA",
              "Integrated Veeva Translation Management",
              "NEXTLab by Trial Interactive",
            ],
          },
        ],
      },
      {
        id: "programmes",
        kind: "list",
        title: "The 10 programmes",
        standfirst:
          "TransPerfectNEXT is a collection of events built around the people, industries and technologies shaping global performance. Your registration gives you access to all 10 specialised events on site, so move between tracks and sessions based on your interests.",
        ground: "gradient",
        accent: "yellow",
        sidebar: "THE 10 PROGRAMMES",
        items: [
          item(
            "Global content",
            "Exploring how AI is shaping the next era of global content — and moving beyond intelligence to transform how content is created, managed and delivered.",
          ),
          item(
            "Legal",
            "Candid conversations about how AI is reshaping legal services, and how leading organisations are responding to new challenges around client service, pricing and data.",
          ),
          item(
            "Learning and talent",
            "How senior L&D and enterprise leaders are rethinking global learning in an AI-driven world and scaling content to maximise impact across markets.",
          ),
          item(
            "Media",
            "How AI and emerging technology are reshaping media workflows, from production and localisation through quality control and delivery.",
          ),
          item(
            "Life sciences",
            "How AI is being operationalised across pharma, biotech and medical devices, with deployments that must withstand validation, oversight and regulatory scrutiny.",
          ),
          item(
            "Data",
            "Behind the data powering the next generation of AI: how organisations collect, enrich and scale high-quality data for increasingly complex applications.",
          ),
          item(
            "Events",
            "How leading event teams build experiences that strengthen brands, deepen audience connections and drive business growth.",
          ),
          item(
            "Financial services",
            "From AI to underserved markets: how financial institutions are rethinking content, customer acquisition and language access to unlock their next wave of growth.",
          ),
          item(
            "Marketing",
            "How global marketers are building AI-driven strategies and adapting to a new era of discovery and performance shaped by AI search.",
          ),
          item(
            "Games",
            "Game developers and industry leaders examine how AI, new technologies and smarter operations are reshaping development and engagement.",
          ),
        ],
      },
      {
        id: "directory",
        kind: "floors",
        title: "Venue directory",
        standfirst: "Rooms and spaces in use across the QEII Centre.",
        ground: "navy",
        accent: "yellow",
        sidebar: "VENUE DIRECTORY",
        floors: [
          {
            id: "ground",
            name: "Ground floor",
            room: "Churchill · Brunel",
            lines: ["Registration", "GlobalLink Innovation Lounge & NEXTMart", "Lobby Cafe", "Coffee Bar"],
          },
          { id: "second", name: "Second floor", room: "Mountbatten", lines: ["Olivier", "Albert", "Gielgud", "Victoria"] },
          {
            id: "third-dir",
            name: "Third floor",
            room: "Fleming · Whittle · Britten",
            lines: ["Mealspace & Exhibition Hall"],
          },
          { id: "fourth", name: "Fourth floor", room: "St. James · Westminster · Wordsworth", lines: [] },
          {
            id: "fifth-dir",
            name: "Fifth floor",
            room: "Windsor · Cambridge",
            lines: ["LifeSciNEXT & OpTImize Mealspace & Exhibition Hall"],
          },
          { id: "sixth", name: "Sixth floor", room: "Mountbatten", lines: [] },
        ],
      },
      {
        id: "agenda-links",
        kind: "links",
        title: "Your agenda",
        standfirst:
          "Download the mobile app for the full event agenda. Your registration gives you access to all events, so explore the full agenda and discover sessions across TransPerfectNEXT.",
        ground: "gradient",
        accent: "yellow",
        qrLabel: "Event site",
        qrUrl: `https://${LONDON_GUIDE_LOCATION.siteUrl}`,
        links: [
          { id: "l-site", label: "Event site", url: `https://${LONDON_GUIDE_LOCATION.siteUrl}` },
          { id: "l-agenda", label: "All agendas", url: `${NEXT_APP_ORIGIN}/events/next/agendas` },
          { id: "l-support", label: "Support", url: `mailto:${LONDON_GUIDE_LOCATION.supportEmail}` },
        ],
      },
      {
        id: "closing",
        kind: "closing",
        title: "BEYOND INTELLIGENCE",
        standfirst: LONDON_GUIDE_LOCATION.siteUrl,
        ground: "gradient",
        accent: "yellow",
      },
    ],

  };
}

/** Empty guide for a location we have not filled in yet. */
export function guideDefault(location: Partial<GuideLocation> = {}): GuideConfig {
  return {
    sizeId: "a4",
    location: {
      city: "",
      venue: "",
      address: "",
      dates: "",
      wifi: "",
      supportEmail: "next@transperfect.com",
      siteUrl: "",
      ...location,
    },
    blocks: [guideNewBlock("cover"), guideNewBlock("welcome"), guideNewBlock("info")],
  };
}

export function guideSlug(config: GuideConfig, year = Number(NEXT_EVENT.startDate.slice(0, 4))): string {
  const city = (config.location.city || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `next-${city}-${year}-your-guide-${config.sizeId}`;
}

/** The printed running order, one entry per page. Long lists spill to more pages. */
export function guidePagePlan(config: GuideConfig): { id: string; label: string }[] {
  return config.blocks.map((b) => ({
    id: b.id,
    label:
      b.kind === "cover"
        ? "Cover"
        : b.kind === "keynote"
          ? `Keynote · ${b.name || "unnamed"}`
          : b.kind === "welcome"
            ? b.title || "Welcome"
            : b.title || GUIDE_BLOCK_LABELS[b.kind],
  }));
}

export function guidePageCount(config: GuideConfig): number {
  return guidePagePlan(config).length;
}

/** Provenance line every builder repeats. */
export const GUIDE_ARTWORK_NOTE = GUIDE_LOOK_NOTE;

