import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/social-calendar — the team's Bowl social calendar with
// dark/light Canva designs (three sizes) and Illustrator files per post.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { Button } from "@/design-system/element";
import { SjbProjections } from "@/components/events/SjbProjections";
import {
  SJB_CALENDAR_POSTS,
  SJB_CALENDAR_SIZES,
  sjbCalendarBuilt,
  sjbCalendarDesign,
  SJB_CALENDAR_MODES,
  type SjbCalendarMode,
  type SjbCalendarPost,
} from "@/lib/sjb-social-calendar";

export const Route = createFileRoute("/events/san-juan-bowl_/social-calendar")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl social calendar · TransPerfect Element" },
      { name: "description", content: "Every planned San Juan Bowl social post by date, in four looks with Canva links, picture downloads and Illustrator files." },
      { property: "og:title", content: "San Juan Bowl social calendar" },
      { property: "og:description", content: "Planned Bowl posts from launch to game week, with live Canva and Illustrator files." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withSjbTrail(CalendarPage),
});

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

const STATUS_TONE: Record<string, string> = {
  "Approved/Ready": "bg-emerald-100 text-emerald-900",
  "Ready For Content": "bg-sky-100 text-sky-900",
  Pending: "bg-amber-100 text-amber-900",
  "Not Started": "bg-muted text-muted-foreground",
};

// Which projections template matches each calendar look (null = not built in that look yet).
const PROJECTION_LOOK: Record<SjbCalendarMode, "dark" | "blue" | "night" | null> = { dark: "dark", light: null, set2: "night", set3: "dark", set4: "blue" };

function CalendarPage() {
  const [mode, setMode] = useState<SjbCalendarMode>("dark");
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [flash, setFlash] = useState<{ itemId: string; dayId: string } | null>(null);

  // Arriving from a month-grid cell: that day's area stays framed until the
  // reader moves on, so the jump lands somewhere recognisable.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const openPost = (itemId: string) => {
    const post = SJB_CALENDAR_POSTS.find((p) => p.itemId === itemId);
    const dayId = post?.date ? `day-${post.date}` : "day-undated";
    setFlash({ itemId, dayId });
    setView("list");
    requestAnimationFrame(() => {
      const card = document.getElementById(`post-${itemId}`);
      const day = document.getElementById(dayId);
      // Show the whole day when it fits on screen, otherwise the post itself.
      const fits = !!day && day.getBoundingClientRect().height <= window.innerHeight - 96;
      (fits ? day : (card ?? day))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const groups = useMemo(() => {
    const dated = new Map<string, SjbCalendarPost[]>();
    const undated: SjbCalendarPost[] = [];
    for (const p of SJB_CALENDAR_POSTS) {
      if (!p.date) undated.push(p);
      else dated.set(p.date, [...(dated.get(p.date) ?? []), p]);
    }
    return { dated: [...dated.entries()].sort(([a], [b]) => a.localeCompare(b)), undated };
  }, []);
  const built = SJB_CALENDAR_POSTS.filter((p) => sjbCalendarBuilt(p.n)).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-foreground">San Juan Bowl social calendar</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Posts from the team's calendar sheet, Nov 7 – Dec 17, 2026. Each post has Canva designs in five looks (dark, light, Set 2, Set 3 and Set 4)
        in Feed, Square and Story sizes, with picture downloads. {built} of {SJB_CALENDAR_POSTS.length} posts are built in Canva so far.
      </p>
      <LookCards mode={mode} onChange={setMode} />
      <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="View">
        {(["list", "calendar"] as const).map((v) => (
          <Button key={v} size="sm" variant={view === v ? "default" : "outline"} aria-pressed={view === v} onClick={() => setView(v)}>
            {v === "list" ? "Day-by-day list" : "Calendar"}
          </Button>
        ))}
      </div>

      <SjbProjections look={PROJECTION_LOOK[mode]} lookLabel={SJB_CALENDAR_MODES.find((m) => m.id === mode)?.label} />

      {view === "calendar" ? (
        <CalendarGrid mode={mode} onOpen={openPost} undated={groups.undated} />
      ) : (
      <ol className="mt-8 space-y-8">
        {groups.dated.map(([date, posts]) => (
          <li key={date} id={`day-${date}`} className={`grid scroll-mt-24 gap-4 rounded-xl p-3 md:grid-cols-[9rem_1fr] ${flash?.dayId === `day-${date}` ? "sjb-day-flash" : ""}`}>
            <h2 className="pt-1 text-sm font-semibold uppercase text-muted-foreground">{fmt(date)}</h2>
            <div className="space-y-4">{posts.map((p) => <div key={p.itemId} id={`post-${p.itemId}`} className={`scroll-mt-24 rounded-md ${flash?.itemId === p.itemId ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}><PostRow post={p} mode={mode} /></div>)}</div>
          </li>
        ))}
        <li id="day-undated" className={`grid scroll-mt-24 gap-4 rounded-xl p-3 md:grid-cols-[9rem_1fr] ${flash?.dayId === "day-undated" ? "sjb-day-flash" : ""}`}>
          <h2 className="pt-1 text-sm font-semibold uppercase text-muted-foreground">No date yet</h2>
          <div className="space-y-4">{groups.undated.map((p) => <div key={p.itemId} id={`post-${p.itemId}`} className={`scroll-mt-24 rounded-md ${flash?.itemId === p.itemId ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}><PostRow post={p} mode={mode} /></div>)}</div>
        </li>
      </ol>
      )}
    </main>
  );
}

function PostRow({ post, mode }: { post: SjbCalendarPost; mode: SjbCalendarMode }) {
  const [showCaption, setShowCaption] = useState(false);
  const sizes = SJB_CALENDAR_SIZES.map((s) => ({ s, d: sjbCalendarDesign(post.n, mode, s.id) }));
  const anyBuilt = sizes.some(({ d }) => d);
  return (
    <article className="rounded-md border border-border bg-card p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{post.phase} · {post.channel}</span>
          <span className={`rounded px-2 py-0.5 font-medium ${STATUS_TONE[post.status] ?? "bg-muted text-muted-foreground"}`}>{post.status}</span>
        </div>
      </header>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{post.brief}</p>
      {post.waitingOn && <p className="mt-1 text-sm text-amber-800">Waiting on: {post.waitingOn}</p>}

      {anyBuilt ? (
        <ul className="mt-4 flex flex-wrap items-end gap-6">
          {sizes.map(({ s, d }) => (
            <li key={s.id} className="flex flex-col gap-2">
              <div className="flex h-56 items-end">
                {d?.previewUrl ? (
                  <a href={d.previewUrl} target="_blank" rel="noreferrer" aria-label={`View ${post.title} ${s.label.toLowerCase()} picture`}>
                    <img src={d.previewUrl} alt={`${post.title}, ${s.label.toLowerCase()} post`} className="h-56 w-auto rounded border border-border object-cover shadow-sm" style={{ aspectRatio: `${s.w} / ${s.h}` }} loading="lazy" />
                  </a>
                ) : (
                  <div className="flex h-56 items-center justify-center rounded border border-dashed border-border bg-muted/40 px-3 text-center text-xs text-muted-foreground" style={{ aspectRatio: `${s.w} / ${s.h}` }}>
                    {d ? "Picture coming" : "Not built yet"}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-foreground">{s.label} <span className="text-muted-foreground">{s.w}×{s.h}</span></p>
              {d && (
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" asChild><a href={d.canvaUrl} target="_blank" rel="noreferrer">Canva</a></Button>
                  {d.downloadUrl && <Button size="sm" variant="outline" asChild><a href={d.downloadUrl} download={d.downloadName}>Picture</a></Button>}
                  {d.illustratorUrl && <Button size="sm" variant="outline" asChild><a href={d.illustratorUrl} download>Illustrator</a></Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">Not built in this look yet.</p>
      )}

      {post.caption && (
        <div className="mt-4 border-t border-border pt-3">
          <Button size="sm" variant="ghost" onClick={() => setShowCaption((v) => !v)} aria-expanded={showCaption}>
            {showCaption ? "Hide caption" : "Show approved caption"}
          </Button>
          {showCaption && (
            <div className="mt-2 rounded border border-border bg-muted/40 p-3">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{post.caption}</pre>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => navigator.clipboard.writeText(post.caption!)}>Copy caption</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

const MONTHS = [
  { y: 2026, m: 10, label: "November 2026" },
  { y: 2026, m: 11, label: "December 2026" },
];
const GAME_DAY_ISO = new Date(`${SJB_EVENT.datesLabel} UTC`).toISOString().slice(0, 10);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarGrid({ mode, onOpen, undated }: { mode: SjbCalendarMode; onOpen: (id: string) => void; undated: SjbCalendarPost[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, SjbCalendarPost[]>();
    for (const p of SJB_CALENDAR_POSTS) if (p.date) m.set(p.date, [...(m.get(p.date) ?? []), p]);
    return m;
  }, []);
  const chip = (p: SjbCalendarPost) => {
    const preview = sjbCalendarDesign(p.n, mode, "1350")?.previewUrl;
    return (
      <button
        key={p.itemId}
        type="button"
        onClick={() => onOpen(p.itemId)}
        className="flex w-full items-center gap-1.5 rounded-sm border border-border bg-card p-1 text-left text-xs text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {preview ? (
          <img src={preview} alt="" className="h-8 w-6 shrink-0 rounded-[2px] object-cover" loading="lazy" />
        ) : (
          <span className="h-8 w-6 shrink-0 rounded-[2px] bg-muted" aria-hidden />
        )}
        <span className="line-clamp-2 leading-tight">{p.title}</span>
      </button>
    );
  };
  return (
    <div className="mt-8 space-y-10">
      {MONTHS.map(({ y, m, label }) => {
        const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
        const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
        while (cells.length % 7) cells.push(null);
        return (
          <section key={label} aria-label={label}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">{label}</h2>
            <div className="grid grid-cols-7 overflow-hidden rounded-md border border-border">
              {WEEKDAYS.map((d) => (
                <div key={d} className="border-b border-border bg-muted px-2 py-1.5 text-xs font-semibold uppercase text-muted-foreground">{d}</div>
              ))}
              {cells.map((d, i) => {
                const iso = d ? `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
                const posts = d ? byDate.get(iso) ?? [] : [];
                const gameDay = iso === GAME_DAY_ISO;
                return (
                  <div key={i} className={`min-h-28 border-b border-r border-border p-1.5 ${d ? "bg-background" : "bg-muted/40"} ${gameDay ? "ring-2 ring-inset ring-primary" : ""}`}>
                    {d && (
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{d}</span>
                        {gameDay && <span className="font-semibold text-primary">Game day</span>}
                      </div>
                    )}
                    <div className="space-y-1">{posts.map(chip)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {undated.length > 0 && (
        <section aria-label="No date yet">
          <h2 className="mb-3 text-lg font-semibold text-foreground">No date yet</h2>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{undated.map(chip)}</div>
        </section>
      )}
    </div>
  );
}
