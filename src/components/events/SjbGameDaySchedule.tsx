import { forwardRef } from "react";
import { Clock3, ExternalLink } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { SJB_FAN_TIMELINE, SJB_GAME_SCHEDULE, SJB_SCHEDULE_OPTIONS, type SjbTimelineEntry } from "@/lib/sjb-game-day";

export interface SjbGameDayScheduleProps extends React.ComponentPropsWithoutRef<"section"> {}

function Timeline({ entries }: { entries: SjbTimelineEntry[] }) {
  return <ol className="divide-y border-y">{entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
    <span className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-muted-foreground" />{entry.label}</span>
    <span className={entry.status === "announced" ? "font-semibold text-foreground" : "text-sm text-muted-foreground"}>{entry.timing}</span>
  </li>)}</ol>;
}

export const SjbGameDaySchedule = forwardRef<HTMLElement, SjbGameDayScheduleProps>(function SjbGameDaySchedule({ className = "", ...props }, ref) {
  return <section ref={ref} aria-labelledby="sjb-game-day-title" className={`space-y-6 border-b py-6 ${className}`} {...props}>
    <header>
      <p className="text-xs font-semibold uppercase text-muted-foreground">Draft schedule · unconfirmed times TBC</p>
      <h2 id="sjb-game-day-title" className="text-2xl font-semibold">Game day &amp; fan timeline</h2>
      <p className="mt-1 text-sm text-muted-foreground">{SJB_EVENT.datesLabel} · {SJB_EVENT.venue}</p>
    </header>
    <div className="grid gap-8 lg:grid-cols-2">
      <div><h3 className="mb-3 text-lg font-semibold">Game-day schedule</h3><Timeline entries={SJB_GAME_SCHEDULE} /></div>
      <div><h3 className="mb-3 text-lg font-semibold">Fan timeline</h3><Timeline entries={SJB_FAN_TIMELINE} /></div>
    </div>
    <p className="text-sm text-muted-foreground">Kickoff: {SJB_EVENT.kickoffLabel}. Local times use AST (San Juan). Halftime and the final whistle depend on game progress; other timings await confirmation.</p>
    <div>
      <h3 className="text-lg font-semibold">Canva marketing options</h3>
      <p className="mt-1 text-sm text-muted-foreground">Generated candidates · not yet saved or approved. Preview access could not be verified; no production downloads are available.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">{SJB_SCHEDULE_OPTIONS.map((format) => <div key={format.name}>
        <h4 className="font-semibold">{format.name}</h4><p className="mt-1 text-sm text-muted-foreground">{format.use}</p>
        <div className="mt-2 flex flex-wrap gap-1">{format.options.map((url, index) => <Button key={url} asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer">Option {index + 1}<ExternalLink className="size-3" /></a></Button>)}</div>
      </div>)}</div>
    </div>
    <Button asChild variant="outline" size="sm"><a href={SJB_EVENT.websiteUrl} target="_blank" rel="noreferrer">SANJUANBOWL.COM<ExternalLink className="size-3" /></a></Button>
  </section>;
});