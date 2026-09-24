// /events/venues — the venue library. Each venue is saved once with its floors;
// every event held there reads them.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { listVenues } from "@/lib/venues.functions";
import { useSessionUser } from "@/hooks/use-session-user";

export const Route = createFileRoute("/events/venues/")({
  head: () => ({
    meta: [
      { title: "Venue library — floors shared by every event" },
      { name: "description", content: "Every venue saved once with its floor sheets, rooms and facts, reused by each event held there." },
      { property: "og:title", content: "Venue library" },
      { property: "og:description", content: "Venues and their floor sheets, shared across NEXT events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VenuesPage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";

function VenuesPage() {
  const userId = useSessionUser();
  const ready = userId !== undefined;
  const user = userId;
  const list = useServerFn(listVenues);
  const q = useQuery({ queryKey: ["venues"], queryFn: () => list(), enabled: ready && !!user });
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-5 pb-24 pt-8 sm:px-8">
        <Link to="/events" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]">
          <ArrowLeft className="h-4 w-4" /> Events
        </Link>
        <h1 className="mt-5 text-3xl font-bold leading-tight text-[#03002C]">Venue library</h1>
        <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-[#03002C]/75">
          Each venue is saved once, with the floor sheets it issued. Every event held there draws those floors;
          room colours and uses stay with each event. Nothing is drawn until the venue's own plans arrive.
        </p>
        {ready && !user && <p className="mt-6 text-[14px]">Sign in to see the venue library.</p>}
        {q.isLoading && <p className="mt-6 text-[14px]">Loading venues…</p>}
        {q.error && <p className="mt-6 text-[14px] text-[#E53D2E]">Couldn't load venues: {(q.error as Error).message}</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(q.data ?? []).map((v) => (
            <Link key={v.slug} to="/events/venues/$slug" params={{ slug: v.slug }} className={`${card} block hover:border-[#003FC7]`}>
              <Building2 className="h-5 w-5 text-[#003FC7]" />
              <div className="mt-3 text-[17px] font-bold text-[#03002C]">{v.name}</div>
              <div className="text-[13px] text-[#666666]">{[v.city, v.country].filter(Boolean).join(", ") || "City not set"}</div>
              <div className="mt-3 text-[13px] text-[#03002C]">
                {v.floorCount === 0 ? "No floors yet — waiting on the venue's sheets" : `${v.floorCount} ${v.floorCount === 1 ? "floor" : "floors"}`}
                {v.scans > 0 && ` · ${v.scans} from picture scans (lower quality)`}
              </div>
              <div className="mt-1 text-[12px] text-[#666666]">
                {v.events.length ? `Used by ${v.events.join(", ")}` : "Not linked to an event yet"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
