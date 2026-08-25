// /admin/imagery-analytics — "is our imagery library actually earning its keep?"
//
// The first version of this screen dumped raw event rows: opaque image ids,
// brand slugs, and two mostly-empty panels. This version answers questions an
// admin can act on: which SOURCE of imagery gets used (authored plates vs
// uploads vs AI backdrops vs division library), which brands are starved of
// art, and which specific images are pulling the weight — each row linking
// back to the library where it can be replaced or retired.

import { AdminLoading, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getImageryAnalytics } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import { ImageIcon, Sparkles, Upload, Layers, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/admin/imagery-analytics")({
  head: () => ({
    meta: [
      { title: "Imagery analytics · Admin · TransPerfect Element" },
      {
        name: "description",
        content:
          "See which generated backdrops and photo plates Element decks actually use, by source, prompt and division.",
      },
      { property: "og:title", content: "Imagery analytics · Admin · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "See which generated backdrops and photo plates Element decks actually use, by source, prompt and division.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImageryView,
});

/* ------------------------------------------------------------------ *
 * Image id → human meaning
 * ------------------------------------------------------------------ */

type SourceId = "authored" | "upload" | "generated" | "division" | "other";

const SOURCE_META: Record<
  SourceId,
  { label: string; blurb: string; icon: typeof ImageIcon; tint: string }
> = {
  authored: {
    label: "Authored plates",
    blurb: "Built-in scene art shipped with the style packs",
    icon: Layers,
    tint: "bg-[#003FC7]/10 text-[#003FC7]",
  },
  upload: {
    label: "Team uploads",
    blurb: "Files people dropped into the imagery library",
    icon: Upload,
    tint: "bg-emerald-500/10 text-emerald-700",
  },
  generated: {
    label: "AI backdrops",
    blurb: "Prompted backdrops from Backdrop Studio",
    icon: Sparkles,
    tint: "bg-violet-500/10 text-violet-700",
  },
  division: {
    label: "Division library",
    blurb: "Curated division imagery pools",
    icon: ImageIcon,
    tint: "bg-amber-500/10 text-amber-700",
  },
  other: {
    label: "Unclassified",
    blurb: "Ids that predate the current naming scheme",
    icon: HelpCircle,
    tint: "bg-black/[0.06] text-black/60",
  },
};

/** Classify an event's image_id without a round-trip — the id encodes origin. */
function classify(imageId: string): SourceId {
  if (imageId.startsWith("builtin:")) return "authored";
  if (imageId.startsWith("upload:")) return "upload";
  if (imageId.startsWith("division-imagery:")) return "division";
  // Bare uuids come from the generated-backdrop table.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(imageId)) return "generated";
  return "other";
}

/** Short, readable label for an image id. */
function prettyImage(imageId: string): string {
  if (imageId.startsWith("upload:")) {
    const file = imageId.split("/").pop() ?? imageId;
    // Strip the epoch prefix uploads carry: 1787446351058-name.webp
    return file.replace(/^\d{10,}-/, "");
  }
  if (imageId.startsWith("builtin:")) {
    const [, brand, kind, idx] = imageId.split(":");
    return `${brandName(brand)} · ${kind}${idx ? ` #${idx}` : ""}`;
  }
  if (imageId.startsWith("division-imagery:")) {
    return `Division pool · ${imageId.slice("division-imagery:".length, 25)}…`;
  }
  return `${imageId.slice(0, 8)}…`;
}

function brandName(id: string | null | undefined): string {
  if (!id || id === "—") return "Unattributed";
  return BRAND_MODES.find((b) => b.id === id)?.name ?? id;
}

/* ------------------------------------------------------------------ */

function ImageryView() {
  const fn = useServerFn(getImageryAnalytics);
  const [days, setDays] = useState(30);
  const [brand, setBrand] = useState("");
  const [source, setSource] = useState<SourceId | "all">("all");

  const q = useQuery({
    queryKey: ["admin", "imagery", days, brand],
    queryFn: () => fn({ data: { days, brandId: brand || undefined } }),
    retry: false,
  });
  const data = q.data;

  const derived = useMemo(() => {
    if (!data) return null;
    const bySource = new Map<SourceId, { images: number; events: number }>();
    for (const img of data.byImage) {
      const s = classify(img.image_id);
      const cur = bySource.get(s) ?? { images: 0, events: 0 };
      cur.images++;
      cur.events += img.total;
      bySource.set(s, cur);
    }
    const sources = (Object.keys(SOURCE_META) as SourceId[])
      .map((id) => ({ id, ...(bySource.get(id) ?? { images: 0, events: 0 }) }))
      .filter((s) => s.images > 0)
      .sort((a, b) => b.events - a.events);

    const eventMix = new Map<string, number>();
    for (const r of data.recent) eventMix.set(r.event_type, (eventMix.get(r.event_type) ?? 0) + 1);

    const distinct = data.byImage.length;
    const adoption = distinct === 0 ? 0 : Math.round((data.totals.uses / distinct) * 100) / 100;
    const memoryPct =
      data.totals.events === 0
        ? 0
        : Math.round((data.totals.memoryHits / data.totals.events) * 100);
    const peakDay = data.perDay.reduce(
      (best, d) => (d.count > (best?.count ?? -1) ? d : best),
      null as null | { date: string; count: number },
    );
    const rows =
      source === "all" ? data.byImage : data.byImage.filter((i) => classify(i.image_id) === source);

    return { sources, eventMix, adoption, memoryPct, peakDay, rows, distinct };
  }, [data, source]);

  // Declared after every hook so the hook order never changes between renders.
  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  const maxDay = Math.max(1, ...(data?.perDay.map((d) => d.count) ?? [1]));
  const brandMax = Math.max(1, ...(data?.byBrand.map((b) => b.total) ?? [1]));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Analytics"
        title="Imagery analytics"
        description="Which art the platform actually reaches for — split by source, division and individual image — so you know what to expand, replace or retire."
        actions={
          <>
            <Link
              to="/admin/imagery"
              className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-medium hover:border-[#003FC7]/40"
            >
              Imagery library →
            </Link>
            <Link
              to="/admin/division-seeds"
              className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-medium hover:border-[#003FC7]/40"
            >
              Division pools →
            </Link>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full border px-3 py-1 text-xs transition ${days === d ? "border-[#05041A] bg-[#05041A] text-white" : "border-black/20 bg-white hover:border-black/40"}`}
          >
            {d}d
          </button>
        ))}
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Filter brand id…"
          className="ml-2 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs"
        />
      </div>

      {q.isLoading && <AdminLoading />}

      {data && derived && (
        <>
          {/* Headline read */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Events"
              value={data.totals.events}
              hint={`across ${derived.distinct} distinct images`}
            />
            <Stat
              label="Placed in work"
              value={data.totals.uses}
              hint={`${derived.adoption} uses per image`}
            />
            <Stat
              label="AI generated"
              value={data.totals.generations}
              hint={
                data.totals.generations === 0
                  ? "no prompts run in this window"
                  : `${data.topPrompts.length} distinct prompts`
              }
            />
            <Stat
              label="Memory-assisted"
              value={`${derived.memoryPct}%`}
              hint="picks guided by campaign look memory"
            />
          </section>

          {/* Where imagery comes from — the actionable split */}
          <AdminSection eyebrow="Supply" title="Where the imagery comes from">
            {derived.sources.length === 0 ? (
              <EmptyHint />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {derived.sources.map((s) => {
                  const meta = SOURCE_META[s.id];
                  const Icon = meta.icon;
                  const active = source === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSource(active ? "all" : s.id)}
                      className={`rounded-2xl border p-4 text-left transition ${active ? "border-[#003FC7] bg-[#003FC7]/[0.04]" : "border-black/10 bg-white/70 hover:border-[#003FC7]/40"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${meta.tint}`}
                        >
                          <Icon size={14} />
                        </span>
                        <span className="min-w-0 truncate text-sm font-medium">{meta.label}</span>
                      </div>
                      <div className="mt-3 text-2xl font-semibold tabular-nums">{s.events}</div>
                      <div className="text-[11px] uppercase tracking-widest text-black/45">
                        events · {s.images} image{s.images === 1 ? "" : "s"}
                      </div>
                      <div className="mt-2 text-xs text-black/55">{meta.blurb}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </AdminSection>

          <section className="grid gap-6 lg:grid-cols-2">
            {/* Activity trend */}
            <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-medium">Activity · last {days} days</div>
                {derived.peakDay && (
                  <div className="text-[11px] uppercase tracking-widest text-black/45">
                    peak {derived.peakDay.count} on{" "}
                    {new Date(derived.peakDay.date).toLocaleDateString()}
                  </div>
                )}
              </div>
              {data.perDay.length === 0 ? (
                <div className="py-8 text-center text-xs text-black/40">
                  No imagery activity in this window.
                </div>
              ) : (
                <div className="mt-4 flex h-28 items-end gap-[3px]">
                  {data.perDay.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date} · ${d.count} events`}
                      className="min-w-[4px] flex-1 rounded-t bg-[#003FC7]/70"
                      style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-black/55">
                {Array.from(derived.eventMix.entries()).map(([type, n]) => (
                  <span key={type} className="rounded-full bg-black/[0.05] px-2 py-0.5">
                    {type} · {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Division coverage */}
            <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
              <div className="text-sm font-medium">Division coverage</div>
              <p className="mt-1 text-xs text-black/50">
                Divisions with low counts are usually short on approved art — a cue to expand that
                pool.
              </p>
              {data.byBrand.length === 0 ? (
                <div className="py-8 text-center text-xs text-black/40">No data</div>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {data.byBrand.map((b) => (
                    <li key={b.brand} className="text-xs">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-medium text-black/80">
                          {brandName(b.brand)}
                        </span>
                        <span className="shrink-0 tabular-nums text-black/50">
                          {b.use} used · {b.generate} generated · {b.total} total
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#003FC7]/70"
                          style={{ width: `${(b.total / brandMax) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Prompts — only when there is something to say */}
          {data.topPrompts.length > 0 && (
            <AdminSection eyebrow="Generation" title="Prompts worth keeping">
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.topPrompts.map((p) => (
                  <li
                    key={p.prompt}
                    className="flex items-baseline justify-between gap-3 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-black/70" title={p.prompt}>
                      {p.prompt}
                    </span>
                    <span className="shrink-0 tabular-nums text-black/50">{p.count}×</span>
                  </li>
                ))}
              </ul>
            </AdminSection>
          )}

          {/* Most-touched images */}
          <AdminSection
            eyebrow="Detail"
            title={
              source === "all"
                ? `Most-touched images · ${derived.rows.length}`
                : `${SOURCE_META[source].label} · ${derived.rows.length}`
            }
            actions={
              source !== "all" ? (
                <button
                  type="button"
                  onClick={() => setSource("all")}
                  className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs hover:border-black/40"
                >
                  Clear filter
                </button>
              ) : undefined
            }
          >
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
              <table className="w-full text-xs">
                <thead className="bg-black/5 text-left uppercase tracking-widest text-black/50">
                  <tr>
                    <th className="p-2">Image</th>
                    <th className="p-2">Source</th>
                    <th className="p-2">Events</th>
                    <th className="p-2">Last touched</th>
                    <th className="p-2">Prompt</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.rows.map((i) => {
                    const s = classify(i.image_id);
                    const meta = SOURCE_META[s];
                    return (
                      <tr key={i.image_id} className="border-t border-black/5 align-top">
                        <td className="max-w-[320px] p-2">
                          <div className="truncate font-medium text-black/80">
                            {prettyImage(i.image_id)}
                          </div>
                          <div
                            className="truncate font-mono text-[10px] text-black/35"
                            title={i.image_id}
                          >
                            {i.image_id}
                          </div>
                        </td>
                        <td className="p-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tint}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-2 tabular-nums">{i.total}</td>
                        <td className="whitespace-nowrap p-2 text-black/60">
                          {new Date(i.last).toLocaleString()}
                        </td>
                        <td
                          className="max-w-[320px] truncate p-2 text-black/60"
                          title={i.prompt ?? ""}
                        >
                          {i.prompt ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {derived.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8">
                        <EmptyHint />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AdminSection>
        </>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="mx-auto max-w-md text-center text-xs text-black/55">
      <div className="text-sm font-medium text-black/70">Nothing logged in this window</div>
      <p className="mt-1">
        Imagery events land here as soon as someone generates a backdrop, uploads a plate, or drops
        art onto a slide or print page. Widen the date range, or start from the{" "}
        <Link to="/admin/imagery" className="underline">
          imagery library
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-widest text-black/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-black/45">{hint}</div>}
    </div>
  );
}
