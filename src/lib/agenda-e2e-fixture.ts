import { agendaDefault, type AgendaConfig, type AgendaSession } from "@/lib/next-agenda";

const s = (
  time: string,
  title: string,
  detail: string,
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

const dayOne: AgendaSession[] = [
  s("09:00", "Registration & coffee", "Fleming foyer, 3rd floor", { muted: true }),
  s("09:30", "Welcome — the year in language", "Main stage · Fleming Room", {
    track: "MAIN STAGE",
  }),
  s("10:15", "Breakout tracks", "Choose one — rooms as listed", {
    pin: true,
    parallels: [
      {
        time: "10:15",
        title: "Regulated content at speed",
        speaker: "Priya Raman, Life Sciences",
        detail: "Whittle Room · 3rd floor",
      },
      {
        time: "10:15",
        title: "Media localisation studio tour",
        speaker: "Tom Vasquez, TP Media",
        detail: "Burns Room · 2nd floor",
      },
      {
        title: "Legal review without the bottleneck",
        speaker: "Dana Fitzgerald, Legal",
        detail: "Mountbatten Room · 6th floor",
      },
    ],
  }),
  s("11:30", "Coffee & demo stands", "Pickwick gallery", { muted: true }),
  s("12:00", "Four-track deep dives", "Parallel sessions — all rooms in use", {
    parallels: [
      {
        title: "GlobalLink Now in production",
        speaker: "Ana Ruiz",
        detail: "Whittle Room",
      },
      {
        title: "Machine translation quality gates",
        speaker: "Ken Ohara",
        detail: "Burns Room",
      },
      {
        title: "Agency work at enterprise scale",
        speaker: "Marta Klein",
        detail: "Mountbatten Room",
      },
      {
        time: "12:10",
        title: "Trial Interactive clinical intake",
        speaker: "Sam Oyelaran",
        detail: "Abbey Room · starts ten minutes late",
      },
    ],
  }),
  s("13:15", "Lunch", "Pickwick", { muted: true }),
  s("14:15", "Customer panel — what buyers actually ask for", "Main stage", {
    track: "MAIN STAGE",
  }),
  s("15:30", "Two-track workshops", "Hands-on, laptops needed", {
    parallels: [
      { title: "Building a review workflow", speaker: "Ivan Petrov", detail: "Whittle Room" },
      { title: "Terminology that survives launch", speaker: "Lea Marchand", detail: "Burns Room" },
    ],
  }),
  s("17:00", "Drinks reception", "Fleming foyer", { muted: true }),
];

const dayTwo: AgendaSession[] = [
  s("09:15", "Day two opener", "Main stage · Fleming Room", { track: "MAIN STAGE" }),
  s("10:00", "Three-track clinics", "Bring a live project", {
    pin: true,
    parallels: [
      { title: "Content operations clinic", speaker: "Yusuf Demir", detail: "Whittle Room" },
      { title: "Games and player experience", speaker: "Nora Blake", detail: "Burns Room" },
      { title: "Digital campaign localisation", speaker: "Rafael Costa", detail: "Abbey Room" },
    ],
  }),
  s("11:15", "Coffee", "Pickwick gallery", { muted: true }),
  s("11:45", "Roadmap and what lands next", "Main stage", { track: "MAIN STAGE" }),
  s("12:45", "Close and lunch to go", "Fleming foyer", { muted: true }),
];

const base = agendaDefault("globallink");

export const E2E_AGENDA: AgendaConfig = {
  ...base,
  sizeId: "a2",
  face: "dark",
  eyebrow: "GLOBALLINK NEXT",
  title: "DAY ONE",
  meta: "24 September 2026 · QEII Centre, London",
  locationLine: "FLEMING · 3RD FLOOR",
  rowStyle: "card",
  bandTreatment: "solid",
  qrAnchor: "top-right",
  qrData: "https://presentationpower.lovable.app/events/next/london",
  qrCaption: "FULL PROGRAMME",
  sessions: dayOne,
  days: [
    { label: "DAY ONE", meta: "24 September 2026 · QEII Centre, London", sessions: dayOne },
    { label: "DAY TWO", meta: "25 September 2026 · QEII Centre, London", sessions: dayTwo },
  ],
};

