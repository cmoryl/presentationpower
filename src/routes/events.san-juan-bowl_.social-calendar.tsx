import { withSjbTrail } from "@/components/events/SjbBreadcrumbs";
// /events/san-juan-bowl/social-calendar — the team's Bowl social calendar with
// dark/light Canva designs (three sizes) and Illustrator files per post.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/design-system/element";
import {
  SJB_CALENDAR_POSTS,
  SJB_CALENDAR_SIZES,
  sjbCalendarBuilt,
  sjbCalendarDesign,
  type SjbCalendarMode,
  type SjbCalendarPost,
} from "@/lib/sjb-social-calendar";

export const Route = createFileRoute("/events/san-juan-bowl_/social-calendar")({
  head: () => ({
    meta: [
      { title: "San Juan Bowl social calendar · TransPerfect Element" },
      { name: "description", content: "Every planned San Juan Bowl social post by date, with dark and light Canva designs and Illustrator files." },
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

function CalendarPage() {
  const [mode, setMode] = useState<SjbCalendarMode>("dark");
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
        Posts from the team's calendar sheet, Nov 7 – Dec 17, 2026. Each post has Canva designs in the dark and light
        billboard looks, in Feed, Square and Story sizes. {built} of {SJB_CALENDAR_POSTS.length} posts are built in Canva so far.
      </p>
      <div className="mt-5 flex items-center gap-2" role="group" aria-label="Look">
        {(["dark", "light"] as const).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === "dark" ? "Dark (gold player)" : "Light (light action)"}
          </Button>
        ))}
      </div>

      <ol className="mt-8 space-y-8">
        {groups.dated.map(([date, posts]) => (
          <li key={date} className="grid gap-4 md:grid-cols-[9rem_1fr]">
            <h2 className="pt-1 text-sm font-semibold uppercase text-muted-foreground">{fmt(date)}</h2>
            <div className="space-y-4">{posts.map((p) => <PostRow key={p.itemId} post={p} mode={mode} />)}</div>
          </li>
        ))}
        <li className="grid gap-4 md:grid-cols-[9rem_1fr]">
          <h2 className="pt-1 text-sm font-semibold uppercase text-muted-foreground">No date yet</h2>
          <div className="space-y-4">{groups.undated.map((p) => <PostRow key={p.itemId} post={p} mode={mode} />)}</div>
        </li>
      </ol>
    </main>
  );
}

function PostRow({ post, mode }: { post: SjbCalendarPost; mode: SjbCalendarMode }) {
  const feed = sjbCalendarDesign(post.n, mode, "1350");
  const [showCaption, setShowCaption] = useState(false);
  return (
    <article className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-[8rem_1fr]">
      <div className="aspect-[4/5] w-32 overflow-hidden rounded bg-muted">
        {feed?.previewUrl ? (
          <a href={feed.canvaUrl} target="_blank" rel="noreferrer" aria-label={`Open ${post.title} in Canva`}>
            <img src={feed.previewUrl} alt={`${post.title}, ${mode} feed post`} className="h-full w-full object-cover" loading="lazy" />
          </a>
        ) : feed ? (
          <a href={feed.canvaUrl} target="_blank" rel="noreferrer" className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-foreground hover:bg-muted/70">
            <span className="font-semibold">{post.headline[0]}</span><span>{post.headline[1]}</span>
            <span className="mt-1 text-muted-foreground">Open in Canva</span>
          </a>
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">Not built in Canva yet</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{post.title}</h3>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_TONE[post.status] ?? "bg-muted text-muted-foreground"}`}>{post.status}</span>
          <span className="text-xs text-muted-foreground">{post.phase} · {post.channel}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{post.brief}</p>
        <p className="mt-1 text-sm"><span className="text-muted-foreground">Artwork headline:</span> {post.headline.join(" / ")}</p>
        {post.owners && <p className="text-sm"><span className="text-muted-foreground">Owners:</span> {post.owners}</p>}
        {post.waitingOn && <p className="mt-1 text-sm text-amber-800">Waiting on: {post.waitingOn}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {SJB_CALENDAR_SIZES.map((s) => {
            const d = sjbCalendarDesign(post.n, mode, s.id);
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{s.label} {s.w}×{s.h}</span>
                {d ? (
                  <>
                    <Button size="sm" variant="outline" asChild><a href={d.canvaUrl} target="_blank" rel="noreferrer">Canva</a></Button>
                    {d.illustratorUrl ? (
                      <Button size="sm" variant="outline" asChild><a href={d.illustratorUrl} download>Illustrator</a></Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Illustrator file coming</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>
        {post.caption && (
          <div className="mt-3">
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
      </div>
    </article>
  );
}
