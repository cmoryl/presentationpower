// San Juan Bowl event home: grouped area map so every page is one click away.
import { Link } from "@tanstack/react-router";
import { ArrowRight, Palette, Megaphone, Landmark, Signpost, Share2 } from "lucide-react";
import { SJB_EVENT_AREAS } from "@/lib/event-registry";
import { SJB_COLORS } from "@/lib/san-juan-bowl";

const ICONS = { brand: Palette, marketing: Megaphone, venue: Landmark, production: Signpost, share: Share2 } as const;
const navy = SJB_COLORS.find((c) => c.id === "navy")?.hex;
const gold = SJB_COLORS.find((c) => c.id === "gold")?.hex;

export function SjbEventAreas() {
  return (
    <section aria-labelledby="bowl-areas" className="mt-10">
      <h2 id="bowl-areas" className="flex items-center gap-3 text-lg font-semibold text-foreground">
        <span aria-hidden className="h-5 w-1 rounded-full" style={{ background: gold }} />
        Event areas
      </h2>
      <p className="text-sm text-muted-foreground">Pick an area to find everything for it.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SJB_EVENT_AREAS.map((g, gi) => {
          const Icon = ICONS[g.id as keyof typeof ICONS] ?? Palette;
          return (
            <div
              key={g.id}
              className="sjb-rise rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ animationDelay: `${gi * 90}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: navy, color: gold, boxShadow: `0 4px 14px ${navy}55` }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{g.title}</h3>
                  <p className="text-[13px] text-muted-foreground">{g.summary}</p>
                </div>
              </div>
              <ul className="mt-4 divide-y divide-border">
                {g.tools.map((t) => (
                  <li key={t.label}>
                    <Link {...t.link} className="group flex items-center justify-between gap-3 rounded py-2.5 focus-visible:outline-2 focus-visible:outline-primary">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{t.label}</span>
                        <span className="block text-[13px] text-muted-foreground">{t.detail}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
