// Client-side seed of the "Community Event" PowerPoint template (imported from
// a user-uploaded .pptx). Content is mapped onto our existing section /
// variant taxonomy so the deck is fully editable in the app.
import type { TemplatePayload } from "../deck-store";

export const COMMUNITY_EVENT_TEMPLATE: TemplatePayload = {
  title: "Pulse Fest · Community Event Kit",
  brandModeId: "bm-masterbrand",
  archetypeId: "NA-01",
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
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-POSTER",
      layoutId: "LT-FULL",
      content: {
        kicker: "PULSE FEST · Annual Community Gathering",
        title: "Gather & Grow Together",
        meta: "12–14 SEP 2026 · Riverside Park, Portland · Edition 09",
      },
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "LT-FULL",
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
      sectionId: "SF-03",
      variantId: "MV-CTX-STAT-GRID",
      layoutId: "LT-FULL",
      content: {
        title: "A weekend built for people who make things happen",
        items: [
          { value: "3", unit: "", label: "days of program" },
          { value: "40", unit: "+", label: "live sessions" },
          { value: "12", unit: "", label: "experience tracks" },
        ],
      },
    },
    {
      sectionId: "SF-05",
      variantId: "MV-IMG-PORTRAIT",
      layoutId: "LT-FULL",
      content: {
        name: "Maya Okonkwo",
        role: "Founder & Systems Thinker",
        quote: "Designing for momentum, not just moments.",
        narrative:
          "Maya builds tools that help communities organize themselves. She has spent a decade turning messy collective energy into things that ship — and she opens Pulse Fest with a talk on designing for momentum.",
        mediaSeed: "maya-okonkwo",
      },
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-PHASES",
      layoutId: "LT-FULL",
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
      layoutId: "LT-FULL",
      content: {
        title: "Pick your path",
        items: [
          {
            title: "Build & Make",
            body: "Hands-on labs where ideas become working prototypes. 14 sessions.",
          },
          {
            title: "Lead & Organize",
            body: "Playbooks for running groups that actually keep moving. 9 sessions.",
          },
          {
            title: "Tell & Share",
            body: "Turn your work into stories people want to pass on. 11 sessions.",
          },
          {
            title: "Connect & Grow",
            body: "Slow rooms for meeting collaborators and mentors. 7 sessions.",
          },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "LT-FULL",
      content: {
        title: "What we built together",
        items: [
          { value: "140", unit: "", label: "sessions delivered", source: "Edition 08" },
          { value: "8,400", unit: "+", label: "total attendance", source: "Edition 08" },
          { value: "26", unit: "", label: "cities represented", source: "Edition 08" },
          { value: "310", unit: "", label: "projects shipped on-site", source: "Edition 08" },
        ],
      },
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-DIVIDER",
      layoutId: "LT-FULL",
      content: { kicker: "Scenes from the floor", title: "A weekend in motion" },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-TESTIMONIAL",
      layoutId: "LT-FULL",
      content: {
        quote:
          "I arrived with half an idea and left with a team, a plan, and three people I now call friends.",
        attribution: "Lena Torres",
        role: "Second-time attendee · Community Lead, Austin",
        metric: "",
      },
    },
    {
      sectionId: "SF-13",
      variantId: "MV-COMM-PRICING",
      layoutId: "LT-FULL",
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
      layoutId: "LT-FULL",
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
      layoutId: "LT-FULL",
      content: {
        title: "Voices from the community",
        items: [
          {
            quote:
              "The rare event where hallway chats turn into real projects. I left with collaborators, not just contacts.",
            attribution: "Devon Park",
            role: "Product Designer",
          },
          {
            quote:
              "Every track felt hands-on. I shipped a working prototype before lunch on day two and demoed it that night.",
            attribution: "Amara Singh",
            role: "Indie Maker",
          },
          {
            quote:
              "The most welcoming room I have organised in. People show up generous and leave a little braver.",
            attribution: "Theo Marsh",
            role: "Community Lead",
          },
        ],
      },
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-FEATURE-LIST",
      layoutId: "LT-FULL",
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
      layoutId: "LT-FULL",
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
      sectionId: "SF-03",
      variantId: "MV-CTX-CARDS-3",
      layoutId: "LT-FULL",
      content: {
        title: "Find us at The Commons",
        items: [
          {
            title: "Address",
            body: "48 Maker Lane, East Quarter — a restored warehouse turned community campus.",
          },
          {
            title: "Nearest transit",
            body: "Quarter Line · Commons stop. Ten minutes from the central station.",
          },
          {
            title: "Parking & access",
            body: "Free bike racks, paid lot next door. Full accessibility info on the event site.",
          },
        ],
      },
    },
    {
      sectionId: "SF-12",
      variantId: "MV-TEAM-BIOS-4",
      layoutId: "LT-FULL",
      content: {
        title: "The crew making it happen",
        items: [
          { name: "Maya Okonkwo", role: "Festival Director", bio: "@maya" },
          { name: "Ravi Desai", role: "Program & Tracks", bio: "@ravi" },
          { name: "Nadia Cole", role: "Community & Care", bio: "@nadia" },
          { name: "Sam Whitfield", role: "Space & Logistics", bio: "@sam" },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-LOGOS",
      layoutId: "LT-FULL",
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
      layoutId: "LT-FULL",
      content: {
        message: "Get your pass.",
        nextSteps:
          "Three days, one community, and a weekend you will keep talking about. Spots are limited — lock yours in today.",
        owner: "Pulse Fest team",
        followUp: "pulsefest.events/2026",
      },
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-CONTACT",
      layoutId: "LT-FULL",
      content: {
        title: "Stay in the loop",
        items: [
          {
            name: "Hello",
            role: "General enquiries",
            email: "hello@pulsefest.events",
            phone: "Newsletter: pulsefest.events/join",
          },
          {
            name: "Press",
            role: "Media & partnerships",
            email: "press@pulsefest.events",
            phone: "Schedule drops & speaker reveals",
          },
        ],
      },
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-THANKS",
      layoutId: "LT-FULL",
      content: { message: "Thank you.", signoff: "Pulse Fest · See you in Portland" },
    },
  ],
};
