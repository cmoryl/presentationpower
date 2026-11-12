// Interactive month calendar for the Bowl social calendar: month slider,
// phase/status filters, keyboard day navigation and a live detail panel.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { SJB_CALENDAR_POSTS, SJB_CALENDAR_PHASES, type SjbCalendarMode, type SjbCalendarPost } from "@/lib/sjb-social-calendar";
import { sjbCalendarCover } from "@/lib/sjb-calendar-demo";
import { SjbDemoChip } from "@/components/events/SjbDemoSequence";
import type { SjbCalendarFormat } from "@/lib/sjb-calendar-formats";

const MONTHS = [
  { y: 2026, m: 10, label: "November 2026" },
  { y: 2026, m: 11, label: "December 2026" },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GAME_DAY_ISO = new Date(`${SJB_EVENT.datesLabel} UTC`).toISOString().slice(0, 10);
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const STATUS_DOT: Record<string, string> = { "Approved/Ready": "bg-[var(--sjb-green,#22c55e)]", "Ready For Content": "bg-[#FFD600]", "Not Started": "bg-muted-foreground/50" };

export interface SjbInteractiveCalendarProps {
  mode: SjbCalendarMode;
  format: SjbCalendarFormat;
  onOpen: (itemId: string) => void;
  undated: SjbCalendarPost[];
}

export function SjbInteractiveCalendar({ mode, format, onOpen, undated }: SjbInteractiveCalendarProps) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setToday(new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
    tick();
    const t = window.setInterval(tick, 60000);
    return () => window.clearInterval(t);
  }, []);
  const [monthIdx, setMonthIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [phase, setPhase] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!today) return;
    const i = MONTHS.findIndex((mm) => today.startsWith(iso(mm.y, mm.m, 1).slice(0, 7)));
    if (i >= 0) setMonthIdx(i);
  }, [today]);

  const byDate = useMemo(() => {
    const m = new Map<string, SjbCalendarPost[]>();
    for (const p of SJB_CALENDAR_POSTS) if (p.date && (phase === "all" || p.phase === phase)) m.set(p.date, [...(m.get(p.date) ?? []), p]);
    return m;
  }, [phase]);

  const { y, m, label } = MONTHS[monthIdx];
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const monthCount = [...byDate.entries()].filter(([d]) => d.startsWith(iso(y, m, 1).slice(0, 7))).reduce((n, [, v]) => n + v.length, 0);

  const go = (i: number) => {
    if (i < 0 || i >= MONTHS.length || i === monthIdx) return;
    setDir(i > monthIdx ? 1 : -1);
    setMonthIdx(i);
  };

  const focusDay = (dIso: string) => requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-day="${dIso}"]`)?.focus());
  const onKey = (e: React.KeyboardEvent, d: number) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const nd = d + delta;
    if (nd >= 1 && nd <= days) focusDay(iso(y, m, nd));
    else if (nd > days && monthIdx < MONTHS.length - 1) { go(monthIdx + 1); setTimeout(() => focusDay(iso(MONTHS[monthIdx + 1].y, MONTHS[monthIdx + 1].m, nd - days)), 50); }
    else if (nd < 1 && monthIdx > 0) { const pm = MONTHS[monthIdx - 1]; const pd = new Date(Date.UTC(pm.y, pm.m + 1, 0)).getUTCDate(); go(monthIdx - 1); setTimeout(() => focusDay(iso(pm.y, pm.m, pd + nd)), 50); }
  };

  const selPosts = selected ? (selected === "undated" ? undated : byDate.get(selected) ?? []) : [];
  const preview = (p: SjbCalendarPost, h: number) => {
    const url = sjbCalendarCover(p.n, mode, format)?.previewUrl;
    return url ? <img src={url} alt="" className="aspect-[4/5] w-full rounded-sm bg-muted object-cover" loading="lazy" /> : (
      <span className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-sm bg-muted"><SjbDemoChip post={p} mode={mode} format={format} displayHeight={h} /></span>
    );
  };

  return (
    <div className="sjb-cal mt-8">
      <div className="sjb-cal-head relative overflow-hidden rounded-t-xl px-5 py-5 text-white">
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Previous month" disabled={monthIdx === 0} onClick={() => go(monthIdx - 1)} className="text-white hover:bg-white/10 hover:text-white"><ChevronLeft /></Button>
          <h2 key={label} className="sjb-cal-title min-w-[12ch] text-2xl font-bold uppercase italic tracking-wide">{label}</h2>
          <Button variant="ghost" size="icon" aria-label="Next month" disabled={monthIdx === MONTHS.length - 1} onClick={() => go(monthIdx + 1)} className="text-white hover:bg-white/10 hover:text-white"><ChevronRight /></Button>
          <span className="rounded bg-white/10 px-2 py-1 text-xs font-medium">{monthCount} post{monthCount === 1 ? "" : "s"}</span>
          {today && today <= GAME_DAY_ISO && <span className="ml-auto text-sm"><b className="text-[#FFD600]">{daysBetween(today, GAME_DAY_ISO)}</b> days to kickoff</span>}
        </div>
        <div className="relative z-10 mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by phase">
          {["all", ...SJB_CALENDAR_PHASES].map((ph) => (
            <button key={ph} type="button" aria-pressed={phase === ph} onClick={() => setPhase(ph)}
              className={`rounded-sm border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600] ${phase === ph ? "border-[#FFD600] bg-[#FFD600] text-[#0D0E21]" : "border-white/25 text-white/85 hover:border-white/60"}`}>
              {ph === "all" ? "All phases" : ph}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-x-auto rounded-b-xl border border-t-0 border-border">
          <div ref={gridRef} key={label} role="grid" aria-label={label} className={`sjb-cal-grid grid min-w-[760px] grid-cols-7 ${dir === 1 ? "sjb-cal-in-r" : "sjb-cal-in-l"}`}>
            {WEEKDAYS.map((d) => <div key={d} role="columnheader" className="border-b border-border bg-muted px-2 py-1.5 text-xs font-semibold uppercase text-muted-foreground">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="min-h-32 border-b border-r border-border bg-muted/40" />;
              const dIso = iso(y, m, d);
              const posts = byDate.get(dIso) ?? [];
              const game = dIso === GAME_DAY_ISO, isToday = dIso === today, past = !!today && dIso < today, sel = selected === dIso;
              return (
                <div key={i} role="gridcell" tabIndex={0} data-day={dIso} aria-selected={sel}
                  aria-label={`${d} ${label}${game ? ", game day" : ""}${isToday ? ", today" : ""}, ${posts.length} posts`}
                  onClick={() => setSelected(sel ? null : dIso)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(sel ? null : dIso); } else onKey(e, d); }}
                  style={{ animationDelay: `${i * 12}ms` }}
                  className={`sjb-cal-cell group relative min-h-32 cursor-pointer border-b border-r border-border p-2 outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${past ? "bg-muted/20" : "bg-background"} ${sel ? "bg-primary/5 ring-2 ring-inset ring-primary" : "hover:bg-primary/[0.03]"} ${game ? "sjb-cal-game" : ""}`}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${isToday ? "sjb-cal-today bg-primary text-primary-foreground" : past ? "text-muted-foreground" : "text-foreground"}`}>{d}</span>
                    {game ? <span className="font-bold uppercase text-primary">Game day</span> : posts.length > 1 && <span className="text-muted-foreground">{posts.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {posts.slice(0, 2).map((p) => (
                      <div key={p.itemId} className="sjb-cal-chip overflow-hidden rounded-sm border border-border bg-card p-1 text-[11px] leading-snug">
                        {preview(p, 120)}
                        <span className="mt-1 flex items-start gap-1"><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[p.status] ?? "bg-muted-foreground/50"}`} aria-hidden /><span className="line-clamp-2">{p.title}</span></span>
                      </div>
                    ))}
                    {posts.length > 2 && <span className="block text-[11px] font-medium text-primary">+{posts.length - 2} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside aria-live="polite" className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <div key={selected} className="sjb-cal-panel rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{selected === "undated" ? "No date yet" : new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</h3>
                <Button variant="ghost" size="icon" aria-label="Close day" onClick={() => setSelected(null)}><X /></Button>
              </div>
              {selPosts.length === 0 ? <p className="text-sm text-muted-foreground">No posts scheduled{phase !== "all" ? " in this phase" : ""}.</p> : (
                <ul className="space-y-4">
                  {selPosts.map((p) => (
                    <li key={p.itemId} className="space-y-2">
                      <div className="w-32">{preview(p, 160)}</div>
                      <p className="text-sm font-semibold text-foreground">#{p.n} · {p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.phase} · {p.status} · {p.channel}</p>
                      <p className="text-xs text-foreground/80">{p.brief}</p>
                      {p.waitingOn && <p className="text-xs text-foreground">Waiting on: {p.waitingOn}</p>}
                      <Button size="sm" onClick={() => onOpen(p.itemId)}>Open sizes &amp; downloads</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Pick a day to see its posts. Use the arrow keys to move between days.
              {undated.length > 0 && <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setSelected("undated")}>{undated.length} posts with no date yet</Button>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
