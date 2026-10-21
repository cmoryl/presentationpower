// Hand-off of a seed prompt from a hero / CTA into the matching Element agent.
export type AgentSurface = "presentation" | "print" | "event" | "social";

const KEY = "element:agent-seed";

export const AGENT_ROUTE = {
  presentation: "/agent",
  print: "/print-agent",
  event: "/events-agent",
  social: "/social-agent",
} as const satisfies Record<AgentSurface, string>;

export const AGENT_LABEL: Record<AgentSurface, string> = {
  presentation: "Presentation agent",
  print: "Print agent",
  event: "Events agent",
  social: "Social agent",
};

export function seedAgentPrompt(surface: AgentSurface, prompt: string) {
  const q = prompt.trim();
  if (!q) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ surface, prompt: q }));
  } catch {
    /* ignore */
  }
}

/** Read + clear the seed prompt for this surface (returns null when none). */
export function consumeAgentPrompt(surface: AgentSurface): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { surface?: string; prompt?: string };
    if (parsed.surface !== surface || !parsed.prompt) return null;
    window.sessionStorage.removeItem(KEY);
    return parsed.prompt;
  } catch {
    return null;
  }
}

/** Pick the agent from the words of a request; null when nothing clearly says.
 *  Lets one "What do you need?" box send people to the right place. */
export function guessAgentSurface(prompt: string): AgentSurface | null {
  const t = prompt.toLowerCase();
  const rules: [AgentSurface, RegExp][] = [
    ["event", /\b(event|signage|sign|booth|badge|kiosk|banner|step[- ]and[- ]repeat|pillar|venue|wayfinding|invite|invitation|flyer)s?\b/],
    ["social", /\b(social|linkedin|instagram|facebook|tiktok|post|story|reel|tweet|email header)s?\b/],
    ["print", /\b(print|brochure|case study|one[- ]pager|leaflet|datasheet|pdf|press)s?\b/],
    ["presentation", /\b(deck|slides?|presentation|pitch|powerpoint|qbr|business review)s?\b/],
  ];
  const hits = rules.filter(([, re]) => re.test(t)).map(([s]) => s);
  return hits.length ? hits[0]! : null;
}
