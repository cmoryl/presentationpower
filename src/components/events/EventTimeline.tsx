// One timeline per event: Plan → Design → Approve → Print → On site.
// Only "Plan" carries a status (the real readiness checklist); the other steps
// are doors into the existing tools, so nothing claims progress it can't prove.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export interface EventTimelineProps {
  eventId: string;
  ready: number;
  total: number;
}

export function EventTimeline({ eventId, ready, total }: EventTimelineProps) {
  const step = "flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-[#03002C]/12 bg-white p-3 transition-colors hover:border-[#003FC7] focus-visible:outline-2 focus-visible:outline-[#003FC7]";
  const num = "font-mono text-[11px] font-semibold text-[#666666]";
  const title = "flex items-center gap-1 text-[14px] font-bold text-[#03002C]";
  const note = "text-[12px] text-[#03002C]/70";
  return (
    <ol aria-label="Event timeline" className="mt-5 grid gap-2 sm:grid-cols-5">
      <li>
        <Link to="/events/$eventId" params={{ eventId }} className={step}>
          <span className={num}>1</span>
          <span className={title}>Plan</span>
          <span className={note}>{ready} of {total} checklist items ready</span>
        </Link>
      </li>
      <li>
        <Link to="/events/next/signs/$eventId" params={{ eventId }} className={step}>
          <span className={num}>2</span>
          <span className={title}>Design <ArrowRight className="h-3 w-3" aria-hidden /></span>
          <span className={note}>Signs and artwork</span>
        </Link>
      </li>
      <li>
        <Link to="/approvals" className={step}>
          <span className={num}>3</span>
          <span className={title}>Approve <ArrowRight className="h-3 w-3" aria-hidden /></span>
          <span className={note}>Brand review</span>
        </Link>
      </li>
      <li>
        <Link to="/events/production" className={step}>
          <span className={num}>4</span>
          <span className={title}>Print <ArrowRight className="h-3 w-3" aria-hidden /></span>
          <span className={note}>Print production</span>
        </Link>
      </li>
      <li>
        <Link to="/events/next/maps/$eventId" params={{ eventId }} className={step}>
          <span className={num}>5</span>
          <span className={title}>On site <ArrowRight className="h-3 w-3" aria-hidden /></span>
          <span className={note}>Venue maps</span>
        </Link>
      </li>
    </ol>
  );
}
