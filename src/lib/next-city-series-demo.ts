// City Series demo assets — a ready-made, fully editable agenda board plus the
// four master pillars in the approved light face. These are studio configs (not
// flat artwork), so opening them in the agenda / pillar editors gives an
// operator a real starting point they can edit and export.

import { agendaDefault, type AgendaConfig } from "./next-agenda";
import { pillarDefault, type PillarConfig, type PillarKindId } from "./next-pillar-masters";

export const CITY_SERIES_DEMO_EVENT = "NEXT City Series — Barcelona";

/** Demo agenda board: City Series, light face, real programme, live QR. */
export function citySeriesDemoAgenda(): AgendaConfig {
  const base = agendaDefault("city-series");
  return {
    ...base,
    face: "light",
    styleId: "01-beam-violet-aqua",
    sizeId: "a1",
    trimW: 594,
    trimH: 841,
    eyebrow: "AGENDA · DAY ONE",
    title: "CITY SERIES",
    meta: "Barcelona · 12 November 2026 · Palau de Congressos",
    footnote: "Programme subject to change · scan for the live agenda and speaker bios",
    qrData: "https://next.transperfect.com/city-series/barcelona/agenda",
    qrSize: 56,
    qrCaption: "LIVE AGENDA",
    eventLabel: CITY_SERIES_DEMO_EVENT,
    sessions: [
      { time: "08:30", title: "Registration & welcome coffee", detail: "Concourse, Level 1", track: "", muted: true },
      { time: "09:15", title: "Opening — one brand system, every market", detail: "City Series host team", track: "MAIN STAGE", muted: false },
      { time: "10:00", title: "Keynote: the local-language decade", detail: "Sofia Alvarez, Chief Executive", track: "MAIN STAGE", muted: false },
      { time: "11:00", title: "Break & expo floor", detail: "Partner stands open", track: "", muted: true },
      { time: "11:30", title: "In-market content velocity panel", detail: "Regional leads roundtable", track: "MAIN STAGE", muted: false },
      { time: "12:30", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      { time: "13:30", title: "Workshops — AI-assisted localization", detail: "Rooms 1–4, choose your track", track: "WORKSHOP", muted: false },
      { time: "15:00", title: "Client stories from the City Series", detail: "Three markets, three programmes", track: "STUDIO", muted: false },
      { time: "16:30", title: "Closing remarks & drinks reception", detail: "Terrace", track: "MAIN STAGE", muted: false },
    ],
  };
}

export type CitySeriesDemoPillar = {
  id: PillarKindId;
  label: string;
  note: string;
  config: PillarConfig;
};

/** The four master pillars, City Series, all on the approved light face. */
export function citySeriesDemoPillars(): CitySeriesDemoPillar[] {
  const light = (kind: PillarKindId, patch: Partial<PillarConfig>): PillarConfig => ({
    ...pillarDefault(kind, "city-series"),
    face: "light",
    eventLabel: CITY_SERIES_DEMO_EVENT,
    ...patch,
  });

  return [
    {
      id: "welcome",
      label: "Welcome",
      note: "Entrance pillar, light face, vertical headline.",
      config: light("welcome", {
        headline: "WELCOME",
        subheadline: "NEXT City Series · Barcelona",
        headlineSize: 104,
      }),
    },
    {
      id: "registration",
      label: "Registration",
      note: "Check-in pillar with a live QR to the badge desk.",
      config: light("registration", {
        headline: "REGISTRATION",
        subheadline: "Badge collection · Level 1",
        headlineSize: 88,
        qrData: "https://next.transperfect.com/city-series/barcelona/check-in",
        qrSize: 200,
        qrCaption: "CHECK IN HERE",
      }),
    },
    {
      id: "logo",
      label: "General logo",
      note: "Room-setting pillar with the event URL and socials.",
      config: light("logo", {
        logoUrl: "next.transperfect.com/barcelona",
        logoSocial: "@TransPerfect · #TransPerfectNEXT",
      }),
    },
    {
      id: "directional",
      label: "Directional",
      note: "Wayfinding pillar — editable arrow and destination line.",
      config: light("directional", {
        headline: "MAIN STAGE",
        subheadline: "Expo floor & workshops this way",
        headlineSize: 82,
        arrow: "right",
        arrowStyle: "solid",
      }),
    },
  ];
}
