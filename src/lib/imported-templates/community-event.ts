// Client-side seed of the "Community Event" PowerPoint template (imported from
// a user-uploaded .pptx). Content is mapped onto our existing section /
// variant taxonomy so the deck is fully editable in the app — and every slide
// that supports imagery ships with a `mediaSeed` so the MediaTile system
// renders a real photo (not a blank fallback).
import type { TemplatePayload } from "../deck-store";

export const COMMUNITY_EVENT_TEMPLATE: TemplatePayload = {
  title: "Pulse Fest · Community Event Kit",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-product-pitch",
  subCompany: null,
  context: null,
  brief: {
    prospect: "Pulse Fest",
    industry: "Community & Events",
    audience: "Attendees, makers, partners",
    meetingObjective: "Invite the community to the annual gathering",
    lengthTarget: 20,
    clientFacts:
      "Three-day annual maker + community festival. Edition 09. Sep 12–14, 2026 at Riverside Park, Portland.",
  },
  slides: [
    {
      // Cinematic cover with photography behind the title.
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "",
      content: {
        kicker: "PULSE FEST · Annual Community Gathering",
        title: "Gather & Grow Together",
        subtitle: "Three days of makers, ideas, and the community that keeps them moving.",
        clientName: "Pulse Fest",
        date: "12–14 SEP 2026 · Portland",
        mediaSeed: "pulsefest-crowd-festival-lights",
      },
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "",
      content: {
        title: "Inside this deck",
        items: [
          { label: "About the gathering", body: "Why we exist & who shows up" },
          { label: "Keynote spotlight", body: "The voice opening the weekend" },
          { label: "Program timeline", body: "Three days, hour by hour" },
          { label: "Experience tracks", body: "Pick the path that fits you" },
          { label: "Impact in numbers", body: "What the community built" },
          { label: "Passes & pricing", body: "Choose your level of access" },
          { label: "Venue & travel", body: "Getting there and around" },
          { label: "Register & connect", body: "Claim your spot today" },
        ],
      },
    },
    {
      // Big editorial image with copy — sets the tone for the weekend.
      sectionId: "SF-03",
      variantId: "MV-IMG-FULL-BLEED",
      layoutId: "",
      content: {
        kicker: "The weekend",
        title: "A gathering built for people who make things happen.",
        body: "Three days, one park, dozens of sessions — and the collaborators you didn't know you were looking for.",
        mediaSeed: "pulsefest-outdoor-stage-golden-hour",
      },
    },
    {
      sectionId: "SF-03",
      variantId: "MV-CTX-STAT-GRID",
      layoutId: "",
      content: {
        title: "The weekend, by the numbers",
        items: [
          { value: "3", unit: "", label: "days of program" },
          { value: "40", unit: "+", label: "live sessions" },
          { value: "12", unit: "", label: "experience tracks" },
          { value: "60", unit: "+", label: "speakers & mentors" },
        ],
      },
    },
    {
      sectionId: "SF-05",
      variantId: "MV-IMG-PORTRAIT",
      layoutId: "",
      content: {
        name: "Maya Okonkwo",
        role: "Founder & Systems Thinker",
        quote: "Designing for momentum, not just moments.",
        narrative:
          "Maya builds tools that help communities organize themselves. She has spent a decade turning messy collective energy into things that ship — and she opens Pulse Fest with a talk on designing for momentum.",
        mediaSeed: "maya-okonkwo-founder-portrait-studio-warm",
      },
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-PHASES",
      layoutId: "",
      content: {
        title: "Three days, one rhythm",
        items: [
          {
            label: "Day 01 · Fri",
            body: "Doors & coffee · Opening keynote · Maker labs · Lightning talks",
          },
          {
            label: "Day 02 · Sat",
            body: "Morning jam · Track sessions · Hands-on workshops · Community dinner",
          },
          {
            label: "Day 03 · Sun",
            body: "Build sprint · Project showcase · Community awards · Closing circle",
          },
        ],
      },
    },
    {
      sectionId: "SF-06",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "",
      content: {
        title: "Pick your path",
        items: [
          {
            title: "Build & Make",
            body: "Hands-on labs where ideas become working prototypes. 14 sessions.",
            mediaSeed: "makers-workshop-hands-tools",
          },
          {
            title: "Lead & Organize",
            body: "Playbooks for running groups that actually keep moving. 9 sessions.",
            mediaSeed: "community-leaders-roundtable-discussion",
          },
          {
            title: "Tell & Share",
            body: "Turn your work into stories people want to pass on. 11 sessions.",
            mediaSeed: "storyteller-on-stage-microphone-warm",
          },
          {
            title: "Connect & Grow",
            body: "Slow rooms for meeting collaborators and mentors. 7 sessions.",
            mediaSeed: "small-group-coffee-conversation",
          },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "",
      content: {
        title: "What we built together — Edition 08",
        items: [
          { value: "140", unit: "", label: "sessions delivered", source: "Edition 08" },
          { value: "8,400", unit: "+", label: "total attendance", source: "Edition 08" },
          { value: "26", unit: "", label: "cities represented", source: "Edition 08" },
          { value: "310", unit: "", label: "projects shipped on-site", source: "Edition 08" },
        ],
      },
    },
    {
      // Divider now uses a media-forward section break.
      sectionId: "SF-01",
      variantId: "MV-IMG-QUOTE-BG",
      layoutId: "",
      content: {
        quote:
          "I arrived with half an idea and left with a team, a plan, and three people I now call friends.",
        attribution: "Lena Torres",
        role: "Second-time attendee · Community Lead, Austin",
        mediaSeed: "festival-crowd-hands-raised-warm",
      },
    },
    {
      // Six-up gallery of scenes from the floor — pure imagery.
      sectionId: "SF-05",
      variantId: "MV-IMG-GRID-6",
      layoutId: "",
      content: {
        title: "Scenes from the floor",
        items: [
          { caption: "Opening night", seed: "festival-opening-night-lights" },
          { caption: "Maker labs", seed: "hands-on-maker-workshop" },
          { caption: "Main stage", seed: "keynote-speaker-main-stage" },
          { caption: "Community dinner", seed: "long-table-community-dinner-outdoors" },
          { caption: "Mentor rooms", seed: "small-mentor-circle-notebook" },
          { caption: "Closing circle", seed: "closing-circle-outdoors-sunset" },
        ],
      },
    },
    {
      sectionId: "SF-13",
      variantId: "MV-COMM-PRICING",
      layoutId: "",
      content: {
        title: "Choose your level of access",
        items: [
          {
            name: "Community",
            price: "Free",
            unit: "volunteer entry",
            features: [
              "Access to the main stage",
              "Community dinner on Friday",
              "Digital session notes",
            ],
          },
          {
            name: "Maker",
            price: "$89",
            unit: "per full weekend",
            features: [
              "Everything in Community",
              "All hands-on workshop tracks",
              "Reserved lab seating",
              "Event app & directory",
            ],
          },
          {
            name: "Patron",
            price: "$179",
            unit: "per full weekend",
            features: [
              "Everything in Maker",
              "Speaker green-room access",
              "Front-row keynote seating",
              "Limited-edition merch drop",
            ],
          },
        ],
      },
    },
    {
      sectionId: "SF-10",
      variantId: "MV-DEC-COMPARE-TABLE",
      layoutId: "",
      content: {
        title: "The weekend at a glance",
        columns: [{ label: "Fri 12" }, { label: "Sat 13" }, { label: "Sun 14" }],
        items: [
          { criterion: "09:00", values: ["Welcome & coffee", "Morning jam", "Build sprint"] },
          { criterion: "11:00", values: ["Opening keynote", "Track sessions", "Project showcase"] },
          { criterion: "13:00", values: ["Maker labs", "Hands-on labs", "Community awards"] },
          { criterion: "15:00", values: ["Lightning talks", "Mentor rooms", "Closing circle"] },
          { criterion: "17:00", values: ["Sound check", "Community dinner", "Open mic night"] },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-QUOTE-MULTI",
      layoutId: "",
      content: {
        title: "Voices from the community",
        items: [
          {
            quote:
              "The rare event where hallway chats turn into real projects. I left with collaborators, not just contacts.",
            attribution: "Devon Park",
            role: "Product Designer",
            mediaSeed: "devon-park-designer-portrait",
          },
          {
            quote:
              "Every track felt hands-on. I shipped a working prototype before lunch on day two and demoed it that night.",
            attribution: "Amara Singh",
            role: "Indie Maker",
            mediaSeed: "amara-singh-maker-portrait",
          },
          {
            quote:
              "The most welcoming room I have organised in. People show up generous and leave a little braver.",
            attribution: "Theo Marsh",
            role: "Community Lead",
            mediaSeed: "theo-marsh-community-portrait",
          },
        ],
      },
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-FEATURE-LIST",
      layoutId: "",
      content: {
        title: "Frequently asked questions",
        items: [
          {
            label: "Do I need a ticket for every day?",
            body: "One pass covers all three days. Drop in for the sessions that fit your schedule.",
          },
          {
            label: "Are the workshops beginner friendly?",
            body: "Yes. Tracks are labelled by level, and mentors are on hand in every hands-on lab.",
          },
          {
            label: "What should I bring with me?",
            body: "Just a laptop and a curious mind. Maker kits and materials are provided on site.",
          },
          {
            label: "Is food included?",
            body: "Coffee, snacks and the Friday community dinner are included with every pass.",
          },
          {
            label: "Can I get a refund?",
            body: "Passes are transferable any time and fully refundable up to two weeks before the event.",
          },
          {
            label: "Will sessions be recorded?",
            body: "Keynotes and talks are recorded and shared with attendees within a week.",
          },
        ],
      },
    },
    {
      sectionId: "SF-11",
      variantId: "MV-DEC-CHECKLIST",
      layoutId: "",
      content: {
        title: "Pack light, arrive ready",
        items: [
          { label: "Laptop & charger", note: "For hands-on labs." },
          { label: "A refillable bottle", note: "Water stations on every floor." },
          { label: "Comfortable shoes", note: "Three days, lots of walking." },
          { label: "Business cards or a link", note: "For the people you will meet." },
          { label: "Your event app login", note: "Schedule, map and directory." },
          { label: "An open weekend", note: "The best moments are unplanned." },
        ],
      },
    },
    {
      // Venue block — with location imagery on the split.
      sectionId: "SF-03",
      variantId: "MV-IMG-SPLIT",
      layoutId: "",
      content: {
        title: "Find us at The Commons",
        body: "A restored warehouse turned community campus in the East Quarter — ten minutes from central station, with bike racks, an accessible venue, and a park across the street.",
        caption: "48 Maker Lane · East Quarter · Portland",
        mediaSeed: "restored-warehouse-community-venue-portland",
      },
    },
    {
      sectionId: "SF-12",
      variantId: "MV-TEAM-BIOS-4",
      layoutId: "",
      content: {
        title: "The crew making it happen",
        items: [
          {
            name: "Maya Okonkwo",
            role: "Festival Director",
            bio: "@maya",
            mediaSeed: "maya-okonkwo-director-portrait",
          },
          {
            name: "Ravi Desai",
            role: "Program & Tracks",
            bio: "@ravi",
            mediaSeed: "ravi-desai-program-portrait",
          },
          {
            name: "Nadia Cole",
            role: "Community & Care",
            bio: "@nadia",
            mediaSeed: "nadia-cole-community-portrait",
          },
          {
            name: "Sam Whitfield",
            role: "Space & Logistics",
            bio: "@sam",
            mediaSeed: "sam-whitfield-logistics-portrait",
          },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-LOGOS",
      layoutId: "",
      content: {
        title: "Our partners & friends",
        items: [
          { name: "Headline Partner A", sector: "Headline" },
          { name: "Headline Partner B", sector: "Headline" },
          { name: "Supporting Partner A", sector: "Supporting" },
          { name: "Supporting Partner B", sector: "Supporting" },
          { name: "Community Partner A", sector: "Community" },
          { name: "Community Partner B", sector: "Community" },
        ],
      },
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-CTA",
      layoutId: "",
      content: {
        title: "Get your pass.",
        message: "Get your pass.",
        nextSteps:
          "Three days, one community, and a weekend you will keep talking about. Spots are limited — lock yours in today.",
        owner: "Pulse Fest team",
        followUp: "pulsefest.events/2026",
        mediaSeed: "festival-audience-hands-raised-cta",
      },
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-THANKS",
      layoutId: "",
      content: {
        message: "Thank you.",
        title: "Thank you.",
        signoff: "Pulse Fest · See you in Portland",
      },
    },
  ],
};
