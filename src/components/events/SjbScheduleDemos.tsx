import { forwardRef, useState, type CSSProperties } from "react";
import { CalendarDays, Users, Maximize2 } from "lucide-react";
import { Button } from "@/design-system/element";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SJB_COLORS, SJB_EVENT, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_FAN_TIMELINE, SJB_GAME_SCHEDULE } from "@/lib/sjb-game-day";
import { SJB_STADIUM_RENDERS } from "@/lib/sjb-stadium-renders";

const formats = [
  { id: "feed", name: "Feed", size: "1080 × 1350", height: 1350, use: "Instagram / Facebook" },
  { id: "story", name: "Story", size: "1080 × 1920", height: 1920, use: "Stories / vertical screens" },
  { id: "flyer", name: "Flyer", size: "8.5 × 11 in · layout proof", height: 1398, use: "Handout / digital flyer" },
] as const;
type Format = (typeof formats)[number];
type TimelineKind = "game" | "fan";
const colours = Object.fromEntries(SJB_COLORS.map((colour) => [`--schedule-${colour.id}`, colour.hex])) as CSSProperties;

function ScheduleArt({ format, kind }: { format: Format; kind: TimelineKind }) {
  const story = format.id === "story";
  const h = format.height;
  const entries = kind === "game" ? SJB_GAME_SCHEDULE : SJB_FAN_TIMELINE;
  const logo = SJB_LOGOS.find((item) => item.id === "dark");
  const plate = SJB_STADIUM_RENDERS.find((item) => item.ratio === (story ? "9:16" : "4:5"));
  const titleY = story ? 640 : 480;
  const rowY = story ? 845 : 650;
  const step = story ? 205 : 132;
  return <svg viewBox={`0 0 1080 ${h}`} role="img" aria-label={`${format.name} ${kind === "game" ? "game-day schedule" : "fan timeline"} demo`} className="block h-auto w-full" style={{ ...colours, fontFamily: '"Barlow Condensed", sans-serif' }}>
    <rect width="1080" height={h} fill="var(--schedule-navy)" />
    {plate && <image href={plate.src} x="0" y="0" width="1080" height={titleY - 70} preserveAspectRatio="xMidYMid slice" />}
    <rect width="1080" height="320" fill="var(--schedule-navy)" fillOpacity="0.7" />
    {logo && <image href={logo.svg} x="70" y="45" width="245" height="245" />}
    <rect x="740" y="70" width="270" height="52" fill="var(--schedule-gold)" />
    <text x="875" y="106" textAnchor="middle" fontSize="29" fontWeight="700" fill="var(--schedule-navy)">DEMO · DRAFT</text>
    <text x="1010" y="171" textAnchor="end" fontSize="32" fontWeight="600" fill="var(--schedule-white)">{SJB_EVENT.datesLabel.toUpperCase()}</text>
    <rect x="70" y={titleY - 94} width="100" height="9" fill="var(--schedule-sky)" />
    <text x="70" y={titleY} fontSize="100" fontWeight="800" fontStyle="italic" fill="var(--schedule-white)">{kind === "game" ? "GAME DAY" : "FAN TIMELINE"}</text>
    <text x="74" y={titleY + 55} fontSize="32" fontWeight="600" fill="var(--schedule-white)">{SJB_EVENT.venue.toUpperCase()}</text>
    {entries.map((entry, index) => {
      const y = rowY + index * step;
      const announced = entry.status === "announced";
      const [timing, context] = entry.timing.split(" · ");
      return <g key={entry.id}>
        {announced && <rect x="60" y={y - 47} width="960" height={step - 12} fill="var(--schedule-gold)" />}
        <path d={`M70 ${y + step - 53} H1010`} stroke="var(--schedule-white)" strokeOpacity={announced ? 0 : 0.25} />
        <text x="85" y={y} fontSize="46" fontWeight="700" fill={announced ? "var(--schedule-navy)" : "var(--schedule-white)"}>{entry.label.toUpperCase()}</text>
        <text x="985" y={y} textAnchor="end" fontSize="46" fontWeight="700" fill={announced ? "var(--schedule-navy)" : "var(--schedule-white)"}>{timing.toUpperCase()}</text>
        {context && <text x="985" y={y + 44} textAnchor="end" fontSize="29" fill={announced ? "var(--schedule-navy)" : "var(--schedule-white)"}>{context.toUpperCase()}</text>}
      </g>;
    })}
    <text x="70" y={h - 157} fontSize="27" fill="var(--schedule-white)">ALL LOCAL TIMES AST · UNCONFIRMED TIMES TBC</text>
    <text x="70" y={h - 118} fontSize="25" fill="var(--schedule-white)">HALFTIME / FINAL WHISTLE DEPEND ON GAME PROGRESS</text>
    <path d={`M70 ${h - 90} H1010`} stroke="var(--schedule-sky)" strokeWidth="4" />
    <text x="70" y={h - 40} fontSize="43" fontWeight="700" fill="var(--schedule-white)">SANJUANBOWL.COM</text>
  </svg>;
}

export interface SjbScheduleDemosProps extends React.ComponentPropsWithoutRef<"div"> {}

export const SjbScheduleDemos = forwardRef<HTMLDivElement, SjbScheduleDemosProps>(function SjbScheduleDemos({ className = "", ...props }, ref) {
  const [kind, setKind] = useState<TimelineKind>("game");
  const [expanded, setExpanded] = useState<Format | null>(null);
  return <div ref={ref} className={`space-y-4 ${className}`} {...props}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="text-lg font-semibold">Schedule design demos</h3><p className="mt-1 text-sm text-muted-foreground">Draft artwork · not saved Canva designs. Stadium imagery is an artistic render.</p></div>
      <div className="flex gap-1" role="group" aria-label="Schedule artwork view">
        <Button variant={kind === "game" ? "default" : "outline"} size="sm" aria-pressed={kind === "game"} onClick={() => setKind("game")}><CalendarDays className="size-4" />Game schedule</Button>
        <Button variant={kind === "fan" ? "default" : "outline"} size="sm" aria-pressed={kind === "fan"} onClick={() => setKind("fan")}><Users className="size-4" />Fan timeline</Button>
      </div>
    </div>
    <div className="grid items-start gap-6 md:grid-cols-3">
      {formats.map((format) => <figure key={format.id} className="min-w-0 space-y-3">
        <figcaption className="flex items-center justify-between gap-2"><div><h4 className="font-semibold">{format.name}</h4><p className="text-xs text-muted-foreground">{format.size}</p></div><Button variant="outline" size="sm" aria-label={`Enlarge ${format.name} schedule demo`} title={`Enlarge ${format.name} schedule demo`} onClick={() => setExpanded(format)}><Maximize2 className="size-4" /></Button></figcaption>
        <ScheduleArt format={format} kind={kind} />
        <p className="text-xs text-muted-foreground">{format.use}</p>
      </figure>)}
    </div>
    <Dialog open={expanded !== null} onOpenChange={(open) => { if (!open) setExpanded(null); }}>
      <DialogContent aria-describedby={undefined} className="max-h-[94dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle>{expanded?.name} · {kind === "game" ? "Game schedule" : "Fan timeline"} demo</DialogTitle>
        {expanded && <ScheduleArt format={expanded} kind={kind} />}
      </DialogContent>
    </Dialog>
  </div>;
});