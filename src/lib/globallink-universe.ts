// The GlobalLink Universe — the recorded product ecosystem, as issued in the
// GlobalLink brand kit.
//
// This is a reference record, not a diagram someone redraws by hand: each
// product carries its category, its recorded tagline and description, and the
// products it connects to. Connections are written once here and read in both
// directions, so a product can never appear joined on one side only.

export type GlobalLinkCategory =
  | "Core Platform"
  | "Web"
  | "AI-Powered"
  | "Media"
  | "Live"
  | "Development"
  | "Collaboration";

export type GlobalLinkProduct = {
  id: string;
  name: string;
  category: GlobalLinkCategory;
  tagline: string;
  description: string;
  /** Ids this product is recorded as connecting to. */
  connects: string[];
  /** The central hub of the ecosystem — everything routes through it. */
  hub?: boolean;
};

/** Category tag colours, all drawn from the approved enterprise ramp. */
export const GLOBALLINK_CATEGORY_TAG: Record<GlobalLinkCategory, { bg: string; ink: string }> = {
  "Core Platform": { bg: "#03002C", ink: "#FFFFFF" },
  Web: { bg: "#003FC7", ink: "#FFFFFF" },
  "AI-Powered": { bg: "#E0E8F5", ink: "#03002C" },
  Media: { bg: "#EEF1F7", ink: "#03002C" },
  Live: { bg: "#C2A3FF", ink: "#03002C" },
  Development: { bg: "#A1FBF9", ink: "#03002C" },
  Collaboration: { bg: "#F2F2F2", ink: "#03002C" },
};

export const GLOBALLINK_UNIVERSE: GlobalLinkProduct[] = [
  {
    id: "tms",
    name: "GlobalLink TMS",
    category: "Core Platform",
    tagline: "The centre of the GlobalLink Universe",
    description:
      "The translation management platform every other GlobalLink product routes through: projects, workflow, linguistic assets and reporting in one place.",
    connects: ["web", "ccms", "now"],
    hub: true,
  },
  {
    id: "ccms",
    name: "GlobalLink CCMS",
    category: "Core Platform",
    tagline: "Structured content, ready to translate",
    description:
      "Component content management for structured, reusable content, connected straight into translation workflow and shared review.",
    connects: ["tms", "share"],
  },
  {
    id: "web",
    name: "GlobalLink Web",
    category: "Web",
    tagline: "Multilingual websites without the rebuild",
    description:
      "Website translation and delivery that serves localised pages without a separate site build, feeding developer string workflow.",
    connects: ["tms", "strings"],
  },
  {
    id: "now",
    name: "GlobalLink NOW",
    category: "AI-Powered",
    tagline: "Instant machine translation, in context",
    description:
      "Secure AI translation on demand for the everyday content that needs to move immediately, with writing support alongside it.",
    connects: ["tms", "write"],
  },
  {
    id: "write",
    name: "GlobalLink Write",
    category: "AI-Powered",
    tagline: "Clear source content from the start",
    description:
      "AI writing support that improves source content before it is translated, so quality is built in rather than corrected later.",
    connects: ["now", "tms"],
  },
  {
    id: "tv",
    name: "GlobalLink TV",
    category: "Media",
    tagline: "Video, localised end to end",
    description:
      "Video localisation bringing subtitling, voice and transcription together for broadcast and streaming-grade output.",
    connects: ["voice", "scribe", "media"],
  },
  {
    id: "voice",
    name: "GlobalLink Voice",
    category: "Media",
    tagline: "Every voice, in every market",
    description:
      "Voice-over and synthetic voice production for localised audio across video, learning and live experiences.",
    connects: ["tv", "media"],
  },
  {
    id: "scribe",
    name: "GlobalLink Scribe",
    category: "Media",
    tagline: "Spoken word into working text",
    description:
      "Transcription and captioning that turns recorded speech into text media workflows can translate and reuse.",
    connects: ["tv", "voice"],
  },
  {
    id: "media",
    name: "GlobalLink Media",
    category: "Media",
    tagline: "One home for localised media",
    description:
      "Media asset handling and delivery for localised audio and video across the GlobalLink media products.",
    connects: ["tv", "voice"],
  },
  {
    id: "live",
    name: "GlobalLink Live",
    category: "Live",
    tagline: "Understood in real time",
    description:
      "Real-time interpretation and captioning for meetings and events, drawing on the same voice and video pipeline.",
    connects: ["voice", "tv"],
  },
  {
    id: "strings",
    name: "GlobalLink Strings",
    category: "Development",
    tagline: "Localisation inside the build",
    description:
      "Developer-facing string management that keeps product copy in sync with the platform and the web layer.",
    connects: ["tms", "web"],
  },
  {
    id: "share",
    name: "GlobalLink Share",
    category: "Collaboration",
    tagline: "Review together, in context",
    description:
      "Shared review and collaboration across teams and reviewers, connected to the platform and structured content.",
    connects: ["tms", "ccms"],
  },
];

export function globalLinkProduct(id: string): GlobalLinkProduct | undefined {
  return GLOBALLINK_UNIVERSE.find((p) => p.id === id);
}

/**
 * Every recorded connection as an unordered pair, read in both directions, so a
 * one-sided entry still draws as a real link.
 */
export function globalLinkConnections(): Array<[string, string]> {
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const p of GLOBALLINK_UNIVERSE) {
    for (const other of p.connects) {
      if (!globalLinkProduct(other)) continue;
      const key = [p.id, other].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([p.id, other]);
    }
  }
  return pairs;
}

/** The products a given product is joined to, in both directions. */
export function globalLinkNeighbours(id: string): string[] {
  return Array.from(
    new Set(
      globalLinkConnections()
        .filter((pair) => pair.includes(id))
        .map((pair) => (pair[0] === id ? pair[1]! : pair[0]!)),
    ),
  );
}

/** Ring placement: the hub at the centre, everything else on orbits by category. */
export const GLOBALLINK_ORBITS: GlobalLinkCategory[][] = [
  ["Core Platform"],
  ["Web", "AI-Powered", "Development", "Collaboration"],
  ["Media", "Live"],
];
