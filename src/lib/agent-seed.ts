// Hand-off of a seed prompt from a hero / CTA into the matching Element agent.
export type AgentSurface = "presentation" | "print" | "event" | "social";

const KEY = "element:agent-seed";

export const AGENT_ROUTE: Record<AgentSurface, string> = {
  presentation: "/agent",
  print: "/print-agent",
  event: "/events-agent",
  social: "/social-agent",
};

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
