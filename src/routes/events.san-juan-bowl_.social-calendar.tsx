import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/social-calendar — the team's Bowl social calendar with
// dark/light Canva designs (three sizes) and Illustrator files per post.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SJB_EVENT } from "@/lib/san-juan-bowl";
import { Button } from "@/design-system/element";
import { SjbCanvaSyncPanel } from "@/components/events/SjbCanvaSyncPanel";
import { SjbPictureStamp } from "@/components/events/SjbPictureStamp";
import { getCanvaSyncStamp } from "@/lib/canva-sync.functions";
import { canvaSyncTargets } from "@/lib/canva-sync-targets";
import { useCanvaSynced } from "@/lib/use-canva-sync";
import { SjbProjections } from "@/components/events/SjbProjections";
import { SjbCalendarLookCards } from "@/components/events/SjbCalendarLookCards";
import { SjbDemoChip, SjbDemoSequence } from "@/components/events/SjbDemoSequence";
import { SjbSequenceViewer } from "@/components/events/SjbSequenceViewer";
import { SjbSavedSequence } from "@/components/events/SjbSavedSequence";
import { sjbCampaignMasterFor, SJB_SEQUENCE_PAGE_ORDER } from "@/lib/sjb-campaign-sequence-masters";
import { sjbCalendarCover } from "@/lib/sjb-calendar-demo";
import { CalendarDays, List as ListIcon } from "lucide-react";
import { SJB_CALENDAR_FORMATS, sjbCalendarSequence, sjbCalendarSequenceCanvaUrl, type SjbCalendarFormat } from "@/lib/sjb-calendar-formats";
import {
  SJB_CALENDAR_POSTS,
  SJB_CALENDAR_SIZES,
  sjbCalendarBuilt,
  sjbCalendarDesign,
  sjbCalendarActiveDesignIds,
  SJB_CALENDAR_MODES,
  type SjbCalendarMode,
  type SjbCalendarPost,
} from "@/lib/sjb-social-calendar";

export const Route = createFileRoute("/events/san-juan-bowl_/social-calendar")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl social calendar · TransPerfect Element" },
      { name: "description", content: "Every planned San Juan Bowl social post by date, in five looks, with single images, LinkedIn and Instagram carousels, and Story sequences." },
      { property: "og:title", content: "San Juan Bowl social calendar" },
      { property: "og:description", content: "Planned Bowl posts from launch to game week, with live Canva and Illustrator files." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // Read on the server so the "pictures last updated" line is already in the page's
  // HTML for visitors who aren't signed in. A failure must never take the calendar down.
  loader: async () => ({
    pictureStamp: await getCanvaSyncStamp().catch(() => null),
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
const PROJECTION_LOOK: Record<SjbCalendarMode, "dark" | "blue" | "night" | "light" | null> = { dark: "dark", light: "light", set2: "night", set3: "dark", set4: "blue" };

function CalendarPage() {
  const { pictureStamp } = Route.useLoaderData();
  const [mode, setMode] = useState<SjbCalendarMode>("light");
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const format: SjbCalendarFormat = "single";
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

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold text-foreground">San Juan Bowl social calendar</h1>
      <p className="mt-2 text-sm text-muted-foreground">November – December 2026</p>
      <SjbCalendarLookCards mode={mode} onChange={setMode} />
      <SjbPictureStamp stamp={pictureStamp} />
      <SjbCanvaSyncPanel designIds={canvaSyncTargets().map((t) => t.id)} label="Bowl calendar, billboard and carousel" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-3xl" role="group" aria-label="View">
        {([
          { v: "calendar", title: "Calendar", sub: "Month grid with every post on its day", Icon: CalendarDays },
          { v: "list", title: "Day-by-day list", sub: "Every day's single posts, carousels and stories", Icon: ListIcon },
        ] as const).map(({ v, title, sub, Icon }) => {
          const on = view === v;
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => setView(v)}
              className={`group flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5 ${on ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-foreground hover:border-primary/60 hover:shadow-sm"}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${on ? "bg-primary-foreground/15" : "bg-muted text-primary"}`}><Icon className="h-6 w-6" aria-hidden /></span>
              <span className="min-w-0">
                <span className="block text-base font-semibold">{title}</span>
                <span className={`block text-sm ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{sub}</span>
              </span>
              {on && <span className="ml-auto rounded bg-primary-foreground/15 px-2 py-0.5 text-xs font-medium">Showing</span>}
            </button>
          );
        })}
      </div>

      {view === "calendar" ? (
        <CalendarGrid mode={mode} format={format} onOpen={openPost} undated={groups.undated} />
      ) : (
      <ol className="mt-8 space-y-8">
        {groups.dated.map(([date, posts]) => (
          <li key={date} id={`day-${date}`} className={`grid scroll-mt-24 gap-4 rounded-xl p-3 md:grid-cols-[9rem_1fr] ${flash?.dayId === `day-${date}` ? "sjb-day-flash" : ""}`}>
            <h2 className="pt-1 text-sm font-semibold uppercase text-muted-foreground">{fmt(date)}</h2>
            <div className="space-y-4">{posts.map((p) => <div key={p.itemId} id={`post-${p.itemId}`} className={`scroll-mt-24 rounded-md ${flash?.itemId === p.itemId ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}><PostRow post={p} mode={mode} format={format} /></div>)}</div>
          </li>
        ))}
        <li id="day-undated" className={`grid scroll-mt-24 gap-4 rounded-xl p-3 md:grid-cols-[9rem_1fr] ${flash?.dayId === "day-undated" ? "sjb-day-flash" : ""}`}>
          <h2 className="pt-1 text-sm font-semibold uppercase text-muted-foreground">No date yet</h2>
          <div className="space-y-4">{groups.undated.map((p) => <div key={p.itemId} id={`post-${p.itemId}`} className={`scroll-mt-24 rounded-md ${flash?.itemId === p.itemId ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""}`}><PostRow post={p} mode={mode} format={format} /></div>)}</div>
        </li>
      </ol>
      )}
      <SjbProjections look={PROJECTION_LOOK[mode]} lookLabel={SJB_CALENDAR_MODES.find((m) => m.id === mode)?.label} />
    </main>
  );
}

function PostRow({ post, mode, format }: { post: SjbCalendarPost; mode: SjbCalendarMode; format: SjbCalendarFormat }) {
  const [showCaption, setShowCaption] = useState(Boolean(post.caption));
  const synced = useCanvaSynced();
  const sizes = SJB_CALENDAR_SIZES.map((s) => {
    const d = sjbCalendarDesign(post.n, mode, s.id);
    return { s, d: d && { ...d, previewUrl: synced(d.id, d.previewUrl), downloadUrl: synced(d.id, d.downloadUrl) } };
  });
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
                  <div className="overflow-hidden rounded border border-dashed border-border shadow-sm" title="Demo layout until the Canva picture is exported">
                    <SjbDemoChip post={post} mode={mode} format={s.h === 1920 ? "story-sequence" : s.h === 1080 ? "linkedin-square" : "linkedin-portrait"} displayHeight={224} />
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

      <MultiPageFormats post={post} mode={mode} />

      {post.caption && (
        <div className="mt-4 border-t border-border pt-3">
          <Button size="sm" variant="ghost" onClick={() => setShowCaption((v) => !v)} aria-expanded={showCaption}>
            {showCaption ? "Hide caption" : "Show approved caption"}
          </Button>
          {showCaption && (
            <div className="mt-2 rounded border border-border bg-muted/40 p-3">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{post.caption}</pre>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { if (post.caption) void navigator.clipboard.writeText(post.caption); }}>Copy caption</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function MultiPageFormats({ post, mode }: { post: SjbCalendarPost; mode: SjbCalendarMode }) {
  const [open, setOpen] = useState<SjbCalendarFormat | null>("linkedin-portrait");
  const formats = SJB_CALENDAR_FORMATS.filter((f) => f.id !== "single");
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Carousels and stories</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {formats.map((f) => {
          const real = !!sjbCalendarSequence(post.n, mode, f.id) || !!sjbCampaignMasterFor(post.n, mode, f.id);
          return (
            <Button key={f.id} size="sm" variant={open === f.id ? "default" : "outline"} aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}>
              {f.label}{!real && !sjbCalendarSequenceCanvaUrl(post.n, mode, f.id) && <span className="ml-1 opacity-70">(demo)</span>}
            </Button>
          );
        })}
      </div>
      {open && <SequenceArtwork post={post} mode={mode} format={open} />}
    </div>
  );
}

function SequenceArtwork({ post, mode, format }: { post: SjbCalendarPost; mode: SjbCalendarMode; format: SjbCalendarFormat }) {
  const synced = useCanvaSynced();
  const rawSequence = sjbCalendarSequence(post.n, mode, format);
  const sequence = rawSequence && rawSequence.syncSources ? { ...rawSequence, pages: rawSequence.pages.map((p, i) => {
    const [id, page] = rawSequence.syncSources![i] ?? [null, 1];
    return { ...p, previewUrl: synced(id, p.previewUrl, page), downloadUrl: synced(id, p.downloadUrl, page) };
  }) } : rawSequence;
  const spec = SJB_CALENDAR_FORMATS.find((f) => f.id === format);
  const canvaUrl = sjbCalendarSequenceCanvaUrl(post.n, mode, format);
  const rawMaster = sequence ? null : sjbCampaignMasterFor(post.n, mode, format);
  const master = rawMaster && { ...rawMaster, pages: rawMaster.pages.map((u, i) => synced(rawMaster.id, u, i + 1)) };
  return (
    <section className="mt-4 border-t border-border pt-4" aria-label={spec?.label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{spec?.label}</h4>
        <span className="text-xs text-muted-foreground">{spec?.width}×{spec?.height} per {format === "story-sequence" ? "frame" : "page"}</span>
      </div>
      {sequence ? <>
        <div className="mt-3"><SjbSavedSequence sequence={sequence} story={format === "story-sequence"} width={spec?.width ?? 1080} height={spec?.height ?? 1350} title={post.title} /></div>
        <ol className="mt-3 flex gap-4 overflow-x-auto pb-3">
          {sequence.pages.map((page, i) => <li key={page.previewUrl} className="w-44 shrink-0">
            <a href={page.previewUrl} target="_blank" rel="noreferrer"><img src={page.previewUrl} alt={`${post.title}, page ${i + 1}`} className="max-h-72 w-full rounded border border-border object-contain" loading="lazy" /></a>
            <p className="mt-2 text-xs text-muted-foreground">{format === "story-sequence" ? "Frame" : "Page"} {i + 1}</p>
            <Button asChild size="sm" variant="outline" className="mt-2"><a href={page.downloadUrl} download={page.downloadName}>Picture</a></Button>
          </li>)}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          {sequence.canvaUrl && <Button asChild size="sm" variant="outline"><a href={sequence.canvaUrl} target="_blank" rel="noreferrer">Canva</a></Button>}
          {sequence.pdfUrl && <Button asChild size="sm" variant="outline"><a href={sequence.pdfUrl} download>Carousel PDF</a></Button>}
          {sequence.zipUrl && <Button asChild size="sm" variant="outline"><a href={sequence.zipUrl} download>All pictures</a></Button>}
          {sequence.illustratorUrl && <Button asChild size="sm" variant="outline"><a href={sequence.illustratorUrl} download>Illustrator</a></Button>}
        </div>
      </> : master ? <>
        <div className="mt-3"><SjbSequenceViewer pages={master.pages} labels={SJB_SEQUENCE_PAGE_ORDER} variant={format === "story-sequence" ? "story" : "carousel"} width={spec?.width ?? 1080} height={spec?.height ?? 1350} title={post.title} /></div>
        <p className="mt-2 text-xs text-muted-foreground">Saved pages from the four-page Canva master.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={master.canvaUrl} target="_blank" rel="noreferrer">Canva</a></Button>
          {master.zipUrl && <Button asChild size="sm" variant="outline"><a href={master.zipUrl} download>All pictures</a></Button>}
        </div>
      </> : <>
        {canvaUrl && <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button asChild size="sm"><a href={canvaUrl} target="_blank" rel="noreferrer">Open live Canva file</a></Button>
          <span className="text-xs text-muted-foreground">Cover, details and tickets pages. The pictures below are a preview layout until the Canva pages are exported.</span>
        </div>}
        <SjbDemoSequence post={post} mode={mode} format={format} />
      </>}
    </section>
  );
}

const MONTHS = [
  { y: 2026, m: 10, label: "November 2026" },
  { y: 2026, m: 11, label: "December 2026" },
];
const GAME_DAY_ISO = new Date(`${SJB_EVENT.datesLabel} UTC`).toISOString().slice(0, 10);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarGrid({ mode, format, onOpen, undated }: { mode: SjbCalendarMode; format: SjbCalendarFormat; onOpen: (id: string) => void; undated: SjbCalendarPost[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, SjbCalendarPost[]>();
    for (const p of SJB_CALENDAR_POSTS) if (p.date) m.set(p.date, [...(m.get(p.date) ?? []), p]);
    return m;
  }, []);
  const chip = (p: SjbCalendarPost) => {
    const preview = sjbCalendarCover(p.n, mode, format)?.previewUrl;
    return (
      <Button
        key={p.itemId}
        type="button"
        onClick={() => onOpen(p.itemId)}
        variant="outline"
        className="group flex h-auto w-full min-w-0 flex-col items-stretch gap-2 overflow-hidden rounded-sm border-border bg-card p-1.5 text-left text-xs whitespace-normal text-foreground transition-all duration-200 hover:border-primary hover:shadow-sm motion-reduce:transition-none"
        aria-label={`Open ${p.title}`}
      >
        {preview ? (
          <img src={preview} alt="" className="aspect-[4/5] w-full rounded-sm object-contain bg-muted" loading="lazy" />
        ) : (
          <span className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-sm bg-muted">
            <SjbDemoChip post={p} mode={mode} format={format} displayHeight={160} />
          </span>
        )}
        <span className="line-clamp-2 leading-snug">{p.title}</span>
      </Button>
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
            <div className="overflow-x-auto rounded-md border border-border"><div className="grid min-w-[840px] grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div key={d} className="border-b border-border bg-muted px-2 py-1.5 text-xs font-semibold uppercase text-muted-foreground">{d}</div>
              ))}
              {cells.map((d, i) => {
                const iso = d ? `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
                const posts = d ? byDate.get(iso) ?? [] : [];
                const gameDay = iso === GAME_DAY_ISO;
                return (
                  <div key={i} className={`min-h-32 border-b border-r border-border p-2 ${d ? "bg-background" : "bg-muted/40"} ${gameDay ? "ring-2 ring-inset ring-primary" : ""}`}>
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
            </div></div>
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
