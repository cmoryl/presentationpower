// San Juan Bowl event home: grouped area map so every page is one click away.
import { Link } from "@tanstack/react-router";
import { ArrowRight, Palette, Megaphone, Landmark, Signpost, Share2 } from "lucide-react";
import { SJB_EVENT_AREAS } from "@/lib/event-registry";

const ICONS = { brand: Palette, marketing: Megaphone, venue: Landmark, production: Signpost, share: Share2 } as const;

export function SjbEventAreas() {
  return (
    <section aria-labelledby="bowl-areas" className="mt-6">
      <h2 id="bowl-areas" className="text-lg font-semibold text-foreground">Event areas</h2>
      <p className="text-sm text-muted-foreground">Pick an area to find everything for it.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SJB_EVENT_AREAS.map((g) => {
          const Icon = ICONS[g.id as keyof typeof ICONS] ?? Palette;
          return (
            <div key={g.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
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
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
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
