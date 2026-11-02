import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SfPostEventReview } from "@/components/events/SfPostEventReview";
import { EventLearningPanel } from "@/components/events/EventLearningPanel";
import report from "../../docs/NEXT-SF-2026-POST-EVENT-REVIEW-v1.md?raw";
import { SF_REVIEW } from "@/lib/next-sf-review";

export const Route = createFileRoute("/events/next_/san-francisco_/review")({
  head: () => ({ meta: [
    { title: "NEXT San Francisco 2026 post-event review · TransPerfect Element" },
    { name: "description", content: "Sourced San Francisco NEXT post-event research, private photo evidence, design observations, operational gaps and recommended follow-up." },
    { property: "og:title", content: "NEXT San Francisco 2026 — post-event research review" },
    { property: "og:description", content: "Evidence-bounded event and design review: attributed reflections, imagery rights, outstanding outcomes and next-event actions." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ReviewPage,
});

function ReviewPage() {
  const body = report.slice(report.indexOf("## 1."), report.indexOf("## Sources"));
  return <AppShell><main className="mx-auto max-w-6xl px-6 py-10">
    <Link to="/events/next/san-francisco" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> NEXT San Francisco</Link>
    <h1 className="mt-6 text-3xl font-semibold">GlobalLink NEXT USA · Post-event review</h1>
    <p className="mt-2 text-sm text-muted-foreground">{SF_REVIEW.venue.datesLabel} · {SF_REVIEW.venue.venue} · Research snapshot {SF_REVIEW.reviewedAt}</p>
    <SfPostEventReview full />
    <div className="max-w-4xl">{body.split("\n").filter(Boolean).map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} className="mt-7 text-lg font-semibold">{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} className="mt-10 border-t border-border pt-6 text-xl font-semibold">{line.slice(3)}</h2>;
      return <p key={i} className={`mt-3 text-sm leading-relaxed text-muted-foreground ${line.startsWith("- ") ? "pl-4" : ""}`}>{line}</p>;
    })}</div>
    <div className="mt-10"><EventLearningPanel eventId={SF_REVIEW.eventId} city="San Francisco" /></div>
  </main></AppShell>;
}