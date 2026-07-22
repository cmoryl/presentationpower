import type { StrategyPlan, StrategySection } from "./ai-strategist.functions";

/**
 * Chapter grouping — takes a flat StrategyPlan and infers narrative chapters
 * (Opening / Context / Solution / Proof / Close) from section sequence and
 * framework category. Pure client-side; no LLM roundtrip.
 */
export type ChapterId = "opening" | "context" | "solution" | "proof" | "close";

export type Chapter = {
  id: ChapterId;
  label: string;
  tone: string;
  sections: StrategySection[];
};

const CHAPTER_META: Record<ChapterId, { label: string; tone: string }> = {
  opening: { label: "Opening",  tone: "Land the room. Cover, kicker, one crisp promise." },
  context: { label: "Context",  tone: "Frame the problem, market, or moment we're addressing." },
  solution:{ label: "Solution", tone: "Show what we build and why it's different." },
  proof:   { label: "Proof",    tone: "Case studies, stats, and third-party validation." },
  close:   { label: "Close",    tone: "Ask, next steps, closing statement." },
};

function classify(section: StrategySection, i: number, n: number): ChapterId {
  const id = (section.sectionId ?? "").toLowerCase();
  const km = (section.keyMessage ?? "").toLowerCase();
  if (i === 0 || id.includes("cover") || id.includes("hero")) return "opening";
  if (i >= n - 2 || id.includes("close") || id.includes("cta") || id.includes("next")) return "close";
  if (id.includes("case") || id.includes("proof") || id.includes("stat") || id.includes("result") || km.includes("results")) return "proof";
  if (id.includes("solution") || id.includes("product") || id.includes("platform") || id.includes("service") || id.includes("approach")) return "solution";
  if (id.includes("context") || id.includes("problem") || id.includes("market") || id.includes("why") || km.includes("problem")) return "context";
  // Middle-band fallback: alternate context/solution by position.
  return i < n / 2 ? "context" : "solution";
}

export function computeChapters(plan: StrategyPlan): Chapter[] {
  const order: ChapterId[] = ["opening", "context", "solution", "proof", "close"];
  const buckets = new Map<ChapterId, StrategySection[]>();
  plan.recommendedSections.forEach((s, i) => {
    const cid = classify(s, i, plan.recommendedSections.length);
    const arr = buckets.get(cid) ?? [];
    arr.push(s);
    buckets.set(cid, arr);
  });
  return order
    .map((id) => ({ id, ...CHAPTER_META[id], sections: buckets.get(id) ?? [] }))
    .filter((c) => c.sections.length > 0);
}
